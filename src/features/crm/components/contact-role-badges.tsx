import { StatusBadge } from "@/components/design-system";
import type { CrmContactRolesDocument } from "@/generated/neon/models";

const roleLabels: Record<CrmContactRolesDocument["role_type"], string> = {
  beneficiary: "Penerima",
  donor: "Donatur",
  kafil: "Kafil",
  volunteer: "Relawan",
};

type ContactRoleBadgesProps = {
  roles: Array<Pick<CrmContactRolesDocument, "role_type" | "status">>;
};

export function ContactRoleBadges({ roles }: ContactRoleBadgesProps) {
  if (roles.length === 0) {
    return <StatusBadge tone="neutral">Belum ada peran</StatusBadge>;
  }

  return (
    <span className="crm-role-badges">
      {roles.map((role) => (
        <StatusBadge
          key={role.role_type}
          tone={role.status === "active" ? "success" : "neutral"}
        >
          {roleLabels[role.role_type]}
        </StatusBadge>
      ))}
    </span>
  );
}
