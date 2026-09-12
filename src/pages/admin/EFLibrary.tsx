import { useEffect, useMemo, useState } from "react";
import { Database, Plus, Search, Upload } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import AdminShell from "./AdminShell";
import { useDataMode } from "@/lib/data/mode";
import {
  factorFacets, listFactorDatasets, queryFactors, type EfDataset, type EfFacet, type EfFactor,
} from "@/lib/api";
import { factorLabel, factorName } from "@/lib/data/carbon";
import { isProvisional } from "@/lib/data/factors";

const PAGE = 100;

const BOUNDARY_LABEL: Record<string, string> = {
  combustion: "Combustion",
  location_based: "Scope 2 — location",
  market_based: "Scope 2 — market",
  t_and_d: "T&D losses",
  wtt: "Well-to-tank",
  disposal: "Waste route",
  gwp: "GWP",
  lifecycle: "Cradle-to-gate",
  out_of_scope: "Outside scopes",
};

const DOMAIN_LABEL: Record<string, string> = {
  electricity: "Electricity", fuel: "Fuels", bioenergy: "Bioenergy", heat: "Heat & steam",
  refrigerant: "Refrigerants", water: "Water", waste: "Waste", material: "Materials",
  travel: "Travel", freight: "Freight", vehicle: "Owned vehicles", hotel_stay: "Hotel stays",
  homeworking: "Homeworking", spend: "Spend (EEIO)", other: "Other",
};

const scopeLabel = (f: EfFactor) =>
  f.scope === 3 && f.category ? `S3 ${f.category.replace("cat", "Cat ")}` : `Scope ${f.scope}`;

/* =================================================================== */

