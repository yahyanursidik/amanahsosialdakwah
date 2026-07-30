import type { BaseRecord } from "@refinedev/core";

export type AssessmentQuestionType =
  | "boolean"
  | "date"
  | "long_text"
  | "multi_select"
  | "number"
  | "short_text"
  | "single_select";

export type AssessmentQuestion = {
  id: string;
  code: string;
  prompt: string;
  help_text: string | null;
  question_type: AssessmentQuestionType;
  required: boolean;
  evidence_required: boolean;
  options: Array<{ label: string; value: string }>;
  scoring_rules: unknown;
  max_score: number;
  position: number;
};

export type AssessmentSection = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  questions: AssessmentQuestion[];
};

export type AssessmentTemplateVersion = {
  id: string;
  version_number: number;
  status: "draft" | "published" | "retired";
  passing_score: number;
  max_score: number;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  sections: AssessmentSection[];
};

export type AssessmentTemplateRecord = BaseRecord & {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  status: "active" | "draft" | "retired";
  published_version_id: string | null;
  published_version_number: number | null;
  versions?: AssessmentTemplateVersion[];
  created_at: string;
  updated_at: string;
};

export type AssessmentAnswer = {
  id: string;
  question_id: string;
  value: unknown;
  calculated_score: number;
  updated_at: string;
};

export type AssessmentEvent = {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor_profile_id: string;
  occurred_at: string;
};

export type AssessmentReview = {
  id: string;
  decision: "approved" | "revision_requested";
  comment: string;
  reviewer_profile_id: string;
  score_snapshot: unknown;
  created_at: string;
};

export type AssessmentRecord = BaseRecord & {
  id: string;
  organization_id: string;
  reference_number: string;
  case_id: string;
  case_reference: string | null;
  beneficiary_name: string | null;
  template_version_id: string;
  template_name: string | null;
  template_version_number: number | null;
  status: "approved" | "draft" | "revision_requested" | "submitted";
  assessor_profile_id: string;
  assessor_name: string | null;
  reviewer_profile_id: string | null;
  reviewer_name: string | null;
  total_score: number;
  max_score: number;
  score_percentage: number;
  outcome: "eligible" | "manual_review" | "not_eligible" | "pending";
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  template?: AssessmentTemplateVersion;
  answers?: AssessmentAnswer[];
  events?: AssessmentEvent[];
  reviews?: AssessmentReview[];
  evidence?: Array<{
    id: string;
    question_id: string | null;
    original_name: string;
    mime_type: string;
    size_bytes: number;
    classification: string;
    version_number: number;
    storage_status: string;
    created_at: string;
  }>;
};

export type TemplateQuestionDraft = {
  id: string;
  code: string;
  prompt: string;
  questionType: AssessmentQuestionType;
  required: boolean;
  evidenceRequired: boolean;
  maxScore: number;
  ruleLines: string;
};

export type TemplateSectionDraft = {
  id: string;
  title: string;
  description: string;
  questions: TemplateQuestionDraft[];
};
