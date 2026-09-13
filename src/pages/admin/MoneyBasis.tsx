import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Database, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import AdminShell from "./AdminShell";
import { useToast } from "@/components/ui/Toast";
import { useDataMode } from "@/lib/data/mode";
import {
  deleteFxRate, deletePriceIndex, listFactorDatasets, listFxRates, listPriceIndices,
  saveFxRates, savePriceIndices,
  type EfDataset, type EfFxRate, type EfPriceIndex,
} from "@/lib/api";

/**
 * Currency and price-year reference data for spend-based Scope 3.
 *
 * A spend factor is denominated in a currency and a price year — USEEIO is 2022 USD at
 * purchaser price. Until a rate is loaded here, every foreign invoice needs the rate
 * typed by hand at capture; until an index is loaded, spend is multiplied by an older
 * factor without being restated and each row carries a flag saying so.
 *
 * Nothing is pre-filled. A wrong exchange rate is exactly the kind of plausible-looking
 * number this product will not invent, so the rates come from whoever can cite them.
 */

const CURRENCIES = ["AED", "EUR", "GBP", "SGD", "CHF", "THB", "ZAR", "AUD", "CAD", "INR", "JPY", "MYR", "IDR"];
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => thisYear - i);

export default function AdminMoneyBasis() {
  const mode = useDataMode();
  const live = mode === "live";
  const toast = useToast();

  const [rates, setRates] = useState<EfFxRate[]>([]);
  const [indices, setIndices] = useState<EfPriceIndex[]>([]);
  const [datasets, setDatasets] = useState<EfDataset[]>([]);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!live) { setLoading(false); return; }
    setLoading(true);
    try {
      const [fx, idx, ds] = await Promise.all([listFxRates(), listPriceIndices(), listFactorDatasets()]);
      setRates(fx); setIndices(idx); setDatasets(ds); setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [live]);

  useEffect(() => { void load(); }, [load]);

  /** The datasets whose factors are priced in money, so the page can name their base year. */
  const moneyDatasets = useMemo(() => datasets.filter((d) => d.currency_base_year), [datasets]);

  const [fxDraft, setFxDraft] = useState({ from: "AED", year: String(thisYear), rate: "", source: "" });
  const [idxDraft, setIdxDraft] = useState({ region: "US", series: "BLS PPI — final demand", year: String(thisYear), value: "", source: "" });

  async function addRate() {
    const rate = Number(fxDraft.rate);
    if (!Number.isFinite(rate) || rate <= 0) { toast.error("Enter the rate as USD per one unit of the currency."); return; }
    if (!fxDraft.source.trim()) { toast.error("Name the source — an auditor will ask where the rate came from."); return; }
    setSaving(true);
    try {
      await saveFxRates([{
        from_currency: fxDraft.from, to_currency: "USD", year: Number(fxDraft.year),
        rate, basis: "annual_average", source: fxDraft.source.trim(),
      }]);
      toast.success(`${fxDraft.from} ${fxDraft.year} saved`);
      setFxDraft((d) => ({ ...d, rate: "" }));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function addIndex() {
    const value = Number(idxDraft.value);
    if (!Number.isFinite(value) || value <= 0) { toast.error("Enter the index value for that year."); return; }
    if (!idxDraft.source.trim()) { toast.error("Name the source — an auditor will ask which series this is."); return; }
    setSaving(true);
    try {
      await savePriceIndices([{
        region: idxDraft.region.trim().toUpperCase(), series: idxDraft.series.trim(),
        year: Number(idxDraft.year), index_value: value, source: idxDraft.source.trim(),
      }]);
      toast.success(`${idxDraft.region} ${idxDraft.year} saved`);
      setIdxDraft((d) => ({ ...d, value: "" }));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeRate(id: string, label: string) {
    try { await deleteFxRate(id); toast.success(`${label} removed`); await load(); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function removeIndex(id: string, label: string) {
    try { await deletePriceIndex(id); toast.success(`${label} removed`); await load(); }
    catch (e) { toast.error((e as Error).message); }
  }

  /** Which currencies still have no rate for the current year — the actual blocker. */
  const missingThisYear = useMemo(
    () => CURRENCIES.filter((c) => !rates.some((r) => r.from_currency === c && r.year === thisYear)),
    [rates],
  );

  if (!live) {
    return (
      <AdminShell eyebrow="Reference data" title="Currency & price basis">
        <EmptyState
          icon={<Database size={20} />}
          title="Only available on live data"
          description="Exchange rates and price indices are reference data held in the database; the demo dataset carries none."
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell eyebrow="Reference data" title="Currency & price basis">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Exchange rates" value={String(rates.length)} hint="annual averages on file" />
        <StatTile label="Price indices" value={String(indices.length)} hint="for restating to a base year" />
        <StatTile
          label={`Unrated for ${thisYear}`}
          value={String(missingThisYear.length)}
          hint={missingThisYear.length ? "invoices need a typed rate" : "every currency covered"}
        />
        <StatTile
          label="Factor base"
          value={moneyDatasets[0]?.currency_base_year ? `${moneyDatasets[0].currency_base_year} ${moneyDatasets[0].currency_code}` : "—"}
          hint={moneyDatasets[0] ? moneyDatasets[0].name : "no money-denominated dataset"}
        />
      </div>

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <Coins size={16} className="text-brand-700 mt-0.5 shrink-0" />
        <div className="text-[13px] text-brand-900">
          An invoice becomes <code className="text-[12px]">amount × rate × deflator</code> before it meets a spend factor.
          With no rate on file the capture form asks for one and refuses without it; with no index it applies a deflator
          of 1 and flags the row as overstated. Nothing here is pre-filled — load the rates your organisation can cite.
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 items-stretch">
        <Card className="col-span-12 xl:col-span-7 flex flex-col">
          <CardHeader title="Exchange rates" hint="USD per one unit · annual average" />
          <div className="p-5 grid grid-cols-2 lg:grid-cols-5 gap-3 border-b border-ink-100">
            <label className="text-[12px] text-ink-600">
              Currency
              <select className="input mt-1" value={fxDraft.from} onChange={(e) => setFxDraft((d) => ({ ...d, from: e.target.value }))}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-[12px] text-ink-600">
              Year
              <select className="input mt-1" value={fxDraft.year} onChange={(e) => setFxDraft((d) => ({ ...d, year: e.target.value }))}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="text-[12px] text-ink-600">
              USD per 1 unit
              <input className="input mt-1" type="number" step="0.000001" placeholder="0.272294"
                value={fxDraft.rate} onChange={(e) => setFxDraft((d) => ({ ...d, rate: e.target.value }))} />
            </label>
            <label className="text-[12px] text-ink-600 lg:col-span-2">
              Source
              <input className="input mt-1" placeholder="e.g. ECB annual average 2026"
                value={fxDraft.source} onChange={(e) => setFxDraft((d) => ({ ...d, source: e.target.value }))} />
            </label>
            <div className="col-span-2 lg:col-span-5">
              <button className="btn-primary" disabled={saving} onClick={addRate}>
                <Plus size={14} /> {saving ? "Saving…" : "Add rate"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-left">
                  <th className="table-th">Currency</th>
                  <th className="table-th">Year</th>
                  <th className="table-th text-right">USD per unit</th>
                  <th className="table-th">Source</th>
                  <th className="table-th w-10" />
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="table-td text-ink-500">Loading…</td></tr>}
                {!loading && error && <tr><td colSpan={5} className="table-td text-bad-700">{error}</td></tr>}
                {!loading && !error && rates.length === 0 && (
                  <tr><td colSpan={5} className="p-0">
                    <EmptyState inset icon={<Coins size={20} />} title="No exchange rates loaded"
                      description="Every foreign invoice needs its rate typed at capture until one is on file for that currency and year." />
                  </td></tr>
                )}
                {rates.map((r) => (
                  <tr key={r.id} className="border-t border-ink-100">
                    <td className="table-td font-medium">{r.from_currency} → {r.to_currency}</td>
                    <td className="table-td tabular-nums">{r.year}</td>
                    <td className="table-td text-right tabular-nums">{Number(r.rate).toLocaleString("en-US", { maximumFractionDigits: 6 })}</td>
                    <td className="table-td text-[12px] text-ink-500">{r.source ?? "—"}</td>
                    <td className="table-td text-right">
                      <button className="btn-ghost h-7 px-2 text-ink-400 hover:text-bad-700"
                        aria-label={`Remove ${r.from_currency} ${r.year}`}
                        onClick={() => removeRate(r.id, `${r.from_currency} ${r.year}`)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {missingThisYear.length > 0 && !loading && (
            <div className="mt-auto px-5 py-3 border-t border-ink-100 text-[11px] text-ink-500">
              No {thisYear} rate for {missingThisYear.join(", ")} — invoices in those currencies still need one typed at capture.
            </div>
          )}
        </Card>

        <Card className="col-span-12 xl:col-span-5 flex flex-col">
          <CardHeader title="Price indices" hint="For restating spend into a factor's base year" />
          <div className="p-5 grid grid-cols-2 gap-3 border-b border-ink-100">
            <label className="text-[12px] text-ink-600">
              Economy
              <input className="input mt-1" value={idxDraft.region} onChange={(e) => setIdxDraft((d) => ({ ...d, region: e.target.value }))} />
            </label>
            <label className="text-[12px] text-ink-600">
              Year
              <select className="input mt-1" value={idxDraft.year} onChange={(e) => setIdxDraft((d) => ({ ...d, year: e.target.value }))}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="text-[12px] text-ink-600 col-span-2">
              Series
              <input className="input mt-1" value={idxDraft.series} onChange={(e) => setIdxDraft((d) => ({ ...d, series: e.target.value }))} />
            </label>
            <label className="text-[12px] text-ink-600">
              Index value
              <input className="input mt-1" type="number" step="0.001" placeholder="e.g. 142.7"
                value={idxDraft.value} onChange={(e) => setIdxDraft((d) => ({ ...d, value: e.target.value }))} />
            </label>
            <label className="text-[12px] text-ink-600">
              Source
              <input className="input mt-1" placeholder="e.g. BLS series WPUFD4"
                value={idxDraft.source} onChange={(e) => setIdxDraft((d) => ({ ...d, source: e.target.value }))} />
            </label>
            <div className="col-span-2">
              <button className="btn-primary" disabled={saving} onClick={addIndex}>
                <Plus size={14} /> {saving ? "Saving…" : "Add index"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-left">
                  <th className="table-th">Economy · year</th>
                  <th className="table-th text-right">Index</th>
                  <th className="table-th">Series</th>
                  <th className="table-th w-10" />
                </tr>
              </thead>
              <tbody>
                {!loading && !error && indices.length === 0 && (
                  <tr><td colSpan={4} className="p-0">
                    <EmptyState inset icon={<Coins size={20} />} title="No price indices loaded"
                      description="Spend is multiplied by the factor without being restated, and every row says so." />
                  </td></tr>
                )}
                {indices.map((i) => (
                  <tr key={i.id} className="border-t border-ink-100">
                    <td className="table-td font-medium">{i.region} · {i.year}</td>
                    <td className="table-td text-right tabular-nums">{Number(i.index_value).toLocaleString("en-US", { maximumFractionDigits: 3 })}</td>
                    <td className="table-td text-[12px] text-ink-500">{i.series}</td>
                    <td className="table-td text-right">
                      <button className="btn-ghost h-7 px-2 text-ink-400 hover:text-bad-700"
                        aria-label={`Remove ${i.region} ${i.year}`}
                        onClick={() => removeIndex(i.id, `${i.region} ${i.year}`)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-auto px-5 py-3 border-t border-ink-100 text-[11px] text-ink-500">
            The index belongs to the <strong>factor's</strong> economy, not the buyer's country — USEEIO is a US series.
            The deflator is base-year ÷ spend-year, so both years must be on file.
          </div>
        </Card>
      </div>

      {moneyDatasets.length > 0 && (
        <Card>
          <CardHeader title="What the rates feed" hint="Datasets whose factors are priced in money" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-left">
                  <th className="table-th">Dataset</th>
                  <th className="table-th">Denominated in</th>
                  <th className="table-th">Index needed for</th>
                </tr>
              </thead>
              <tbody>
                {moneyDatasets.map((d) => {
                  const have = indices.some((i) => i.year === d.currency_base_year);
                  return (
                    <tr key={d.id} className="border-t border-ink-100">
                      <td className="table-td font-medium">{d.publisher} — {d.name}</td>
                      <td className="table-td">{d.currency_base_year} {d.currency_code}</td>
                      <td className="table-td">
                        {have
                          ? <Badge tone="good">{d.currency_base_year} index on file</Badge>
                          : <Badge tone="warn">no {d.currency_base_year} index — spend is not restated</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}
