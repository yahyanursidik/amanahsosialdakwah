import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useCreate,
  useCustomMutation,
  useNavigation,
  useOne,
  type HttpError,
} from "@refinedev/core";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useParams } from "react-router";

import {
  FormSection,
  LoadingSkeleton,
  PageHeader,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  approvalWorkflowFormSchema,
  type ApprovalWorkflowFormValues,
} from "@/features/approvals/schemas";
import type { ApprovalWorkflowRecord } from "@/features/approvals/types";

type StepDraft = {
  id: string;
  minimum_approvals: number;
  name: string;
  required_permission: string;
};

function newStep(): StepDraft {
  return {
    id: crypto.randomUUID(),
    minimum_approvals: 1,
    name: "",
    required_permission: "approval_requests.act",
  };
}

export function ApprovalWorkflowFormPage() {
  const { id } = useParams();
  const versionMode = Boolean(id);
  const { list, show } = useNavigation();
  const [steps, setSteps] = useState<StepDraft[]>([newStep()]);
  const { mutate: create, mutation: createMutation } =
    useCreate<ApprovalWorkflowRecord>();
  const versionMutation = useCustomMutation<
    ApprovalWorkflowRecord,
    HttpError,
    { steps: Omit<StepDraft, "id">[] }
  >();
  const workflowQuery = useOne<ApprovalWorkflowRecord>({
    resource: "approval_workflows",
    id: id ?? "",
    queryOptions: { enabled: versionMode },
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ApprovalWorkflowFormValues>({
    resolver: zodResolver(approvalWorkflowFormSchema),
    defaultValues: {
      code: "",
      description: "",
      name: "",
      resource_type: "assessment",
    },
  });

  if (versionMode && workflowQuery.query.isLoading) {
    return <LoadingSkeleton lines={8} />;
  }

  const validSteps = steps.every(
    (step) =>
      step.name.trim().length >= 2 &&
      /^[a-z0-9_]+\.[a-z0-9_]+$/.test(step.required_permission) &&
      step.minimum_approvals > 0,
  );
  const stepPayload = steps.map((step) => ({
    minimum_approvals: step.minimum_approvals,
    name: step.name,
    required_permission: step.required_permission,
  }));
  const saveVersion = () => {
    if (!id || !validSteps) return;
    versionMutation.mutate(
      {
        method: "post",
        url: `/api/v1/approval-workflows/${id}/versions`,
        values: { steps: stepPayload },
      },
      { onSuccess: () => show("approval_workflows", id) },
    );
  };
  const onSubmit: SubmitHandler<ApprovalWorkflowFormValues> = (values) => {
    if (!validSteps) return;
    create(
      {
        resource: "approval_workflows",
        values: { ...values, steps: stepPayload },
      },
      { onSuccess: ({ data }) => show("approval_workflows", data.id) },
    );
  };
  const workflow = workflowQuery.result;

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="Approval Engine"
        title={
          versionMode
            ? `Versi Baru · ${workflow?.name ?? "Workflow"}`
            : "Buat Workflow Approval"
        }
        description="Setiap langkah menentukan permission, bukan nama role. Versi published tidak dapat diedit."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              id ? show("approval_workflows", id) : list("approval_workflows")
            }
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Kembali
          </Button>
        }
      />
      <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
        {!versionMode ? (
          <FormSection title="Identitas Workflow">
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
                <Label htmlFor="name">Nama workflow</Label>
                <input id="name" {...register("name")} />
                {errors.name ? (
                  <span className="auth-field__message" data-tone="error">
                    {errors.name.message}
                  </span>
                ) : null}
              </div>
              <div className="auth-field">
                <Label htmlFor="resource_type">Tipe sumber daya</Label>
                <select id="resource_type" {...register("resource_type")}>
                  <option value="assessment">Asesmen</option>
                  <option value="case">Kasus</option>
                  <option value="fund_allocation">Alokasi dana</option>
                </select>
              </div>
              <div className="auth-field auth-field--wide">
                <Label htmlFor="description">Deskripsi</Label>
                <textarea
                  id="description"
                  rows={3}
                  {...register("description")}
                />
              </div>
            </div>
          </FormSection>
        ) : null}
        <FormSection
          title="Langkah Persetujuan"
          description="Urutan berjalan dari atas ke bawah. Maker tidak dapat menjadi approver."
          footer={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSteps((current) => [...current, newStep()])}
              >
                <Plus aria-hidden="true" size={16} />
                Tambah Langkah
              </Button>
              <Button
                type={versionMode ? "button" : "submit"}
                disabled={
                  !validSteps ||
                  createMutation.isPending ||
                  versionMutation.mutation.isPending
                }
                onClick={versionMode ? saveVersion : undefined}
              >
                <Save aria-hidden="true" size={16} />
                Simpan {versionMode ? "Versi" : "Workflow"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div className="form-grid rounded-xl border p-4" key={step.id}>
                <div className="auth-field">
                  <Label htmlFor={`step-name-${step.id}`}>
                    Langkah {index + 1}
                  </Label>
                  <input
                    id={`step-name-${step.id}`}
                    value={step.name}
                    onChange={(event) =>
                      setSteps((current) =>
                        current.map((item) =>
                          item.id === step.id
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Contoh: Verifikasi koordinator"
                  />
                </div>
                <div className="auth-field">
                  <Label htmlFor={`step-permission-${step.id}`}>
                    Permission approver
                  </Label>
                  <input
                    id={`step-permission-${step.id}`}
                    value={step.required_permission}
                    onChange={(event) =>
                      setSteps((current) =>
                        current.map((item) =>
                          item.id === step.id
                            ? {
                                ...item,
                                required_permission: event.target.value,
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="auth-field">
                  <Label htmlFor={`step-quorum-${step.id}`}>
                    Minimum persetujuan
                  </Label>
                  <input
                    id={`step-quorum-${step.id}`}
                    type="number"
                    min={1}
                    max={20}
                    value={step.minimum_approvals}
                    onChange={(event) =>
                      setSteps((current) =>
                        current.map((item) =>
                          item.id === step.id
                            ? {
                                ...item,
                                minimum_approvals: Number(event.target.value),
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
                <div className="auth-field justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={steps.length === 1}
                    onClick={() =>
                      setSteps((current) =>
                        current.filter((item) => item.id !== step.id),
                      )
                    }
                  >
                    <Trash2 aria-hidden="true" size={16} />
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </FormSection>
      </form>
    </section>
  );
}
