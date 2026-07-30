import { AlertTriangle } from "lucide-react";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import type { ContactDuplicateCandidate } from "@/features/crm/contact-rules";

type DuplicateWarningProps = {
  candidates: ContactDuplicateCandidate[];
  compact?: boolean;
};

export function DuplicateWarning({
  candidates,
  compact = false,
}: DuplicateWarningProps) {
  if (candidates.length === 0) {
    return null;
  }

  return (
    <aside className="duplicate-warning" role="status">
      <div className="duplicate-warning__head">
        <AlertTriangle aria-hidden="true" size={18} />
        <strong>Kemungkinan duplikasi kontak</strong>
      </div>
      <p>
        Sistem hanya memberi peringatan. Kontak tidak akan digabung otomatis;
        merge harus diajukan lewat workflow terkontrol.
      </p>
      {!compact ? (
        <ul>
          {candidates.map((candidate) => (
            <li key={candidate.contact.$id}>
              <span>{candidate.contact.display_name}</span>
              <small>
                {Math.round(candidate.score * 100)}% -{" "}
                {candidate.reasons.join(", ")}
              </small>
            </li>
          ))}
        </ul>
      ) : null}
      <ProtectedActionButton
        action="manage"
        resource="crm_merge_requests"
        variant="outline"
        size="sm"
      >
        Ajukan review merge
      </ProtectedActionButton>
    </aside>
  );
}