export default function AdminEFLibrary() {
  const mode = useDataMode();
  const live = mode === "live";

  const [datasets, setDatasets] = useState<EfDataset[]>([]);
  const [facets, setFacets] = useState<{ domains: EfFacet[]; boundaries: EfFacet[]; geoCodes: EfFacet[] }>({
    domains: [], boundaries: [], geoCodes: [],
  });
  const [rows, setRows] = useState<EfFactor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);

  const [term, setTerm] = useState("");
  const [dataset, setDataset] = useState("all");
  const [domain, setDomain] = useState("all");
  const [boundary, setBoundary] = useState("all");
  const [geo, setGeo] = useState("all");
  const [provisionalOnly, setProvisionalOnly] = useState(false);

  const filterKey = `${term}|${dataset}|${domain}|${boundary}|${geo}|${provisionalOnly}`;

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    Promise.all([listFactorDatasets(), factorFacets()])
      .then(([d, f]) => { if (!cancelled) { setDatasets(d); setFacets(f); } })
      .catch(() => { /* the table's own error message covers it */ });
    return () => { cancelled = true; };
  }, [live]);

  // A filter change starts again from the first page.
  useEffect(() => { setPage(0); }, [filterKey]);

  useEffect(() => {
    if (!live) { setRows([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    queryFactors({
      term: term.trim() || undefined,
      datasetId: dataset === "all" ? undefined : dataset,
      domain: domain === "all" ? undefined : domain,
      boundary: boundary === "all" ? undefined : boundary,
      geoCode: geo === "all" ? undefined : geo,
      provisionalOnly: provisionalOnly || undefined,
      from: page * PAGE,
      pageSize: PAGE,
    })
      .then((r) => {
        if (cancelled) return;
        setRows((prev) => (page === 0 ? r.rows : [...prev, ...r.rows]));
        setTotal(r.total);
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, filterKey, page]);

  const datasetName = useMemo(
    () => new Map(datasets.map((d) => [d.id, `${d.publisher} ${d.name}`])),
    [datasets],
  );

  const clear = () => {
    setTerm(""); setDataset("all"); setDomain("all"); setBoundary("all");
    setGeo("all"); setProvisionalOnly(false);
  };

  return (
    <AdminShell
      eyebrow="Reference data"
      title="Emission factor library"
      actions={
        <>
          <button className="btn-secondary"><Upload size={14} /> Import dataset</button>
          <button className="btn-primary"><Plus size={14} /> New factor</button>
        </>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Factors" value={total ? total.toLocaleString("en-US") : "—"} hint="across every dataset" />
        <StatTile label="Datasets" value={datasets.length ? String(datasets.length) : "—"} hint="published sets and overrides" />
        <StatTile label="Geographies" value={facets.geoCodes.length ? String(facets.geoCodes.length) : "—"} hint="grids, countries, GLOBAL" />
        <StatTile label="Boundaries" value={facets.boundaries.length ? String(facets.boundaries.length) : "—"} hint="combustion, T&D, WTT, GWP…" />
      </div>

      {datasets.length > 0 && (
        <Card>
          <CardHeader title="Datasets" hint="Lower precedence wins when two sets publish the same factor" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-left">
                  <th className="table-th">Publisher</th>
                  <th className="table-th">Set</th>
                  <th className="table-th">Version</th>
                  <th className="table-th">GWP set</th>
                  <th className="table-th text-right">Precedence</th>
                  <th className="table-th">Notes</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.id} className="border-t border-ink-100">
                    <td className="table-td font-medium">{d.publisher}</td>
                    <td className="table-td">{d.name}</td>
                    <td className="table-td font-mono text-[11px]">{d.version}</td>
                    <td className="table-td"><Badge tone={d.gwp_set === "AR5" ? "good" : "neutral"}>{d.gwp_set}</Badge></td>
                    <td className="table-td text-right tabular-nums">{d.precedence}</td>
                    <td className="table-td text-[12px] text-ink-500">{d.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search factor, material, country, NAICS…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <select className="input max-w-[190px]" value={dataset} onChange={(e) => setDataset(e.target.value)}>
          <option value="all">All datasets</option>
          {datasets.map((d) => <option key={d.id} value={d.id}>{d.publisher} — {d.name}</option>)}
        </select>
        <select className="input max-w-[160px]" value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="all">All domains</option>
          {facets.domains.map((d) => (
            <option key={d.value} value={d.value}>{DOMAIN_LABEL[d.value] ?? d.value} ({d.factors})</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={boundary} onChange={(e) => setBoundary(e.target.value)}>
          <option value="all">All boundaries</option>
          {facets.boundaries.map((b) => (
            <option key={b.value} value={b.value}>{BOUNDARY_LABEL[b.value] ?? b.value} ({b.factors})</option>
          ))}
        </select>
        <select className="input max-w-[140px]" value={geo} onChange={(e) => setGeo(e.target.value)}>
          <option value="all">All geographies</option>
          {facets.geoCodes.map((g) => (
            <option key={g.value} value={g.value}>{g.value} ({g.factors})</option>
          ))}
        </select>
        <button
          className={provisionalOnly ? "btn-secondary ring-1 ring-warn/40 text-warn-700" : "btn-secondary"}
          onClick={() => setProvisionalOnly((v) => !v)}
        >
          Provisional only
        </button>
      </div>

      <Card>
        <CardHeader
          title="Emission factors"
          hint={live
            ? `${rows.length.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} shown`
            : "Sign in to a live session to browse the library"}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="bg-ink-50 text-left">
                <th className="table-th">Factor</th>
                <th className="table-th">Scope</th>
                <th className="table-th">Boundary</th>
                <th className="table-th">Geography</th>
                <th className="table-th">Vintage</th>
                <th className="table-th text-right">Value</th>
                <th className="table-th">Source</th>
                <th className="table-th">Grade</th>
              </tr>
            </thead>
            <tbody>
              {loading && page === 0 && (
                <tr><td colSpan={8} className="table-td text-ink-500">Loading the factor library…</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={8} className="table-td text-bad-700">Could not load the library: {error}</td></tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-0">
                    <EmptyState
                      inset
                      icon={live ? <Search size={20} /> : <Database size={20} />}
                      title={live ? "No factors match" : "The library is only available live"}
                      description={live
                        ? "Try a different dataset, domain or geography."
                        : "The demo dataset carries no factor library — sign in to see the published sets."}
                      action={live ? <button className="btn-secondary" onClick={clear}>Clear filters</button> : undefined}
                    />
                  </td>
                </tr>
              )}
              {!error && rows.map((f) => (
                <tr key={f.id} className="border-t border-ink-100 hover:bg-ink-50/60">
                  <td className="table-td font-medium">
                    {factorName(f)}
                    <div className="text-[11px] text-ink-400">
                      {DOMAIN_LABEL[f.domain] ?? f.domain}{f.naics_code ? ` · NAICS ${f.naics_code}` : ""}
                    </div>
                  </td>
                  <td className="table-td">
                    <Badge tone={f.scope === 1 ? "warn" : f.scope === 2 ? "info" : "neutral"}>{scopeLabel(f)}</Badge>
                  </td>
                  <td className="table-td text-[12px]">{BOUNDARY_LABEL[f.boundary] ?? f.boundary}</td>
                  <td className="table-td text-[12px]">
                    {f.geo_code}
                    {f.geo_label && <div className="text-[11px] text-ink-400 truncate max-w-[180px]">{f.geo_label}</div>}
                  </td>
                  <td className="table-td text-[11px]">{f.factor_year_label ?? f.factor_year ?? "—"}</td>
                  <td className="table-td text-right tabular-nums">{factorLabel(f)}</td>
                  <td className="table-td text-[12px] text-ink-600">
                    {f.source_name ?? datasetName.get(f.dataset_id) ?? "—"}
                  </td>
                  <td className="table-td">
                    {isProvisional(f)
                      ? <Badge tone="warn">{f.reliability ?? f.status}</Badge>
                      : <Badge tone="good">{f.reliability ?? "production"}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {live && !error && rows.length < total && (
          <div className="px-5 py-3 border-t border-ink-100">
            <button className="btn-secondary" disabled={loading} onClick={() => setPage((p) => p + 1)}>
              {loading ? "Loading…" : `Load ${Math.min(PAGE, total - rows.length)} more`}
            </button>
          </div>
        )}
        <div className="px-5 py-2.5 text-[11px] text-ink-400 border-t border-ink-100">
          A factor is resolved by domain, activity, boundary and unit, then by geography
          (grid or utility → country → GLOBAL) and the newest vintage at or before the reporting
          year. Grid, T&D and well-to-tank are separate boundaries and are never summed into Scope 2.
        </div>
      </Card>
    </AdminShell>
  );
}
