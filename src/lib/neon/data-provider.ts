import type {
  BaseKey,
  CreateParams,
  CreateResponse,
  CustomParams,
  CustomResponse,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  UpdateParams,
  UpdateResponse,
} from "@refinedev/core";

import { readActiveOrganizationPreference } from "@/features/organizations/active-organization-storage";
import { apiFetch } from "@/lib/neon/http";

type DataOperation =
  | "create"
  | "deleteOne"
  | "getList"
  | "getOne"
  | "update";

type DataRequest = {
  filters?: unknown;
  id?: BaseKey;
  operation: DataOperation;
  organizationId?: string | null;
  pagination?: unknown;
  resource: string;
  sorters?: unknown;
  values?: unknown;
};

type RestEnvelope<TData> = {
  data: TData;
  meta?: {
    page?: number;
    pageSize?: number;
    requestId?: string;
    total?: number;
  };
};

const restResourcePaths = new Map([
  ["fund_allocations", "funds/allocations"],
  ["fund_commitments", "funds/commitments"],
  ["fund_disbursements", "funds/disbursements"],
  ["fund_receipts", "funds/receipts"],
  ["fund_reconciliations", "funds/reconciliations"],
  ["fund_restrictions", "funds/restrictions"],
  ["distributions", "distributions"],
  ["procurement", "procurement"],
]);
const restResources = new Set([
  "applications",
  "approval_requests",
  "approval_workflows",
  "assessment_templates",
  "assessments",
  "cases",
  "distributions",
  "procurement",
  ...restResourcePaths.keys(),
]);

function restResourcePath(resource: string): string {
  return restResourcePaths.get(resource) ?? resource;
}

async function callDataApi<T>(body: DataRequest): Promise<T> {
  return apiFetch<T>("/api/data", {
    method: "POST",
    body: JSON.stringify({
      organizationId: readActiveOrganizationPreference(),
      ...body,
    }),
  });
}

function restListQuery(params: GetListParams): string {
  const query = new URLSearchParams();
  const currentPage = params.pagination?.currentPage ?? 1;
  const pageSize = params.pagination?.pageSize ?? 20;
  query.set("page", String(currentPage));
  query.set("pageSize", String(pageSize));

  for (const filter of params.filters ?? []) {
    if (
      "field" in filter &&
      ["q", "status"].includes(filter.field) &&
      filter.value !== undefined &&
      filter.value !== null &&
      filter.value !== ""
    ) {
      query.set(filter.field, String(filter.value));
    }
  }

  return query.toString();
}

async function getRestList<TData>(
  params: GetListParams,
): Promise<GetListResponse<TData>> {
  const response = await apiFetch<RestEnvelope<TData[]>>(
    `/api/v1/${restResourcePath(params.resource)}?${restListQuery(params)}`,
  );

  return {
    data: response.data,
    total: response.meta?.total ?? response.data.length,
  };
}

async function getRestOne<TData>(
  resource: string,
  id: BaseKey,
): Promise<GetOneResponse<TData>> {
  const response = await apiFetch<RestEnvelope<TData>>(
    `/api/v1/${restResourcePath(resource)}/${id}`,
  );
  return { data: response.data };
}

export const neonDataProvider: DataProvider = {
  getApiUrl: () => "/api",
  getList: async <TData = unknown>({
    resource,
    filters,
    pagination,
    sorters,
  }: GetListParams): Promise<GetListResponse<TData>> => {
    if (restResources.has(resource)) {
      return getRestList<TData>({
        resource,
        ...(filters ? { filters } : {}),
        ...(pagination ? { pagination } : {}),
        ...(sorters ? { sorters } : {}),
      });
    }

    return callDataApi<GetListResponse<TData>>({
      operation: "getList",
      resource,
      filters,
      pagination,
      sorters,
    });
  },
  getOne: async <TData = unknown>({
    resource,
    id,
  }: GetOneParams): Promise<GetOneResponse<TData>> => {
    if (restResources.has(resource)) {
      return getRestOne<TData>(resource, id);
    }

    return callDataApi<GetOneResponse<TData>>({
      operation: "getOne",
      resource,
      id,
    });
  },
  create: async <TData = unknown, TVariables = object>({
    resource,
    variables,
  }: CreateParams<TVariables>): Promise<CreateResponse<TData>> => {
    if (restResources.has(resource)) {
      const response = await apiFetch<RestEnvelope<TData>>(
        `/api/v1/${restResourcePath(resource)}`,
        {
          method: "POST",
          body: JSON.stringify(variables),
        },
      );
      return { data: response.data };
    }

    return callDataApi<CreateResponse<TData>>({
      operation: "create",
      resource,
      values: variables,
    });
  },
  update: async <TData = unknown, TVariables = object>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    if (restResources.has(resource)) {
      throw new Error(
        `Resource ${resource} hanya dapat diubah melalui command terkontrol.`,
      );
    }

    return callDataApi<UpdateResponse<TData>>({
      operation: "update",
      resource,
      id,
      values: variables,
    });
  },
  deleteOne: async <TData = unknown, TVariables = object>({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    if (restResources.has(resource)) {
      throw new Error(`Resource ${resource} tidak mendukung hard delete.`);
    }

    return callDataApi<DeleteOneResponse<TData>>({
      operation: "deleteOne",
      resource,
      id,
    });
  },
  custom: async <TData = unknown, TQuery = unknown, TPayload = unknown>({
    url,
    method,
    payload,
    headers,
  }: CustomParams<TQuery, TPayload>): Promise<CustomResponse<TData>> => {
    const response = await apiFetch<RestEnvelope<TData>>(url, {
      method: method.toUpperCase(),
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      ...(headers ? { headers } : {}),
    });

    return { data: response.data };
  },
};
