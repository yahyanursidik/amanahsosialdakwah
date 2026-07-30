import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreate,
  useCustomMutation,
  useNavigation,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useParams } from "react-router";

import {
  FormSection,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  assessmentTemplateMetadataSchema,
  assessmentTemplateVersionMetadataSchema,
  type AssessmentTemplateMetadataValues,
} from "@/features/assessments/schemas";
import type {
  AssessmentQuestionType,
  AssessmentTemplateRecord,
  TemplateQuestionDraft,
  TemplateSectionDraft,
} from "@/features/assessments/types";

function newQuestion(): TemplateQuestionDraft {
  return {
    code: "",
    evidenceRequired: false,
    id: crypto.randomUUID(),
    maxScore: 0,
    prompt: "",
    questionType: "short_text",
    required: true,
    ruleLines: "",
  };
}

function newSection(): TemplateSectionDraft {
  return {
    description: "",
    id: crypto.randomUUID(),
    questions: [newQuestion()],
    title: "",
  };
}

function questionPayload(question: TemplateQuestionDraft) {
  const lines = question.ruleLines
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const isChoice =
    question.questionType === "single_select" ||
    question.questionType === "multi_select";
  const isExact = isChoice || question.questionType === "boolean";
  const options: Array<{ label: string; value: string }> = [];
  const values: Record<string, number> = {};

  if (isExact) {
    for (const line of lines) {
      const [value, label, scoreText] = line.split("|").map((part) => part.trim());
      if (!value || !scoreText || Number.isNaN(Number(scoreText))) {
        throw new Error(
          `Aturan ${question.code || "pertanyaan"} harus memakai format nilai|label|skor.`,
        );
      }
      if (isChoice) {
        options.push({ label: label || value, value });
      }
      values[value] = Number(scoreText);
    }
  }

  const ranges =
    question.questionType === "number"
      ? lines.map((line) => {
          const [minText, maxText, scoreText] = line
            .split("|")
            .map((part) => part.trim());
          if (!scoreText || Number.isNaN(Number(scoreText))) {
            throw new Error(
              `Aturan ${question.code || "angka"} harus memakai format min|max|skor.`,
            );
          }
          return {
            ...(minText ? { min: Number(minText) } : {}),
            ...(maxText ? { max: Number(maxText) } : {}),
            score: Number(scoreText),
          };
        })
      : [];

  return {
    code: question.code,
    evidence_required: question.evidenceRequired,
    max_score: Number(question.maxScore),
    options,
    prompt: question.prompt,
    question_type: question.questionType,
    required: question.required,
    scoring_rules:
      question.maxScore <= 0
        ? { type: "none" as const }
        : question.questionType === "number"
          ? { ranges, type: "range" as const }
          : isExact
            ? { type: "exact" as const, values }
            : { type: "none" as const },
  };
}

