import { useCreate, useList } from "@refinedev/core";
import { Plus } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";

import {
  EmptyState,
  FormSection,
  PageHeader,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/features/organizations/organization-context";
import type { CrmTagsDocument } from "@/generated/neon/models";

type TagFormValues = {
  color?: string;
  description?: string;
  key: string;
  label: string;
};

const columns: ResourceTableColumn<CrmTagsDocument>[] = [
  {
    header: "Tag",
    key: "label",
    render: (item) => (
      <div className="crm-contact-cell">
        <strong>{item.label}</strong>
        <small>{item.key}</small>
      </div>
    ),
  },
  {
    header: "Deskripsi",
    key: "description",
    render: (item) => item.description || "-",
  },
  {
    header: "Status",
    key: "status",
    render: (item) => (
      <StatusBadge tone={item.status === "active" ? "success" : "neutral"}>
        {item.status}
      </StatusBadge>
    ),
  },
];

export function TagListPage() {
  const { activeOrganization, user } = useOrganization();
  const activeOrgId = activeOrganization?.organization.$id;
  const tagsQuery = useList<CrmTagsDocument>({
    resource: "crm_tags",
    filters: activeOrgId
      ? [{ field: "organization_id", operator: "eq", value: activeOrgId }]
      : [],
    queryOptions: { enabled: !!activeOrgId },
  });
  const { mutate: createTag, mutation } = useCreate<CrmTagsDocument>();
  const { handleSubmit, register, reset } = useForm<TagFormValues>();

  const onSubmit: SubmitHandler<TagFormValues> = (values) => {
    if (!activeOrgId) {
      return;
    }

    createTag(
      {
        resource: "crm_tags",
        values: {
          ...values,
          created_by: user?.$id,
          key: values.key.trim().toLowerCase().replace(/\s+/g, "-"),
          organization_id: activeOrgId,
          status: "active",
        },
      },
      { onSuccess: () => reset() },
    );
  };

  return (
    <section className="workspace-page">
      <PageHeader
        eyebrow="CRM"
        title="Tags"
        description="Segmentasi kontak untuk kebutuhan komunikasi, asesmen, dan penyaluran."
      />
      <form className="crm-form" onSubmit={handleSubmit(onSubmit)}>
        <FormSection title="Tambah tag">
          <div className="form-grid">
            <div className="auth-field">
              <Label htmlFor="label">Label</Label>
              <Input id="label" {...register("label", { required: true })} />
            </div>
            <div className="auth-field">
              <Label htmlFor="key">Key</Label>
              <Input id="key" {...register("key", { required: true })} />
            </div>
            <div className="auth-field auth-field--wide">
              <Label htmlFor="description">Deskripsi</Label>
              <Input id="description" {...register("description")} />
            </div>
          </div>
          <Button type="submit" disabled={mutation?.isPending}>
            <Plus aria-hidden="true" size={16} />
            Tambah tag
          </Button>
        </FormSection>
      </form>
      <ResourceTable
        columns={columns}
        getRowId={(item) => item.$id}
        isLoading={tagsQuery.query.isLoading}
        items={tagsQuery.result?.data ?? []}
        empty={<EmptyState title="Belum ada tag CRM" />}
      />
    </section>
  );
}
