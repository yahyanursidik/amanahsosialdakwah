import type { MiddlewareHandler } from "hono";
import { z } from "zod";

import { getDatabasePool } from "../db/client";
import { DomainError } from "../domain/errors";
import type { AppEnv } from "../types";

const organizationIdSchema = z.string().uuid();

type AuthUser = {
  email: string;
  id: string;
  name?: string;
};

async function readAuthUser(cookie: string): Promise<AuthUser> {
  const authBaseUrl = process.env.NEON_AUTH_BASE_URL;

  if (!authBaseUrl) {
    throw new DomainError(
      "INTERNAL_ERROR",
      "Konfigurasi autentikasi server belum tersedia.",
      500,
    );
  }

  const response = await fetch(`${authBaseUrl}/get-session`, {
    headers: {
      accept: "application/json",
      cookie,
    },
  });

  if (!response.ok) {
    throw new DomainError(
      "UNAUTHENTICATED",
      "Sesi Anda tidak valid atau telah berakhir.",
      401,
    );
  }

  const payload = (await response.json()) as {
    data?: { user?: AuthUser };
    user?: AuthUser;
  };
  const user = payload.user ?? payload.data?.user;

  if (!user?.id || !user.email) {
    throw new DomainError(
      "UNAUTHENTICATED",
      "Sesi Anda tidak valid atau telah berakhir.",
      401,
    );
  }

  return user;
}

export const requestContextMiddleware: MiddlewareHandler<AppEnv> = async (
  context,
  next,
) => {
  const requestId = context.get("requestId");
  const organizationHeader = context.req.header("x-active-organization");
  const parsedOrganizationId =
    organizationIdSchema.safeParse(organizationHeader);

  if (!parsedOrganizationId.success) {
    throw new DomainError(
      "FORBIDDEN",
      "Organisasi aktif tidak valid.",
      403,
    );
  }

  const user = await readAuthUser(context.req.header("cookie") ?? "");
  const client = await getDatabasePool().connect();

  try {
    const profileResult = await client.query<{
      id: string;
      status: string;
    }>(
      `
      insert into public.profiles (auth_user_id, display_name, email, status)
      values ($1, $2, $3, 'active')
      on conflict (auth_user_id) do update
      set
        display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
        email = excluded.email,
        updated_at = now()
      returning id, status
      `,
      [user.id, user.name ?? user.email, user.email],
    );
    const profile = profileResult.rows[0];

    if (!profile || profile.status !== "active") {
      throw new DomainError(
        "FORBIDDEN",
        "Profil pengguna tidak aktif.",
        403,
      );
    }

    const membershipResult = await client.query<{ id: string }>(
      `
      select id
      from public.memberships
      where organization_id = $1
        and profile_id = $2
        and status = 'active'
      limit 1
      `,
      [parsedOrganizationId.data, profile.id],
    );
    const membership = membershipResult.rows[0];

    if (!membership) {
      throw new DomainError(
        "FORBIDDEN",
        "Membership organisasi tidak aktif.",
        403,
      );
    }

    const permissionResult = await client.query<{ key: string }>(
      `
      select distinct permission.key
      from public.membership_roles membership_role
      join public.roles role on role.id = membership_role.role_id
      join public.role_permissions role_permission
        on role_permission.role_id = role.id
      join public.permissions permission
        on permission.id = role_permission.permission_id
      where membership_role.membership_id = $1
        and membership_role.organization_id = $2
        and (role.organization_id is null or role.organization_id = $2)
        and (
          role_permission.organization_id is null
          or role_permission.organization_id = $2
        )
      `,
      [membership.id, parsedOrganizationId.data],
    );

    context.set("requestContext", {
      membershipId: membership.id,
      organizationId: parsedOrganizationId.data,
      permissions: new Set(permissionResult.rows.map((row) => row.key)),
      profileId: profile.id,
      requestId,
      userId: user.id,
    });
  } finally {
    client.release();
  }

  await next();
};
