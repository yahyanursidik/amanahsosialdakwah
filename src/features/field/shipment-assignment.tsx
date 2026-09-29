import { useQuery } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import { useState } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/neon/http";

type Member = { display_name: string; email: string | null; id: string; roles: string[] };

const roleNames: Record<string, string> = {
  auditor: "Auditor",
  field_officer: "Petugas lapangan",
  organization_admin: "Admin",
  organization_owner: "Owner",
};

/** Menugaskan petugas pengirim; tugas muncul di menu Tugas lapangan miliknya. */
export function ShipmentFieldAssignment({
  assignedProfileId,
  onAssigned,
  shipmentId,
  status,
}: {
  assignedProfileId: string | null | undefined;
  onAssigned: () => void;
  shipmentId: string;
  status: string;
}) {
  const [selected, setSelected] = useState(assignedProfileId ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const members = useQuery({
    queryFn: () => apiFetch<{ data: Member[] }>("/api/v1/field/members"),
    queryKey: ["field", "members"],
    retry: false,
  });
  const list = members.data?.data ?? [];
  const current = list.find((member) => member.id === assignedProfileId);
  const closed = ["delivered", "returned", "cancelled"].includes(status);

  return (
    <CanAccess action="manage" resource="logistics_shipments">
      <section className="form-section">
        <div className="section-heading">
          <div>
            <h2>Petugas pengirim</h2>
            <p>
              {current
                ? `Ditugaskan ke ${current.display_name}. Tugas tampil di menu Tugas lapangan miliknya.`
                : "Belum ada petugas. Tugaskan agar pengirim dapat memperbarui posisi dan serah terima langsung dari HP."}
            </p>
          </div>
        </div>
        {!closed ? (
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor={`assign-${shipmentId}`}>Petugas</Label>
              <select id={`assign-${shipmentId}`} value={selected} onChange={(event) => setSelected(event.target.value)}>
                <option value="">Pilih anggota tim</option>
                {list.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name}
                    {member.roles.length > 0
                      ? ` — ${member.roles.map((role) => roleNames[role] ?? role).join(", ")}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="auth-field">
              <Label>&nbsp;</Label>
              <Button
                disabled={pending || !selected || selected === assignedProfileId}
                onClick={() => {
                  setPending(true);
                  setMessage("");
                  apiFetch(`/api/v1/field/shipments/${shipmentId}/assign`, {
                    body: JSON.stringify({ profile_id: selected }),
                    method: "POST",
                  })
                    .then(() => {
                      setMessage("Petugas pengirim ditugaskan.");
                      onAssigned();
                    })
                    .catch((failure: Error) => setMessage(failure.message))
                    .finally(() => setPending(false));
                }}
              >
                <UserCheck aria-hidden size={16} /> Tugaskan
              </Button>
              {message ? <span className="auth-field__message">{message}</span> : null}
            </div>
          </div>
        ) : null}
      </section>
    </CanAccess>
  );
}
