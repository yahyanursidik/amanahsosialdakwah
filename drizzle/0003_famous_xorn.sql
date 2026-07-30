CREATE TABLE "assessment_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" jsonb NOT NULL,
	"calculated_score" numeric(10, 2) DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_answers_question_unique" UNIQUE("assessment_id","question_id"),
	CONSTRAINT "assessment_answers_score_check" CHECK (calculated_score >= 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_profile_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessment_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"question_id" uuid,
	"storage_object_key" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" text NOT NULL,
	"classification" text DEFAULT 'restricted' NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"storage_status" text DEFAULT 'pending' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_evidence_object_version_unique" UNIQUE("storage_object_key","version_number"),
	CONSTRAINT "assessment_evidence_classification_check" CHECK (classification = any (array['confidential', 'restricted']::text[])),
	CONSTRAINT "assessment_evidence_storage_status_check" CHECK (storage_status = any (array['pending', 'confirmed', 'quarantined']::text[])),
	CONSTRAINT "assessment_evidence_size_check" CHECK (size_bytes > 0 and version_number > 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_evidence" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"code" text NOT NULL,
	"prompt" text NOT NULL,
	"help_text" text,
	"question_type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"evidence_required" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scoring_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"max_score" numeric(10, 2) DEFAULT 0 NOT NULL,
	"position" integer NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_questions_section_code_unique" UNIQUE("section_id","code"),
	CONSTRAINT "assessment_questions_position_unique" UNIQUE("section_id","position"),
	CONSTRAINT "assessment_questions_type_check" CHECK (question_type = any (array['short_text', 'long_text', 'number', 'boolean', 'single_select', 'multi_select', 'date']::text[])),
	CONSTRAINT "assessment_questions_score_check" CHECK (max_score >= 0),
	CONSTRAINT "assessment_questions_position_check" CHECK (position > 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessment_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"comment" text NOT NULL,
	"reviewer_profile_id" uuid NOT NULL,
	"score_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_reviews_decision_check" CHECK (decision = any (array['approved', 'revision_requested']::text[]))
);
--> statement-breakpoint
ALTER TABLE "assessment_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessment_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_version_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_sections_position_unique" UNIQUE("template_version_id","position"),
	CONSTRAINT "assessment_sections_position_check" CHECK (position > 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_sections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessment_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"passing_score" numeric(10, 2) DEFAULT 0 NOT NULL,
	"max_score" numeric(10, 2) DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" uuid,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_template_versions_number_unique" UNIQUE("template_id","version_number"),
	CONSTRAINT "assessment_template_versions_status_check" CHECK (status = any (array['draft', 'published', 'retired']::text[])),
	CONSTRAINT "assessment_template_versions_score_check" CHECK (passing_score >= 0 and max_score >= 0 and passing_score <= max_score),
	CONSTRAINT "assessment_template_versions_version_check" CHECK (version_number > 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_template_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assessment_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_templates_org_code_unique" UNIQUE("organization_id","code"),
	CONSTRAINT "assessment_templates_status_check" CHECK (status = any (array['draft', 'active', 'retired']::text[]))
);
--> statement-breakpoint
ALTER TABLE "assessment_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "case_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference_number" text NOT NULL,
	"case_id" uuid NOT NULL,
	"template_version_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"assessor_profile_id" uuid NOT NULL,
	"reviewer_profile_id" uuid,
	"total_score" numeric(10, 2) DEFAULT 0 NOT NULL,
	"max_score" numeric(10, 2) DEFAULT 0 NOT NULL,
	"score_percentage" numeric(7, 2) DEFAULT 0 NOT NULL,
	"outcome" text DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_assessments_org_reference_unique" UNIQUE("organization_id","reference_number"),
	CONSTRAINT "case_assessments_case_version_unique" UNIQUE("case_id","template_version_id"),
	CONSTRAINT "case_assessments_status_check" CHECK (status = any (array['draft', 'submitted', 'revision_requested', 'approved']::text[])),
	CONSTRAINT "case_assessments_outcome_check" CHECK (outcome = any (array['pending', 'eligible', 'not_eligible', 'manual_review']::text[])),
	CONSTRAINT "case_assessments_score_check" CHECK (total_score >= 0 and max_score >= 0 and total_score <= max_score and score_percentage between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "case_assessments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."case_assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."case_assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_actor_profile_id_fkey" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_evidence" ADD CONSTRAINT "assessment_evidence_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_evidence" ADD CONSTRAINT "assessment_evidence_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."case_assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_evidence" ADD CONSTRAINT "assessment_evidence_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_evidence" ADD CONSTRAINT "assessment_evidence_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."assessment_sections"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_reviews" ADD CONSTRAINT "assessment_reviews_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_reviews" ADD CONSTRAINT "assessment_reviews_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."case_assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_reviews" ADD CONSTRAINT "assessment_reviews_reviewer_profile_id_fkey" FOREIGN KEY ("reviewer_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "public"."assessment_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_template_versions" ADD CONSTRAINT "assessment_template_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_template_versions" ADD CONSTRAINT "assessment_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_template_versions" ADD CONSTRAINT "assessment_template_versions_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_template_versions" ADD CONSTRAINT "assessment_template_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_template_versions" ADD CONSTRAINT "assessment_template_versions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."beneficiary_cases"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "public"."assessment_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_assessor_profile_id_fkey" FOREIGN KEY ("assessor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_reviewer_profile_id_fkey" FOREIGN KEY ("reviewer_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assessment_answers_assessment" ON "assessment_answers" USING btree ("organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_events_assessment" ON "assessment_events" USING btree ("organization_id","assessment_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_assessment_evidence_assessment" ON "assessment_evidence" USING btree ("organization_id","assessment_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_questions_section" ON "assessment_questions" USING btree ("organization_id","section_id","position");--> statement-breakpoint
CREATE INDEX "idx_assessment_reviews_assessment" ON "assessment_reviews" USING btree ("organization_id","assessment_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_assessment_sections_version" ON "assessment_sections" USING btree ("organization_id","template_version_id","position");--> statement-breakpoint
CREATE INDEX "idx_assessment_template_versions_org_status" ON "assessment_template_versions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_assessment_templates_org_status" ON "assessment_templates" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_case_assessments_org_status" ON "case_assessments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "idx_case_assessments_org_case" ON "case_assessments" USING btree ("organization_id","case_id");--> statement-breakpoint
CREATE POLICY "assessment_answers_select" ON "assessment_answers" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessments.read'));--> statement-breakpoint
CREATE POLICY "assessment_answers_insert" ON "assessment_answers" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
));--> statement-breakpoint
CREATE POLICY "assessment_answers_update" ON "assessment_answers" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
));--> statement-breakpoint
CREATE POLICY "assessment_answers_delete" ON "assessment_answers" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "assessment_events_select" ON "assessment_events" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessments.read'));--> statement-breakpoint
CREATE POLICY "assessment_events_insert" ON "assessment_events" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
));--> statement-breakpoint
CREATE POLICY "assessment_events_update" ON "assessment_events" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "assessment_events_delete" ON "assessment_events" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "assessment_evidence_select" ON "assessment_evidence" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessments.read'));--> statement-breakpoint
CREATE POLICY "assessment_evidence_insert" ON "assessment_evidence" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
));--> statement-breakpoint
CREATE POLICY "assessment_evidence_update" ON "assessment_evidence" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "assessment_evidence_delete" ON "assessment_evidence" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "assessment_questions_select" ON "assessment_questions" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessment_templates.read'));--> statement-breakpoint
CREATE POLICY "assessment_questions_insert" ON "assessment_questions" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
));--> statement-breakpoint
CREATE POLICY "assessment_questions_update" ON "assessment_questions" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
));--> statement-breakpoint
CREATE POLICY "assessment_questions_delete" ON "assessment_questions" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "assessment_reviews_select" ON "assessment_reviews" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessments.read'));--> statement-breakpoint
CREATE POLICY "assessment_reviews_insert" ON "assessment_reviews" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessments.review'));--> statement-breakpoint
CREATE POLICY "assessment_reviews_update" ON "assessment_reviews" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "assessment_reviews_delete" ON "assessment_reviews" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "assessment_sections_select" ON "assessment_sections" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessment_templates.read'));--> statement-breakpoint
CREATE POLICY "assessment_sections_insert" ON "assessment_sections" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
));--> statement-breakpoint
CREATE POLICY "assessment_sections_update" ON "assessment_sections" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
));--> statement-breakpoint
CREATE POLICY "assessment_sections_delete" ON "assessment_sections" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "assessment_template_versions_select" ON "assessment_template_versions" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessment_templates.read'));--> statement-breakpoint
CREATE POLICY "assessment_template_versions_insert" ON "assessment_template_versions" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
));--> statement-breakpoint
CREATE POLICY "assessment_template_versions_update" ON "assessment_template_versions" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
));--> statement-breakpoint
CREATE POLICY "assessment_template_versions_delete" ON "assessment_template_versions" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "assessment_templates_select" ON "assessment_templates" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessment_templates.read'));--> statement-breakpoint
CREATE POLICY "assessment_templates_insert" ON "assessment_templates" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
));--> statement-breakpoint
CREATE POLICY "assessment_templates_update" ON "assessment_templates" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
));--> statement-breakpoint
CREATE POLICY "assessment_templates_delete" ON "assessment_templates" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
CREATE POLICY "case_assessments_select" ON "case_assessments" AS PERMISSIVE FOR SELECT TO "app_runtime" USING (private.has_active_membership(organization_id) and private.has_permission(organization_id, 'assessments.read'));--> statement-breakpoint
CREATE POLICY "case_assessments_insert" ON "case_assessments" AS PERMISSIVE FOR INSERT TO "app_runtime" WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
));--> statement-breakpoint
CREATE POLICY "case_assessments_update" ON "case_assessments" AS PERMISSIVE FOR UPDATE TO "app_runtime" USING (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
)) WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
));--> statement-breakpoint
CREATE POLICY "case_assessments_delete" ON "case_assessments" AS PERMISSIVE FOR DELETE TO "app_runtime" USING (false);--> statement-breakpoint
ALTER POLICY "audit_events_insert" ON "audit_events" TO app_runtime WITH CHECK (private.has_active_membership(organization_id) and (
  private.has_permission(organization_id, 'applications.manage')
  or private.has_permission(organization_id, 'applications.submit')
  or private.has_permission(organization_id, 'applications.screen')
  or private.has_permission(organization_id, 'applications.convert')
  or private.has_permission(organization_id, 'cases.manage')
  or private.has_permission(organization_id, 'cases.assign')
  or private.has_permission(organization_id, 'assessment_templates.manage')
  or private.has_permission(organization_id, 'assessment_templates.publish')
  or private.has_permission(organization_id, 'assessments.manage')
  or private.has_permission(organization_id, 'assessments.submit')
  or private.has_permission(organization_id, 'assessments.review')
));--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE
  "assessment_templates",
  "assessment_template_versions",
  "assessment_sections",
  "assessment_questions",
  "case_assessments",
  "assessment_answers",
  "assessment_evidence",
  "assessment_reviews",
  "assessment_events"
