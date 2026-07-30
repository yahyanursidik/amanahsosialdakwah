ALTER TABLE "assessment_answers" DROP CONSTRAINT "assessment_answers_assessment_id_fkey";
--> statement-breakpoint
ALTER TABLE "assessment_answers" DROP CONSTRAINT "assessment_answers_question_id_fkey";
--> statement-breakpoint
ALTER TABLE "assessment_events" DROP CONSTRAINT "assessment_events_assessment_id_fkey";
--> statement-breakpoint
ALTER TABLE "assessment_evidence" DROP CONSTRAINT "assessment_evidence_assessment_id_fkey";
--> statement-breakpoint
ALTER TABLE "assessment_evidence" DROP CONSTRAINT "assessment_evidence_question_id_fkey";
--> statement-breakpoint
ALTER TABLE "assessment_questions" DROP CONSTRAINT "assessment_questions_section_id_fkey";
--> statement-breakpoint
ALTER TABLE "assessment_reviews" DROP CONSTRAINT "assessment_reviews_assessment_id_fkey";
--> statement-breakpoint
ALTER TABLE "assessment_sections" DROP CONSTRAINT "assessment_sections_template_version_id_fkey";
--> statement-breakpoint
ALTER TABLE "assessment_template_versions" DROP CONSTRAINT "assessment_template_versions_template_id_fkey";
--> statement-breakpoint
ALTER TABLE "case_assessments" DROP CONSTRAINT "case_assessments_case_id_fkey";
--> statement-breakpoint
ALTER TABLE "case_assessments" DROP CONSTRAINT "case_assessments_template_version_id_fkey";
--> statement-breakpoint
ALTER TABLE "beneficiary_cases" ADD CONSTRAINT "beneficiary_cases_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "assessment_template_versions" ADD CONSTRAINT "assessment_template_versions_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_id_org_unique" UNIQUE("id","organization_id");--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_assessment_id_fkey" FOREIGN KEY ("assessment_id","organization_id") REFERENCES "public"."case_assessments"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_id_fkey" FOREIGN KEY ("question_id","organization_id") REFERENCES "public"."assessment_questions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_events" ADD CONSTRAINT "assessment_events_assessment_id_fkey" FOREIGN KEY ("assessment_id","organization_id") REFERENCES "public"."case_assessments"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_evidence" ADD CONSTRAINT "assessment_evidence_assessment_id_fkey" FOREIGN KEY ("assessment_id","organization_id") REFERENCES "public"."case_assessments"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_evidence" ADD CONSTRAINT "assessment_evidence_question_id_fkey" FOREIGN KEY ("question_id","organization_id") REFERENCES "public"."assessment_questions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_section_id_fkey" FOREIGN KEY ("section_id","organization_id") REFERENCES "public"."assessment_sections"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_reviews" ADD CONSTRAINT "assessment_reviews_assessment_id_fkey" FOREIGN KEY ("assessment_id","organization_id") REFERENCES "public"."case_assessments"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_sections" ADD CONSTRAINT "assessment_sections_template_version_id_fkey" FOREIGN KEY ("template_version_id","organization_id") REFERENCES "public"."assessment_template_versions"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_template_versions" ADD CONSTRAINT "assessment_template_versions_template_id_fkey" FOREIGN KEY ("template_id","organization_id") REFERENCES "public"."assessment_templates"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_case_id_fkey" FOREIGN KEY ("case_id","organization_id") REFERENCES "public"."beneficiary_cases"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assessments" ADD CONSTRAINT "case_assessments_template_version_id_fkey" FOREIGN KEY ("template_version_id","organization_id") REFERENCES "public"."assessment_template_versions"("id","organization_id") ON DELETE restrict ON UPDATE no action;
