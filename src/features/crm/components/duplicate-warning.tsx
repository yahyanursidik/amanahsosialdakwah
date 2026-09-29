import { AlertTriangle } from "lucide-react";
import { Link } from "react-router";

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
        Sistem hanya memberi peringatan dan tidak menggabungkan kontak secara
        otomatis. Buka kontak di bawah untuk memeriksa; bila memang sama, pakai
        salah satu dan nonaktifkan yang lain.
      </p>
      {!compact ? (
        <ul>
          {candidates.map((candidate) => (
            <li key={candidate.contact.$id}>
              <Link to={`/crm/contacts/${candidate.contact.$id}`}>{candidate.contact.display_name}</Link>
              <small>
                {Math.round(candidate.score * 100)}% -{" "}
                {candidate.reasons.join(", ")}
              </small>
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