TO "app_runtime";--> statement-breakpoint
CREATE TRIGGER "trg_assessment_templates_touch_updated_at"
BEFORE UPDATE ON "assessment_templates"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_assessment_template_versions_touch_updated_at"
BEFORE UPDATE ON "assessment_template_versions"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_assessment_sections_touch_updated_at"
BEFORE UPDATE ON "assessment_sections"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_assessment_questions_touch_updated_at"
BEFORE UPDATE ON "assessment_questions"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_case_assessments_touch_updated_at"
BEFORE UPDATE ON "case_assessments"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_assessment_answers_touch_updated_at"
BEFORE UPDATE ON "assessment_answers"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_assessment_evidence_touch_updated_at"
BEFORE UPDATE ON "assessment_evidence"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_assessment_reviews_touch_updated_at"
BEFORE UPDATE ON "assessment_reviews"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
CREATE TRIGGER "trg_assessment_events_touch_updated_at"
BEFORE UPDATE ON "assessment_events"
FOR EACH ROW EXECUTE FUNCTION private.touch_updated_at();--> statement-breakpoint
INSERT INTO public.permissions (key, resource, action, description)
VALUES
  ('assessment_templates.read', 'assessment_templates', 'read', 'Melihat template dan versi asesmen'),
  ('assessment_templates.manage', 'assessment_templates', 'manage', 'Membuat template dan versi asesmen'),
  ('assessment_templates.publish', 'assessment_templates', 'publish', 'Mempublikasikan versi template asesmen'),
  ('assessments.read', 'assessments', 'read', 'Melihat asesmen kasus'),
  ('assessments.manage', 'assessments', 'manage', 'Membuat asesmen dan mengisi jawaban'),
  ('assessments.submit', 'assessments', 'submit', 'Mengirim asesmen untuk review'),
  ('assessments.review', 'assessments', 'review', 'Melakukan review independen asesmen')
ON CONFLICT (key) DO UPDATE
SET
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = now();--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'assessment_templates.read',
  'assessment_templates.manage',
  'assessment_templates.publish',
  'assessments.read',
  'assessments.manage',
  'assessments.submit',
  'assessments.review'
)
WHERE role.organization_id IS NULL
  AND role.key IN ('organization_owner', 'organization_admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'assessment_templates.read',
  'assessments.read',
  'assessments.manage',
  'assessments.submit'
)
WHERE role.organization_id IS NULL
  AND role.key = 'field_officer'
ON CONFLICT (role_id, permission_id) DO NOTHING;--> statement-breakpoint
INSERT INTO public.role_permissions (organization_id, role_id, permission_id)
SELECT null, role.id, permission.id
FROM public.roles role
JOIN public.permissions permission ON permission.key IN (
  'assessment_templates.read',
  'assessments.read'
)
WHERE role.organization_id IS NULL
  AND role.key = 'auditor'
ON CONFLICT (role_id, permission_id) DO NOTHING;
