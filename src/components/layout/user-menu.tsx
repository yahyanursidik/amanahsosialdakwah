import { useLogout } from "@refinedev/core";
import { ChevronDown, LoaderCircle, LogOut, UserRound } from "lucide-react";
import { Link } from "react-router";

import { useOrganization } from "@/features/organizations/organization-context";

export function UserMenu() {
  const { user } = useOrganization();
  const { mutate: logout, isPending } = useLogout();

  return (
    <details className="user-menu">
      <summary>
        <span className="user-menu__avatar" aria-hidden>
          <UserRound className="size-4" />
        </span>
        <span className="user-menu__identity">
          <strong>{user?.name || "Pengguna"}</strong>
          <small>{user?.email}</small>
        </span>
        <ChevronDown className="size-4" aria-hidden />
      </summary>
      <div className="user-menu__popover">
        <Link to="/account/password">Ubah kata sandi</Link>
        <button type="button" onClick={() => logout({})} disabled={isPending}>
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <LogOut className="size-4" aria-hidden />
          )}
          Keluar
        </button>
      </div>
    </details>
  );
}
