import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Filter,
  MapPin,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import RowActionsMenu from "@/components/properties/RowActionsMenu";
import AddPropertyModal from "@/components/properties/AddPropertyModal";
import {
  CERTIFICATIONS,
  OPERATION_TYPES,
  PROPERTIES,
  REGIONS,
  type PropertyStatus,
  type RichProperty,
} from "@/lib/propertiesData";
import { cn } from "@/lib/utils";

type FilterState = {
  search: string;
  region: string;
  country: string;
  brand: string;
  status: PropertyStatus | "all";
  operation: string;
  star: number | "all";
  certification: string;
  gpReady: "all" | "yes" | "no";
  completeness: "all" | "ge90" | "ge60" | "lt60";
  poolEligible: "all" | "yes" | "no";
};

const INITIAL_FILTERS: FilterState = {
  search: "",
  region: "all",
  country: "all",
  brand: "all",
  status: "all",
  operation: "all",
  star: "all",
  certification: "all",
  gpReady: "all",
  completeness: "all",
  poolEligible: "all",
};

export default function Properties() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const COUNTRIES = useMemo(
    () => Array.from(new Set(PROPERTIES.map((p) => p.country))).sort(),
    []
  );
  const BRANDS = useMemo(
    () => Array.from(new Set(PROPERTIES.map((p) => p.brand))).sort(),
    []
  );

  const filtered = useMemo(() => {
    return PROPERTIES.filter((p) => {
      if (
        filters.search &&
        !`${p.name} ${p.city} ${p.country}`.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      if (filters.region !== "all" && p.region !== filters.region) return false;
      if (filters.country !== "all" && p.country !== filters.country) return false;
      if (filters.brand !== "all" && p.brand !== filters.brand) return false;
      if (filters.status !== "all" && p.status !== filters.status) return false;
      if (filters.operation !== "all" && p.operationType !== filters.operation) return false;
      if (filters.star !== "all" && p.starRating !== filters.star) return false;
      if (filters.certification !== "all" && !p.certifications.includes(filters.certification as any)) return false;
      if (filters.gpReady === "yes" && !p.gpReady) return false;
      if (filters.gpReady === "no" && p.gpReady) return false;
      if (filters.completeness === "ge90" && p.dataCompleteness < 90) return false;
      if (filters.completeness === "ge60" && p.dataCompleteness < 60) return false;
      if (filters.completeness === "lt60" && p.dataCompleteness >= 60) return false;
      if (filters.poolEligible === "yes" && !p.poolEligible) return false;
      if (filters.poolEligible === "no" && p.poolEligible) return false;
      return true;
    });
  }, [filters]);

  const activeFilterCount =
    (Object.keys(filters) as (keyof FilterState)[])
      .filter((k) => k !== "search")
      .filter((k) => filters[k] !== "all").length +
    (filters.search ? 1 : 0);

  const summary = useMemo(() => {
    return {
      total: filtered.length,
      gpReady: filtered.filter((p) => p.gpReady).length,
      avgScore: Math.round(
        filtered.reduce((s, p) => s + p.score, 0) / Math.max(1, filtered.length)
      ),
      avgCompleteness: Math.round(
        filtered.reduce((s, p) => s + p.dataCompleteness, 0) / Math.max(1, filtered.length)
      ),
    };
  }, [filtered]);

  return (
    <div>
      <PageHeader
        eyebrow="Configuration hub"
        title="Properties"
        subtitle="Master data for every hotel on the platform. Click a property to open its full configuration page."
        actions={
          <>
            <button
              className={cn("btn-secondary", activeFilterCount > 0 && "ring-1 ring-brand-500/30")}
              onClick={() => setFilterOpen((v) => !v)}
            >
              <Filter size={14} /> Filters
              {activeFilterCount > 0 && (
                <span className="chip bg-brand-50 text-brand-700">{activeFilterCount}</span>
              )}
            </button>
            <button className="btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add property
            </button>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryTile label="Total properties" value={String(summary.total)} hint={`${PROPERTIES.length} on platform`} />
        <SummaryTile label="Average score"    value={String(summary.avgScore)}     hint="0–100 sustainability" />
        <SummaryTile label="Data completeness" value={`${summary.avgCompleteness}%`} hint="approved records" tone="info" />
        <SummaryTile label="GP ready"          value={`${summary.gpReady} / ${summary.total}`} hint="full baseline + 12 mo data" tone="good" />
      </div>

      {/* Search + filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, city, country…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <ChipFilter
          label="Status"
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v as any }))}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "onboarding", label: "Onboarding" },
            { value: "inactive", label: "Inactive" },
          ]}
        />
        <ChipFilter
          label="GP"
          value={filters.gpReady}
          onChange={(v) => setFilters((f) => ({ ...f, gpReady: v as any }))}
          options={[
            { value: "all", label: "Any" },
            { value: "yes", label: "GP ready" },
            { value: "no", label: "Not yet" },
          ]}
        />
        {activeFilterCount > 0 && (
          <button
            className="text-[12px] font-semibold text-brand-700 hover:text-brand-800"
            onClick={() => setFilters(INITIAL_FILTERS)}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter drawer */}
      {filterOpen && (
        <Card className="mb-4">
          <CardHeader
            title="Advanced filters"
            right={
              <button
                onClick={() => setFilterOpen(false)}
                className="w-7 h-7 grid place-items-center rounded-md hover:bg-ink-100"
              >
                <X size={14} />
              </button>
            }
          />
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <SelectField
              label="Region"
              value={filters.region}
              onChange={(v) => setFilters((f) => ({ ...f, region: v }))}
              options={[{ value: "all", label: "All regions" }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
            />
            <SelectField
              label="Country"
              value={filters.country}
              onChange={(v) => setFilters((f) => ({ ...f, country: v }))}
              options={[{ value: "all", label: "All countries" }, ...COUNTRIES.map((c) => ({ value: c, label: c }))]}
            />
            <SelectField
              label="Brand"
              value={filters.brand}
              onChange={(v) => setFilters((f) => ({ ...f, brand: v }))}
              options={[{ value: "all", label: "All brands" }, ...BRANDS.map((b) => ({ value: b, label: b }))]}
            />
            <SelectField
              label="Operation type"
              value={filters.operation}
              onChange={(v) => setFilters((f) => ({ ...f, operation: v }))}
              options={[{ value: "all", label: "All" }, ...OPERATION_TYPES.map((o) => ({ value: o.key, label: o.label }))]}
            />
            <SelectField
              label="Star rating"
              value={String(filters.star)}
              onChange={(v) => setFilters((f) => ({ ...f, star: v === "all" ? "all" : Number(v) }))}
              options={[
                { value: "all", label: "Any" },
                { value: "3", label: "3 ★" },
                { value: "4", label: "4 ★" },
                { value: "5", label: "5 ★" },
              ]}
            />
            <SelectField
              label="Certification"
              value={filters.certification}
              onChange={(v) => setFilters((f) => ({ ...f, certification: v }))}
              options={[{ value: "all", label: "Any" }, ...CERTIFICATIONS.map((c) => ({ value: c.key, label: c.key }))]}
            />
            <SelectField
              label="Data completeness"
              value={filters.completeness}
              onChange={(v) => setFilters((f) => ({ ...f, completeness: v as any }))}
              options={[
                { value: "all", label: "Any" },
                { value: "ge90", label: "≥ 90%" },
                { value: "ge60", label: "≥ 60%" },
                { value: "lt60", label: "< 60%" },
              ]}
            />
            <SelectField
              label="Pool eligible"
              value={filters.poolEligible}
              onChange={(v) => setFilters((f) => ({ ...f, poolEligible: v as any }))}
              options={[
                { value: "all", label: "Any" },
                { value: "yes", label: "Eligible" },
                { value: "no", label: "Not yet" },
              ]}
            />
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-ink-50">
                <th className="table-th">Property</th>
                <th className="table-th">Brand</th>
                <th className="table-th">Region / Country</th>
                <th className="table-th">Operation · ★</th>
                <th className="table-th">Rooms · GFA</th>
                <th className="table-th">Data</th>
                <th className="table-th">GP</th>
                <th className="table-th">Cert</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <PropertyRow key={p.id} p={p} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="table-td text-center py-10 text-ink-500">
                    No properties match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddPropertyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(data) => {
          // Demo: would POST to /properties API.
          console.log("New property:", data);
        }}
      />
    </div>
  );
}

function PropertyRow({ p }: { p: RichProperty }) {
  return (
    <tr className="hover:bg-ink-50/60">
      <td className="table-td font-medium text-ink-900">
        <Link to={`/properties/${p.id}`} className="flex items-center gap-2 hover:text-brand-700">
          <Building2 size={14} className="text-brand-700" />
          <span className="truncate">{p.name}</span>
        </Link>
        <div className="text-[11px] text-ink-500 inline-flex items-center gap-1">
          <MapPin size={10} /> {p.city}
        </div>
      </td>
      <td className="table-td">{p.brand}</td>
      <td className="table-td">
        <div>{p.region}</div>
        <div className="text-[11px] text-ink-500">{p.country}</div>
      </td>
      <td className="table-td">
        <div className="capitalize">{p.operationType.replace("-", " ")}</div>
        <div className="text-[11px] text-warn">
          {"★".repeat(p.starRating)}
          <span className="text-ink-300">{"★".repeat(5 - p.starRating)}</span>
        </div>
      </td>
      <td className="table-td tabular-nums">
        <div>{p.rooms.toLocaleString()}</div>
        <div className="text-[11px] text-ink-500">
          {p.gfa.toLocaleString()} m²
        </div>
      </td>
      <td className="table-td">
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="w-20">
            <ProgressBar
              value={p.dataCompleteness}
              tone={p.dataCompleteness >= 80 ? "good" : p.dataCompleteness >= 60 ? "warn" : "bad"}
            />
          </div>
          <span className="text-[12px] font-semibold w-8 text-right">{p.dataCompleteness}%</span>
        </div>
      </td>
      <td className="table-td">
        {p.gpReady ? (
          <Badge tone="good">
            <Sparkles size={11} className="mr-0.5" /> Ready
          </Badge>
        ) : (
          <Badge tone="warn">Not yet</Badge>
        )}
      </td>
      <td className="table-td">
        <Badge tone={p.certStatus === "ready" ? "good" : p.certStatus === "in-progress" ? "info" : "warn"}>
          {p.certStatus === "ready"
            ? `${p.certifications.length} ready`
            : p.certStatus === "in-progress"
              ? `${p.certifications.length} active`
              : "pending"}
        </Badge>
      </td>
      <td className="table-td">
        <Badge
          tone={p.status === "active" ? "good" : p.status === "onboarding" ? "info" : "neutral"}
        >
          {p.status}
        </Badge>
      </td>
      <td className="table-td text-right pr-6">
        <RowActionsMenu propertyId={p.id} />
      </td>
    </tr>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "info";
}) {
  const ring =
    tone === "good"
      ? "border-good/25 bg-good/10/40"
      : tone === "info"
        ? "border-info/25 bg-info/10/40"
        : "border-ink-200 bg-white";
  return (
    <div className={cn("rounded-xl border p-4", ring)}>
      <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">
        {label}
      </div>
      <div className="text-2xl font-bold text-ink-900 mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-ink-500">{hint}</div>}
    </div>
  );
}

function ChipFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-[11px] font-medium text-ink-500">{label}</span>
      <select
        className="h-9 px-3 rounded-lg border border-ink-200 bg-white text-sm text-ink-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-ink-500">{label}</span>
      <select
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
