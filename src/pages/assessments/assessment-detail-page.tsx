import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Save, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useParams } from "react-router";

import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  ApprovalTimeline,
  DetailSection,
  ErrorState,
  FormSection,
  LoadingSkeleton,
  PageHeader,
  type ApprovalTimelineItem,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AssessmentStatusBadge } from "@/features/assessments/components/assessment-status-badge";
import {
  assessmentReviewFormSchema,
  type AssessmentReviewFormValues,
} from "@/features/assessments/schemas";
import type {
  AssessmentQuestion,
  AssessmentRecord,
} from "@/features/assessments/types";

function timelineItems(record: AssessmentRecord): ApprovalTimelineItem[] {
  return (record.events ?? []).map((event) => ({
    actor: event.actor_profile_id,
    description: event.note ?? event.event_type.replaceAll("_", " "),
    status:
      event.to_status === "approved"
        ? "approved"
        : event.to_status === "revision_requested"
          ? "rejected"
          : "pending",
    time: new Date(event.occurred_at).toLocaleString("id-ID"),
    title: event.event_type.replaceAll("_", " "),
  }));
}

function QuestionInput({
  onChange,
  question,
  value,
}: {
  onChange: (value: unknown) => void;
  question: AssessmentQuestion;
  value: unknown;
}) {
  const id = `answer-${question.id}`;

  if (question.question_type === "long_text") {
    return (
      <textarea
        id={id}
        rows={4}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (question.question_type === "number") {
    return (
      <input
        id={id}
        type="number"
        value={typeof value === "number" ? value : ""}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? undefined : Number(event.target.value),
          )
        }
      />
    );
  }
  if (question.question_type === "boolean") {
    return (
      <select
        id={id}
        value={typeof value === "boolean" ? String(value) : ""}
        onChange={(event) =>
          onChange(
            event.target.value === ""
              ? undefined
              : event.target.value === "true",
          )
        }
      >
        <option value="">Pilih jawaban</option>
        <option value="true">Ya</option>
        <option value="false">Tidak</option>
      </select>
    );
  }
  if (question.question_type === "single_select") {
    return (
      <select
        id={id}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">Pilih jawaban</option>
        {question.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (question.question_type === "multi_select") {
    const selected = Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
    return (
      <div className="flex flex-wrap gap-3" id={id}>
        {question.options.map((option) => (
          <label className="auth-field__checkbox" key={option.value}>
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value),
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      id={id}
      type={question.question_type === "date" ? "date" : "text"}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value || undefined)}
    />
  );
}

export function AssessmentDetailPage() {
  const { id = "" } = useParams();
  const { list } = useNavigation();
  const assessmentQuery = useOne<AssessmentRecord>({
    resource: "assessments",
    id,
    queryOptions: { enabled: Boolean(id) },
  });
  const record = assessmentQuery.result;
  const [answerEdits, setAnswerEdits] = useState<Record<string, unknown>>({});
  const saveMutation = useCustomMutation<
    AssessmentRecord,
    HttpError,
    { answers: Array<{ question_id: string; value: unknown }> }
  >();
  const submitMutation = useCustomMutation<
    AssessmentRecord,
    HttpError,
    { note?: string }
  >();
  const reviewMutation = useCustomMutation<
    AssessmentRecord,
    HttpError,
    AssessmentReviewFormValues
  >();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<AssessmentReviewFormValues>({
    resolver: zodResolver(assessmentReviewFormSchema),
    defaultValues: { comment: "", decision: "approved" },
  });

  if (assessmentQuery.query.isLoading) {
    return (
      <section className="workspace-page">
        <LoadingSkeleton lines={10} />
      </section>
    );
  }

  if (assessmentQuery.query.isError || !record) {
    return (
      <section className="workspace-page">
        <PageHeader title="Detail Asesmen" eyebrow="Assessment Engine" />
        <ErrorState
          title="Asesmen tidak ditemukan"
          description="Data tidak tersedia atau berada di organisasi lain."
          onRetry={() => assessmentQuery.query.refetch()}
        />
      </section>
    );
  }

  const editable =
    record.status === "draft" || record.status === "revision_requested";
  const answerValues = {
    ...Object.fromEntries(
      (record.answers ?? []).map((answer) => [
        answer.question_id,
        answer.value,
      ]),
    ),
    ...answerEdits,
  };
  const refresh = () => assessmentQuery.query.refetch();
  const saveAnswers = () => {
    const answers = Object.entries(answerValues)
      .filter(([, value]) => {
        if (value === undefined || value === "") return false;
        return !Array.isArray(value) || value.length > 0;
      })
      .map(([questionId, value]) => ({
        question_id: questionId,
        value,
      }));
    if (answers.length === 0) return;
    saveMutation.mutate(
      {
        method: "post",
        url: `/api/v1/assessments/${record.id}/answers`,
        values: { answers },
      },
      { onSuccess: () => void refresh() },
    );
  };
  const onReview: SubmitHandler<AssessmentReviewFormValues> = (values) => {
    reviewMutation.mutate(
      {
        method: "post",
        url: `/api/v1/assessments/${record.id}/review`,
        values,
      },
      {
        onSuccess: () => {
          reset();
          void refresh();
        },
      },
    );
  };

  return (
    <section className="workspace-page" aria-labelledby="assessment-detail-title">
      <PageHeader
        eyebrow={`Asesmen / ${record.reference_number}`}
        title={record.beneficiary_name ?? "Penerima manfaat"}
        description={`${record.template_name ?? "Template"} v${record.template_version_number ?? "?"}`}
        meta={<AssessmentStatusBadge status={record.status} />}
        actions={
          <>
            <Button variant="outline" onClick={() => list("assessments")}>
              <ArrowLeft aria-hidden="true" size={16} />
              Daftar
            </Button>
            {editable ? (
              <>
                <ProtectedActionButton
                  action="manage"
                  resource="assessments"
                  disabled={saveMutation.mutation.isPending}
                  onClick={saveAnswers}
                >
                  <Save aria-hidden="true" size={16} />
                  Simpan Jawaban
                </ProtectedActionButton>
                <ProtectedActionButton
                  action="submit"
                  resource="assessments"
                  disabled={submitMutation.mutation.isPending}
                  onClick={() =>
                    submitMutation.mutate(
                      {
                        method: "post",
                        url: `/api/v1/assessments/${record.id}/submit`,
                        values: {},
                      },
                      { onSuccess: () => void refresh() },
                    )
                  }
                >
                  <Send aria-hidden="true" size={16} />
                  Kirim Review
                </ProtectedActionButton>
              </>
            ) : null}
          </>
        }
      />

      <div className="workspace-page__grid">
        <DetailSection
          title="Ringkasan"
          items={[
            { label: "Kasus", value: (
              <Link to={`/cases/${record.case_id}`}>
                {record.case_reference ?? "Buka kasus"}
              </Link>
            ) },
            { label: "Asesor", value: record.assessor_name ?? "—" },
            { label: "Skor", value: `${record.total_score}/${record.max_score}` },
            { label: "Persentase", value: `${record.score_percentage}%` },
            {
              label: "Hasil",
              value: <AssessmentStatusBadge status={record.outcome} />,
            },
          ]}
        />
        <DetailSection title="Timeline">
          <ApprovalTimeline items={timelineItems(record)} />
        </DetailSection>
      </div>

      {record.template?.sections.map((section) => (
        <FormSection
          key={section.id}
          title={section.title}
          description={section.description ?? undefined}
        >
          <div className="form-grid">
            {section.questions.map((question) => (
              <div className="auth-field auth-field--wide" key={question.id}>
                <Label htmlFor={`answer-${question.id}`}>
                  {question.prompt}
                  {question.required ? " *" : ""}
                </Label>
                <QuestionInput
                  question={question}
                  value={answerValues[question.id]}
                  onChange={(value) =>
                    setAnswerEdits((current) => ({
                      ...current,
                      [question.id]: value,
                    }))
                  }
                />
                <span className="auth-field__message">
                  {question.help_text ??
                    `Skor maksimum ${question.max_score}`}
                </span>
              </div>
            ))}
          </div>
        </FormSection>
      ))}

      <DetailSection title="Bukti Asesmen">
        {(record.evidence ?? []).length === 0 ? (
          <p>
            Belum ada bukti. Upload privat dan signed URL akan diaktifkan pada
            Evidence Service; metadata tabel sudah disiapkan tanpa membuka akses
            file dari browser.
          </p>
        ) : (
          <ul>
            {(record.evidence ?? []).map((item) => (
              <li key={item.id}>
                {item.original_name} — {item.storage_status}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      {record.status === "submitted" ? (
        <form onSubmit={handleSubmit(onReview)}>
          <FormSection
            title="Review Independen"
            description="Reviewer tidak boleh menjadi asesor pada asesmen yang sama."
            footer={
              <ProtectedActionButton
                action="review"
                resource="assessments"
                type="submit"
                disabled={reviewMutation.mutation.isPending}
              >
                <ShieldCheck aria-hidden="true" size={16} />
                Simpan Keputusan
              </ProtectedActionButton>
            }
          >
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="decision">Keputusan</Label>
                <select id="decision" {...register("decision")}>
                  <option value="approved">Setujui hasil asesmen</option>
                  <option value="revision_requested">Minta revisi</option>
                </select>
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="comment">Catatan reviewer</Label>
                <textarea id="comment" rows={4} {...register("comment")} />
                {errors.comment ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.comment.message}
                  </span>
                ) : null}
              </div>
            </div>
          </FormSection>
        </form>
      ) : null}
    </section>
  );
}
