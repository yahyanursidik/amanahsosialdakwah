import { MapPinned, Plus, Store, Trash2, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type DeliveryAreaDraft = {
  addressLine: string;
  city: string;
  clientId: string;
  district: string;
  name: string;
  postalCode: string;
  province: string;
  quotaCapacity: string;
  village: string;
};

export type PartnerAssignmentDraft = {
  assignmentRole: "lead" | "coordinator" | "distributor" | "monitor";
  clientId: string;
  deliveryAreaClientId: string;
  partnerContactId: string;
  partnerOrganizationId: string;
  picName: string;
  picPhone: string;
  readinessStatus: "pending" | "ready" | "accepted" | "declined";
};

export type ProgramPlanningOptions = {
  locations: Array<{ city: string; province: string }>;
  partners: Array<{
    city: string | null;
    display_name: string;
    id: string;
    kind: "contact" | "organization";
    primary_phone: string | null;
    province: string | null;
  }>;
  products: Array<{
    base_unit: string;
    category_name: string;
    id: string;
    name: string;
    sku: string;
  }>;
};

export function createDeliveryAreaDraft(): DeliveryAreaDraft {
  return {
    addressLine: "",
    city: "",
    clientId: crypto.randomUUID(),
    district: "",
    name: "",
    postalCode: "",
    province: "",
    quotaCapacity: "0",
    village: "",
  };
}

export function createPartnerAssignmentDraft(): PartnerAssignmentDraft {
  return {
    assignmentRole: "distributor",
    clientId: crypto.randomUUID(),
    deliveryAreaClientId: "",
    partnerContactId: "",
    partnerOrganizationId: "",
    picName: "",
    picPhone: "",
    readinessStatus: "pending",
  };
}

type ProgramDeliveryPlanFieldsProps = {
  areas: DeliveryAreaDraft[];
  onAreasChange: (areas: DeliveryAreaDraft[]) => void;
  onPartnersChange: (partners: PartnerAssignmentDraft[]) => void;
  options: ProgramPlanningOptions | undefined;
  optionsLoading: boolean;
  partners: PartnerAssignmentDraft[];
};

const roleLabels = {
  coordinator: "Koordinator",
  distributor: "Penyalur",
  lead: "Mitra utama",
  monitor: "Pemantau",
} as const;

const readinessLabels = {
  accepted: "Diterima",
  declined: "Belum bersedia",
  pending: "Menunggu konfirmasi",
  ready: "Siap menyalurkan",
} as const;

function locationLabel(city: string | null, province: string | null) {
  return [city, province].filter(Boolean).join(", ");
}

function normalizedLocationName(value: string) {
  return value
    .toLocaleLowerCase("id")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(kabupaten|kota|kab\.?|city)\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

export function ProgramDeliveryPlanFields({
  areas,
  onAreasChange,
  onPartnersChange,
  options,
  optionsLoading,
  partners,
}: ProgramDeliveryPlanFieldsProps) {
  const updateArea = (
    clientId: string,
    field: keyof DeliveryAreaDraft,
    value: string,
  ) => {
    onAreasChange(
      areas.map((area) => {
        if (area.clientId !== clientId) return area;
        if (field !== "city") return { ...area, [field]: value };

        const normalizedCity = normalizedLocationName(value);
        const suggestion = options?.locations.find((location) => {
          const suggestedCity = normalizedLocationName(location.city);
          return (
            location.city.localeCompare(value, "id", {
              sensitivity: "accent",
            }) === 0 || suggestedCity === normalizedCity
          );
        });
        return {
          ...area,
          city: value,
          province: suggestion?.province ?? area.province,
        };
      }),
    );
  };

  const removeArea = (clientId: string) => {
    onAreasChange(areas.filter((area) => area.clientId !== clientId));
    onPartnersChange(
      partners.map((partner) =>
        partner.deliveryAreaClientId === clientId
          ? { ...partner, deliveryAreaClientId: "" }
          : partner,
      ),
    );
  };

  const updatePartner = (
    clientId: string,
    field: keyof PartnerAssignmentDraft,
    value: string,
  ) => {
    onPartnersChange(
      partners.map((partner) =>
        partner.clientId === clientId
          ? { ...partner, [field]: value }
          : partner,
      ),
    );
  };

  return (
    <section className="space-y-5" aria-labelledby="delivery-plan-title">
      <div className="border-border bg-muted/20 space-y-2 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
            <MapPinned className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="delivery-plan-title" className="text-sm font-semibold">
              Rencana area & mitra penyaluran
            </h2>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              Tambahkan beberapa lokasi sekaligus. Kota/kabupaten disarankan
              dari referensi Indonesia dan data organisasi; saat pilihan cocok,
              provinsi terisi otomatis. Mitra yang ditetapkan akan tersedia saat
              pengajuan terkait dialokasikan.
            </p>
          </div>
        </div>
      </div>

      <datalist id="program-city-suggestions">
        {options?.locations.map((location) => (
          <option
            key={`${location.city}-${location.province}`}
            value={location.city}
          >
            {location.province}
          </option>
        ))}
      </datalist>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Area penyaluran</h3>
            <p className="text-muted-foreground text-xs">
              Lokasi dan kuota disiapkan sebelum pengajuan dialokasikan.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAreasChange([...areas, createDeliveryAreaDraft()])}
          >
            <Plus className="mr-1 size-4" />
            Tambah area
          </Button>
        </div>

        {areas.length === 0 ? (
          <p className="border-border text-muted-foreground rounded-md border border-dashed px-4 py-3 text-sm">
            Belum ada area. Anda dapat menambahkannya sekarang atau setelah
            program dibuat.
          </p>
        ) : null}

        {areas.map((area, index) => (
          <fieldset
            key={area.clientId}
            className="border-border bg-card space-y-4 rounded-lg border p-4"
          >
            <legend className="bg-card px-1 text-sm font-medium">
              Area {index + 1}
            </legend>
            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                Gunakan nama yang mudah dikenali tim lapangan.
              </p>
              <Button
                aria-label={`Hapus area ${index + 1}`}
                type="button"
                size="sm"
                variant="ghost"
                className="size-8 p-0"
                onClick={() => removeArea(area.clientId)}
              >
                <Trash2 className="text-destructive size-4" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor={`area-name-${area.clientId}`}
                  className="required"
                >
                  Nama area
                </Label>
                <Input
                  id={`area-name-${area.clientId}`}
                  value={area.name}
                  placeholder="Contoh: Kecamatan Coblong"
                  onChange={(event) =>
                    updateArea(area.clientId, "name", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`area-quota-${area.clientId}`}>
                  Kuota penerima
                </Label>
                <Input
                  id={`area-quota-${area.clientId}`}
                  min={0}
                  type="number"
                  value={area.quotaCapacity}
                  onChange={(event) =>
                    updateArea(
                      area.clientId,
                      "quotaCapacity",
                      event.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={`area-city-${area.clientId}`}
                  className="required"
                >
                  Kota / Kabupaten
                </Label>
                <Input
                  id={`area-city-${area.clientId}`}
                  list="program-city-suggestions"
                  value={area.city}
                  placeholder={
                    optionsLoading
                      ? "Memuat saran daerah..."
                      : "Ketik, misalnya: Ciamis"
                  }
                  onChange={(event) =>
                    updateArea(area.clientId, "city", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={`area-province-${area.clientId}`}
                  className="required"
                >
                  Provinsi
                </Label>
                <Input
                  id={`area-province-${area.clientId}`}
                  value={area.province}
                  placeholder="Terisi otomatis jika kota dikenal"
                  onChange={(event) =>
                    updateArea(area.clientId, "province", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`area-district-${area.clientId}`}>
                  Kecamatan
                </Label>
                <Input
                  id={`area-district-${area.clientId}`}
                  value={area.district}
                  onChange={(event) =>
                    updateArea(area.clientId, "district", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`area-village-${area.clientId}`}>
                  Kelurahan / Desa
                </Label>
                <Input
                  id={`area-village-${area.clientId}`}
                  value={area.village}
                  onChange={(event) =>
                    updateArea(area.clientId, "village", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label
                  htmlFor={`area-address-${area.clientId}`}
                  className="required"
                >
                  Alamat jelas / titik penyaluran
                </Label>
                <Input
                  id={`area-address-${area.clientId}`}
                  value={area.addressLine}
                  placeholder="Nama jalan, nomor, patokan, atau lokasi distribusi"
                  onChange={(event) =>
                    updateArea(area.clientId, "addressLine", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`area-postal-${area.clientId}`}>Kode pos</Label>
                <Input
                  id={`area-postal-${area.clientId}`}
                  value={area.postalCode}
                  onChange={(event) =>
                    updateArea(area.clientId, "postalCode", event.target.value)
                  }
                />
              </div>
            </div>
          </fieldset>
        ))}
      </div>

      <div className="border-border border-t pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Mitra penyaluran</h3>
            <p className="text-muted-foreground text-xs">
              Pilih kontak aktif berperan sebagai mitra penyaluran dan kaitkan
              ke satu area atau seluruh program.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={optionsLoading}
            onClick={() =>
              onPartnersChange([...partners, createPartnerAssignmentDraft()])
            }
          >
            <Plus className="mr-1 size-4" />
            Tambah mitra
          </Button>
        </div>

        {partners.length === 0 ? (
          <p className="border-border text-muted-foreground mt-3 rounded-md border border-dashed px-4 py-3 text-sm">
            Belum ada mitra. Penugasan dapat ditambahkan kemudian dari detail
            Program.
          </p>
        ) : null}

        <div className="mt-3 space-y-3">
          {partners.map((partner, index) => (
            <fieldset
              key={partner.clientId}
              className="border-border bg-card space-y-4 rounded-lg border p-4"
            >
              <legend className="bg-card px-1 text-sm font-medium">
                Mitra {index + 1}
              </legend>
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <UsersRound className="size-3.5" />
                  Ditampilkan dalam daftar penugasan dan proses alokasi
                  pengajuan.
                </p>
                <Button
                  aria-label={`Hapus mitra ${index + 1}`}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0"
                  onClick={() =>
                    onPartnersChange(
                      partners.filter(
                        (item) => item.clientId !== partner.clientId,
                      ),
                    )
                  }
                >
                  <Trash2 className="text-destructive size-4" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label
                    htmlFor={`partner-contact-${partner.clientId}`}
                    className="required"
                  >
                    Mitra terdaftar
                  </Label>
                  <select
                    id={`partner-contact-${partner.clientId}`}
                    value={
                      partner.partnerContactId
                        ? `contact:${partner.partnerContactId}`
                        : partner.partnerOrganizationId
                          ? `organization:${partner.partnerOrganizationId}`
                          : ""
                    }
                    className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
                    onChange={(event) => {
                      const [kind, rawId] = event.target.value.split(":", 2);
                      const id = rawId ?? "";
                      const selected = options?.partners.find(
                        (option) => option.kind === kind && option.id === id,
                      );
                      onPartnersChange(
                        partners.map((item) =>
                          item.clientId === partner.clientId
                            ? {
                                ...item,
                                partnerContactId: kind === "contact" ? id : "",
                                partnerOrganizationId:
                                  kind === "organization" ? id : "",
                                picPhone:
                                  item.picPhone ||
                                  selected?.primary_phone ||
                                  "",
                              }
                            : item,
                        ),
                      );
                    }}
                  >
                    <option value="">
                      {optionsLoading
                        ? "Memuat daftar mitra..."
                        : "-- Pilih mitra --"}
                    </option>
                    {options?.partners.map((option) => (
                      <option
                        key={`${option.kind}-${option.id}`}
                        value={`${option.kind}:${option.id}`}
                      >
                        {option.kind === "organization"
                          ? "Lembaga mitra: "
                          : "Kontak mitra: "}
                        {option.display_name}
                        {locationLabel(option.city, option.province)
                          ? ` — ${locationLabel(option.city, option.province)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {!optionsLoading && options?.partners.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      Belum ada mitra aktif. Tambahkan relasi lembaga mitra atau
                      beri peran mitra penyaluran pada contact master.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`partner-area-${partner.clientId}`}>
                    Cakupan penyaluran
                  </Label>
                  <select
                    id={`partner-area-${partner.clientId}`}
                    value={partner.deliveryAreaClientId}
                    className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
                    onChange={(event) =>
                      updatePartner(
                        partner.clientId,
                        "deliveryAreaClientId",
                        event.target.value,
                      )
                    }
                  >
                    <option value="">Seluruh area Program</option>
                    {areas.map((area) => (
                      <option key={area.clientId} value={area.clientId}>
                        {area.name || "Area tanpa nama"}
                        {area.city ? ` — ${area.city}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`partner-role-${partner.clientId}`}>
                    Peran
                  </Label>
                  <select
                    id={`partner-role-${partner.clientId}`}
                    value={partner.assignmentRole}
                    className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
                    onChange={(event) =>
                      updatePartner(
                        partner.clientId,
                        "assignmentRole",
                        event.target.value,
                      )
                    }
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`partner-pic-${partner.clientId}`}>
                    Nama PIC
                  </Label>
                  <Input
                    id={`partner-pic-${partner.clientId}`}
                    value={partner.picName}
                    placeholder="Nama penanggung jawab lapangan"
                    onChange={(event) =>
                      updatePartner(
                        partner.clientId,
                        "picName",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`partner-phone-${partner.clientId}`}>
                    Telepon PIC
                  </Label>
                  <Input
                    id={`partner-phone-${partner.clientId}`}
                    value={partner.picPhone}
                    onChange={(event) =>
                      updatePartner(
                        partner.clientId,
                        "picPhone",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`partner-readiness-${partner.clientId}`}>
                    Kesiapan mitra
                  </Label>
                  <select
                    id={`partner-readiness-${partner.clientId}`}
                    value={partner.readinessStatus}
                    className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-2xs focus-visible:ring-1 focus-visible:outline-hidden"
                    onChange={(event) =>
                      updatePartner(
                        partner.clientId,
                        "readinessStatus",
                        event.target.value,
                      )
                    }
                  >
                    {Object.entries(readinessLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="border-primary/20 bg-primary/5 flex gap-3 rounded-lg border p-3 text-xs leading-5">
        <Store
          className="text-primary mt-0.5 size-4 shrink-0"
          aria-hidden="true"
        />
        <p>
          Penugasan ini belum merupakan distribusi atau alokasi kuota. Setelah
          Program dibuat, setiap pengajuan tetap harus lolos asesmen dan
          approval sebelum dapat dialokasikan ke area serta mitra yang siap.
        </p>
      </div>
    </section>
  );
}
