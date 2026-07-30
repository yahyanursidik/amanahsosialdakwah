import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import type { AccessAction } from "@/features/access-control/permission-resolver";

import { CanAccess } from "./can-access";

export type ProtectedActionButtonProps = ButtonProps & {
  action: AccessAction;
  denied?: React.ReactNode;
  resource: string;
};

export function ProtectedActionButton({
  action,
  denied = null,
  resource,
  ...buttonProps
}: ProtectedActionButtonProps) {
  return (
    <CanAccess action={action} denied={denied} resource={resource}>
      <Button {...buttonProps} />
    </CanAccess>
  );
}
