import { useCreate, useList, useNavigation, type CrudFilters } from "@refinedev/core";
import { Eye, PackagePlus, Warehouse } from "lucide-react";
import { useState, type FormEvent } from "react";

import { CanAccess } from "@/components/access-control/can-access";
import { ProtectedActionButton } from "@/components/access-control/protected-action-button";
import {
  EmptyState,
  ErrorState,
  FilterBar,
  FormSection,
  PageHeader,
  QuantityDisplay,
  ResourceTable,
  StatusBadge,
  type ResourceTableColumn,
} from "@/components/design-system";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type {
  InventoryAdjustment,
  InventoryBalance,
  InventoryMovement,
  InventoryProduct,
  InventoryWarehouse,
} from "@/features/inventory/types";

function statusTone(status: string) {
  if (["active", "approved", "posted"].includes(status)) return "success" as const;
  if (["cancelled", "inactive", "rejected"].includes(status)) return "danger" as const;
  if (status === "submitted") return "info" as const;
  return "neutral" as const;
}

export function InventoryListPage() {
  const { create, show } = useNavigation();
  const [search, setSearch] = useState("");
  const [productForm, setProductForm] = useState({
    base_unit: "pcs",
    category: "",
    name: "",
    sku: "",
    track_batch: false,
    track_expiry: false,
  });
  const [warehouseForm, setWarehouseForm] = useState({
    address_notes: "",
    code: "",
    name: "",
    type: "central",
  });
  const { mutate: createProduct, mutation: productMutation } =
    useCreate<InventoryProduct>();
  const { mutate: createWarehouse, mutation: warehouseMutation } =
    useCreate<InventoryWarehouse>();
  const filters: CrudFilters = search.trim()
    ? [{ field: "q", operator: "eq", value: search.trim() }]
    : [];
  const listOptions = {
    filters,
    pagination: { currentPage: 1, pageSize: 10, mode: "server" as const },
  };
  const products = useList<InventoryProduct>({
    resource: "inventory_products",
    ...listOptions,
  });
  const warehouses = useList<InventoryWarehouse>({
    resource: "inventory_warehouses",
    ...listOptions,
  });
  const balances = useList<InventoryBalance>({
    resource: "inventory_balances",
    ...listOptions,
  });
  const movements = useList<InventoryMovement>({
    resource: "inventory_movements",
    ...listOptions,
  });
  const adjustments = useList<InventoryAdjustment>({
    resource: "inventory_adjustments",
    pagination: { currentPage: 1, pageSize: 10, mode: "server" },
  });

  const productColumns: ResourceTableColumn<InventoryProduct>[] = [
    { header: "SKU", key: "sku", render: (item) => <span className="font-mono text-xs font-semibold">{item.sku}</span> },
    { header: "Produk", key: "name", render: (item) => item.name },
    { header: "Satuan", key: "unit", render: (item) => item.base_unit },
    {
      header: "Tracking",
      key: "tracking",
      render: (item) =>
        [item.track_batch ? "Batch" : null, item.track_expiry ? "Expiry" : null]
          .filter(Boolean)
          .join(" / ") || "Standar",
    },
    {
      header: "Status",
      key: "status",
      render: (item) => <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>,
    },
  ];
  const warehouseColumns: ResourceTableColumn<InventoryWarehouse>[] = [
    { header: "Kode", key: "code", render: (item) => <span className="font-mono text-xs font-semibold">{item.code}</span> },
    { header: "Gudang", key: "name", render: (item) => item.name },
    { header: "Tipe", key: "type", render: (item) => item.type },
    {
      header: "Status",
      key: "status",
      render: (item) => <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>,
    },
  ];
  const balanceColumns: ResourceTableColumn<InventoryBalance>[] = [
    {
      header: "Produk",
      key: "product",
      render: (item) => (
        <div className="crm-contact-cell">
          <strong>{item.product_name}</strong>
          <small>{item.sku}</small>
        </div>
      ),
    },
    { header: "Gudang", key: "warehouse", render: (item) => `${item.warehouse_code} / ${item.warehouse_name}` },
    { header: "Batch", key: "batch", render: (item) => item.batch_number ?? "-" },
    {
      align: "right",
      header: "On hand",
      key: "onhand",
      render: (item) => (
        <QuantityDisplay
          maximumFractionDigits={4}
          unit={item.base_unit}
          value={Number(item.quantity_on_hand)}
        />
      ),
    },
    {
      align: "right",
      header: "Reserved",
      key: "reserved",
      render: (item) => (
        <QuantityDisplay
          maximumFractionDigits={4}
          unit={item.base_unit}
          value={Number(item.quantity_reserved)}
        />
      ),
    },
  ];
  const movementColumns: ResourceTableColumn<InventoryMovement>[] = [
    { header: "Produk", key: "product", render: (item) => item.product_name },
    { header: "Gudang", key: "warehouse", render: (item) => item.warehouse_code },
    { header: "Tipe", key: "type", render: (item) => item.movement_type.replaceAll("_", " ") },
    {
      align: "right",
      header: "Jumlah",
      key: "quantity",
      render: (item) => (
        <QuantityDisplay
          maximumFractionDigits={4}
          unit={item.unit}
          value={Number(item.quantity)}
        />
      ),
    },
    { header: "Sumber", key: "source", render: (item) => item.source_type.replaceAll("_", " ") },
  ];
  const adjustmentColumns: ResourceTableColumn<InventoryAdjustment>[] = [
    { header: "Referensi", key: "reference", render: (item) => <span className="font-mono text-xs font-semibold">{item.reference_number}</span> },
    { header: "Produk", key: "product", render: (item) => item.product_name },
    { header: "Gudang", key: "warehouse", render: (item) => item.warehouse_code },
    {
      align: "right",
      header: "Delta",
      key: "delta",
      render: (item) => (
        <QuantityDisplay
          maximumFractionDigits={4}
          unit={item.unit}
          value={Number(item.expected_delta)}
        />
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (item) => (
        <StatusBadge tone={statusTone(item.status)}>
          {item.status.replaceAll("_", " ")}
        </StatusBadge>
      ),
    },
  ];

  const submitProduct = (event: FormEvent) => {
    event.preventDefault();
    createProduct(
      {
        resource: "inventory_products",
        values: {
          ...productForm,
          category: productForm.category || undefined,
        },
      },
      {
        onSuccess: () => {
          setProductForm({
            base_unit: "pcs",
            category: "",
            name: "",
            sku: "",
            track_batch: false,
            track_expiry: false,
          });
          void products.query.refetch();
        },
      },
    );
  };
  const submitWarehouse = (event: FormEvent) => {
    event.preventDefault();
    createWarehouse(
      {
        resource: "inventory_warehouses",
        values: {
          ...warehouseForm,
          address_notes: warehouseForm.address_notes || undefined,
        },
      },
      {
        onSuccess: () => {
          setWarehouseForm({
            address_notes: "",
            code: "",
            name: "",
            type: "central",
          });
          void warehouses.query.refetch();
        },
      },
    );
  };

  if (products.query.isError || warehouses.query.isError || balances.query.isError) {
    return (
      <section className="workspace-page">
        <PageHeader title="Inventory & Gudang" eyebrow="Operasional Barang" />
        <ErrorState
          title="Inventory tidak dapat dimuat"
          description="Periksa organisasi aktif dan permission inventory."
          onRetry={() => {
            void products.query.refetch();
            void warehouses.query.refetch();
            void balances.query.refetch();
          }}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page" aria-labelledby="inventory-title">
      <PageHeader
        eyebrow="Operasional Barang"
        title="Inventory & Gudang"
        description="Kelola master barang, gudang, saldo stok, movement append-only, dan adjustment terkontrol."
        actions={
          <ProtectedActionButton
            action="manage"
            resource="inventory_adjustments"
            onClick={() => create("inventory_adjustments")}
          >
            <PackagePlus aria-hidden="true" size={16} />
            Adjustment
          </ProtectedActionButton>
        }
      />
      <FilterBar
        searchPlaceholder="Cari SKU, produk, atau gudang..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <CanAccess action="manage" resource="inventory_products">
          <form className="crm-form" onSubmit={submitProduct}>
            <FormSection
              title="Produk Inventory"
              description="Produk menjadi master sebelum movement stok dibukukan."
              footer={
                <Button type="submit" disabled={productMutation.isPending}>
                  <PackagePlus aria-hidden="true" size={16} />
                  Simpan Produk
                </Button>
              }
            >
              <div className="form-grid">
                <div className="auth-field">
                  <Label htmlFor="inventory_sku">SKU</Label>
                  <input
                    id="inventory_sku"
                    required
                    value={productForm.sku}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="auth-field">
                  <Label htmlFor="inventory_product_name">Nama produk</Label>
                  <input
                    id="inventory_product_name"
                    required
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="auth-field">
                  <Label htmlFor="inventory_base_unit">Satuan dasar</Label>
                  <input
                    id="inventory_base_unit"
                    required
                    value={productForm.base_unit}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        base_unit: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="auth-field">
                  <Label htmlFor="inventory_category">Kategori</Label>
                  <input
                    id="inventory_category"
                    value={productForm.category}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  />
                </div>
                <label className="auth-field">
                  <span>Tracking batch</span>
                  <input
                    checked={productForm.track_batch}
                    type="checkbox"
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        track_batch: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="auth-field">
                  <span>Tracking expiry</span>
                  <input
                    checked={productForm.track_expiry}
                    type="checkbox"
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        track_expiry: event.target.checked,
                      }))
                    }
                  />
                </label>
              </div>
            </FormSection>
          </form>
        </CanAccess>

        <CanAccess action="manage" resource="inventory_warehouses">
          <form className="crm-form" onSubmit={submitWarehouse}>
            <FormSection
              title="Gudang"
              description="Gudang menjadi titik saldo stok dan movement."
              footer={
                <Button type="submit" disabled={warehouseMutation.isPending}>
                  <Warehouse aria-hidden="true" size={16} />
                  Simpan Gudang
                </Button>
              }
            >
              <div className="form-grid">
                <div className="auth-field">
                  <Label htmlFor="warehouse_code">Kode</Label>
                  <input
                    id="warehouse_code"
                    required
                    value={warehouseForm.code}
                    onChange={(event) =>
                      setWarehouseForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="auth-field">
                  <Label htmlFor="warehouse_name">Nama gudang</Label>
                  <input
                    id="warehouse_name"
                    required
                    value={warehouseForm.name}
                    onChange={(event) =>
                      setWarehouseForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="auth-field">
                  <Label htmlFor="warehouse_type">Tipe</Label>
                  <select
                    id="warehouse_type"
                    value={warehouseForm.type}
                    onChange={(event) =>
                      setWarehouseForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                  >
                    <option value="central">Central</option>
                    <option value="field">Field</option>
                    <option value="partner">Partner</option>
                    <option value="virtual">Virtual</option>
                  </select>
                </div>
                <div className="auth-field">
                  <Label htmlFor="warehouse_notes">Catatan lokasi</Label>
                  <input
                    id="warehouse_notes"
                    value={warehouseForm.address_notes}
                    onChange={(event) =>
                      setWarehouseForm((current) => ({
                        ...current,
                        address_notes: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </FormSection>
          </form>
        </CanAccess>
      </div>

      <ResourceTable
        columns={balanceColumns}
        empty={
          <EmptyState
            title="Belum ada saldo stok"
            description="Saldo muncul setelah goods receipt atau adjustment diposting."
          />
        }
        getRowId={(item) => item.id}
        isLoading={balances.query.isLoading}
        items={balances.result?.data ?? []}
      />
      <ResourceTable
        columns={productColumns}
        empty={
          <EmptyState
            title="Belum ada produk"
            description="Tambahkan master produk sebelum menerima barang."
          />
        }
        getRowId={(item) => item.id}
        isLoading={products.query.isLoading}
        items={products.result?.data ?? []}
      />
      <ResourceTable
        columns={warehouseColumns}
        empty={
          <EmptyState
            title="Belum ada gudang"
            description="Buat gudang pusat, lapangan, mitra, atau virtual."
          />
        }
        getRowId={(item) => item.id}
        isLoading={warehouses.query.isLoading}
        items={warehouses.result?.data ?? []}
      />
      <ResourceTable
        columns={adjustmentColumns}
        empty={
          <EmptyState
            title="Belum ada adjustment"
            description="Adjustment memerlukan workflow submit, approval, dan posting."
          />
        }
        getRowId={(item) => item.id}
        isLoading={adjustments.query.isLoading}
        items={adjustments.result?.data ?? []}
        rowActions={(item) => (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => show("inventory_adjustments", item.id)}
          >
            <Eye aria-hidden="true" size={16} />
            <span className="sr-only">Lihat {item.reference_number}</span>
          </Button>
        )}
      />
      <ResourceTable
        columns={movementColumns}
        empty={
          <EmptyState
            title="Belum ada movement"
            description="Movement bersifat append-only setelah stok diposting."
          />
        }
        getRowId={(item) => item.id}
        isLoading={movements.query.isLoading}
        items={movements.result?.data ?? []}
      />
    </section>
  );
}
