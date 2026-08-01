export type EvidenceStatus =
  "available" | "deleted" | "pending_upload" | "quarantined" | "superseded";
export type EvidenceFile = {
  id: string;
  logical_file_id: string;
  version: number;
  previous_version_id?: string | null;
  entity_type: string;
  entity_id: string;
  classification: "confidential" | "internal" | "restricted";
  purpose: string;
  original_file_name: string;
  mime_type: string;
  size_bytes: string;
  status: EvidenceStatus;
  confirmed_at: string | null;
  created_at: string;
  publication_status?: "published" | "revoked" | null;
  consent_reference?: string | null;
  redaction_notes?: string | null;
};

export type EvidenceUploadIntent = {
  evidence: EvidenceFile;
  upload: { expires_in: number; headers: Record<string, string>; url: string };
};
