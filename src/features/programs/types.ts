import type {
  ProgramCategoriesDocument,
  ProgramRevisionsDocument,
  ProgramsDocument,
} from "@/generated/neon/models";

export type ProgramStatus = ProgramsDocument["status"];
export type TargetBeneficiaryType = ProgramsDocument["target_beneficiary_type"];
export type FundType = ProgramsDocument["fund_type"];
export type RevisionActionType = ProgramRevisionsDocument["action_type"];

export interface ProgramItem extends ProgramsDocument {
  category_name?: string;
}

export type ProgramCategoryItem = ProgramCategoriesDocument;
export type ProgramRevisionItem = ProgramRevisionsDocument;

export interface CreateProgramPayload {
  organization_id: string;
  code: string;
  name: string;
  category_id: string;
  description?: string | undefined;
  objective?: string | undefined;
  target_beneficiary_type: TargetBeneficiaryType;
  target_beneficiary_count?: number | undefined;
  budget_amount: number;
  fund_type: FundType;
  starts_at?: string | undefined;
  ends_at?: string | undefined;
  owner_id?: string | undefined;
}

export interface UpdateDraftProgramPayload {
  code?: string | undefined;
  name?: string | undefined;
  category_id?: string | undefined;
  description?: string | undefined;
  objective?: string | undefined;
  target_beneficiary_type?: TargetBeneficiaryType | undefined;
  target_beneficiary_count?: number | undefined;
  budget_amount?: number | undefined;
  fund_type?: FundType | undefined;
  starts_at?: string | undefined;
  ends_at?: string | undefined;
  owner_id?: string | undefined;
}

export interface ControlledEditProgramPayload {
  reason: string;
  description?: string | undefined;
  objective?: string | undefined;
  target_beneficiary_count?: number | undefined;
  ends_at?: string | undefined;
}