export function AssessmentTemplateCreatePage() {
  const { id: templateId } = useParams();
  const isNewVersion = Boolean(templateId);
  const { list, show } = useNavigation();
  const [sections, setSections] = useState<TemplateSectionDraft[]>([
    newSection(),
  ]);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const createMutation = useCreate<AssessmentTemplateRecord>();
  const versionMutation = useCustomMutation<
    { id: string },
    HttpError,
    Record<string, unknown>
  >();
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<AssessmentTemplateMetadataValues>({
    resolver: zodResolver(
      isNewVersion
        ? assessmentTemplateVersionMetadataSchema
        : assessmentTemplateMetadataSchema,
    ),
    defaultValues: {
      code: "",
      description: "",
      name: "",
      passing_score: 0,
    },
  });

  const updateSection = (
    sectionId: string,
    changes: Partial<TemplateSectionDraft>,
  ) => {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId ? { ...section, ...changes } : section,
      ),
    );
  };

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    changes: Partial<TemplateQuestionDraft>,
  ) => {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((question) =>
                question.id === questionId
                  ? { ...question, ...changes }
                  : question,
              ),
            }
          : section,
      ),
    );
  };

  const onSubmit: SubmitHandler<AssessmentTemplateMetadataValues> = (values) => {
    setBuilderError(null);
    try {
      const structure = {
        passing_score: Number(values.passing_score),
        sections: sections.map((section) => {
          if (!section.title.trim() || section.questions.length === 0) {
            throw new Error("Setiap bagian memerlukan judul dan pertanyaan.");
          }
          return {
            description: section.description || undefined,
            questions: section.questions.map(questionPayload),
            title: section.title,
          };
        }),
      };

      if (isNewVersion && templateId) {
        versionMutation.mutate(
          {
            method: "post",
            url: `/api/v1/assessment-templates/${templateId}/versions`,
            values: structure,
          },
          { onSuccess: () => show("assessment_templates", templateId) },
        );
        return;
      }

      createMutation.mutate(
        {
          resource: "assessment_templates",
          values: {
            code: values.code,
            description: values.description || undefined,
            name: values.name,
            ...structure,
          },
        },
        {
          onSuccess: ({ data }) => show("assessment_templates", data.id),
        },
      );
    } catch (error) {
      setBuilderError(
        error instanceof Error ? error.message : "Struktur template tidak valid.",
      );
    }
  };

  const pending =
    createMutation.mutation.isPending || versionMutation.mutation.isPending;

  return (
    <section className="workspace-page" aria-labelledby="template-create-title">
      <PageHeader
        eyebrow="Assessment Engine"
        title={isNewVersion ? "Buat Versi Template" : "Buat Template Asesmen"}
        description="Scoring dihitung server-side. Versi yang sudah published tidak dapat diedit."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              templateId
                ? show("assessment_templates", templateId)
                : list("assessment_templates")
            }
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Kembali
          </Button>
        }
      />

      <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
        {!isNewVersion ? (
          <FormSection title="Identitas Template">
            <div className="form-grid">
              <div className="auth-field">
                <Label htmlFor="code">Kode</Label>
                <input id="code" {...register("code")} />
                {errors.code ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.code.message}
                  </span>
                ) : null}
              </div>
              <div className="auth-field">
                <Label htmlFor="name">Nama template</Label>
                <input id="name" {...register("name")} />
                {errors.name ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.name.message}
                  </span>
                ) : null}
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="description">Deskripsi</Label>
                <textarea id="description" rows={3} {...register("description")} />
              </div>
            </div>
          </FormSection>
        ) : null}

        <FormSection
          title="Struktur dan Scoring"
          description="Pilihan/boolean: nilai|label|skor. Angka: min|max|skor. Satu aturan per baris."
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSections((current) => [...current, newSection()])}
              >
                <Plus aria-hidden="true" size={16} />
                Tambah Bagian
              </Button>
              <Button type="submit" disabled={pending}>
                <Save aria-hidden="true" size={16} />
                {pending ? "Menyimpan..." : "Simpan Draft"}
              </Button>
            </>
          }
        >
          <div className="auth-field">
            <Label htmlFor="passing_score">Ambang kelayakan</Label>
            <input
              id="passing_score"
              type="number"
              min="0"
              step="0.01"
              {...register("passing_score")}
            />
          </div>

          {sections.map((section, sectionIndex) => (
            <div className="detail-section" key={section.id}>
              <div className="flex items-start justify-between gap-3">
                <strong>Bagian {sectionIndex + 1}</strong>
                {sections.length > 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setSections((current) =>
                        current.filter((item) => item.id !== section.id),
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" size={15} />
                    Hapus
                  </Button>
                ) : null}
              </div>
              <div className="form-grid">
                <div className="auth-field">
                  <Label htmlFor={`section-${section.id}-title`}>Judul bagian</Label>
                  <input
                    id={`section-${section.id}-title`}
                    value={section.title}
                    onChange={(event) =>
                      updateSection(section.id, { title: event.target.value })
                    }
                  />
                </div>
                <div className="auth-field">
                  <Label htmlFor={`section-${section.id}-description`}>
                    Deskripsi
                  </Label>
                  <input
                    id={`section-${section.id}-description`}
                    value={section.description}
                    onChange={(event) =>
                      updateSection(section.id, {
                        description: event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {section.questions.map((question, questionIndex) => (
                <fieldset className="form-section" key={question.id}>
                  <legend>Pertanyaan {questionIndex + 1}</legend>
                  <div className="form-grid">
                    <div className="auth-field">
                      <Label htmlFor={`question-${question.id}-code`}>Kode</Label>
                      <input
                        id={`question-${question.id}-code`}
                        value={question.code}
                        onChange={(event) =>
                          updateQuestion(section.id, question.id, {
                            code: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="auth-field">
                      <Label htmlFor={`question-${question.id}-type`}>Tipe</Label>
                      <select
                        id={`question-${question.id}-type`}
                        value={question.questionType}
                        onChange={(event) =>
                          updateQuestion(section.id, question.id, {
                            questionType: event.target
                              .value as AssessmentQuestionType,
                          })
                        }
                      >
                        <option value="short_text">Teks singkat</option>
                        <option value="long_text">Teks panjang</option>
                        <option value="number">Angka</option>
                        <option value="boolean">Ya/Tidak</option>
                        <option value="single_select">Pilihan tunggal</option>
                        <option value="multi_select">Pilihan jamak</option>
                        <option value="date">Tanggal</option>
                      </select>
                    </div>
                    <div className="auth-field auth-field--wide">
                      <Label htmlFor={`question-${question.id}-prompt`}>
                        Pertanyaan
                      </Label>
                      <textarea
                        id={`question-${question.id}-prompt`}
                        rows={2}
                        value={question.prompt}
                        onChange={(event) =>
                          updateQuestion(section.id, question.id, {
                            prompt: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="auth-field">
                      <Label htmlFor={`question-${question.id}-score`}>
                        Skor maksimum
                      </Label>
                      <input
                        id={`question-${question.id}-score`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={question.maxScore}
                        onChange={(event) =>
                          updateQuestion(section.id, question.id, {
                            maxScore: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="auth-field">
                      <Label htmlFor={`question-${question.id}-rules`}>
                        Aturan scoring
                      </Label>
                      <textarea
                        id={`question-${question.id}-rules`}
                        rows={3}
                        placeholder={
                          question.questionType === "number"
                            ? "0|2|5\n3||10"
                            : question.questionType === "boolean"
                              ? "true|Ya|10\nfalse|Tidak|0"
                              : "rendah|Rendah|10\ntinggi|Tinggi|0"
                        }
                        value={question.ruleLines}
                        onChange={(event) =>
                          updateQuestion(section.id, question.id, {
                            ruleLines: event.target.value,
                          })
                        }
                      />
                    </div>
                    <label className="auth-field__checkbox">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(event) =>
                          updateQuestion(section.id, question.id, {
                            required: event.target.checked,
                          })
                        }
                      />
                      Wajib dijawab
                    </label>
                  </div>
                  {section.questions.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateSection(section.id, {
                          questions: section.questions.filter(
                            (item) => item.id !== question.id,
                          ),
                        })
                      }
                    >
                      <Trash2 aria-hidden="true" size={15} />
                      Hapus pertanyaan
                    </Button>
                  ) : null}
                </fieldset>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  updateSection(section.id, {
                    questions: [...section.questions, newQuestion()],
                  })
                }
              >
                <Plus aria-hidden="true" size={16} />
                Tambah Pertanyaan
              </Button>
            </div>
          ))}

          {builderError ? (
            <p className="auth-field__message" data-tone="error">
              {builderError}
            </p>
          ) : null}
        </FormSection>
      </form>
    </section>
  );
}
