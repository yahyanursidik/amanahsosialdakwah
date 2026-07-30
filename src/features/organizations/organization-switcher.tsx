import { Building2, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

import { useOrganization } from "./organization-context";

type OrganizationSwitcherProps = {
  variant?: "compact" | "sidebar";
};

export function OrganizationSwitcher({
  variant = "compact",
}: OrganizationSwitcherProps) {
  const { activeOrganization, organizations, status, switchOrganization } =
    useOrganization();
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const [error, setError] = useState<string | null>(null);
  const activeId = activeOrganization?.organization.$id ?? "";

  const handleChange = async (organizationId: string) => {
    setError(null);

    try {
      await switchOrganization(organizationId);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Organisasi tidak dapat dipilih.",
      );
    }
  };

  return (
    <div
      className={cn(
        "organization-switcher",
        `organization-switcher--${variant}`,
      )}
    >
      <Building2 className="size-4" aria-hidden />
      <label className="sr-only" htmlFor={fieldId}>
        Organisasi aktif
      </label>
      {variant === "sidebar" ? (
        <span className="organization-switcher__label">Organisasi aktif</span>
      ) : null}
      <select
        id={fieldId}
        value={activeId}
        disabled={status === "loading" || organizations.length < 2}
        onChange={(event) => void handleChange(event.target.value)}
        aria-describedby={error ? errorId : undefined}
      >
        {organizations.map(({ organization }) => (
          <option key={organization.$id} value={organization.$id}>
            {organization.name}
          </option>
        ))}
      </select>
      {status === "loading" ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : null}
      {error ? (
        <span
          id={errorId}
          className="organization-switcher__error"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
