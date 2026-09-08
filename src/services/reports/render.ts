/**
 * Rendering an issued report — SPEC-03I · I1, Guide §18.
 *
 * A report is a self-contained HTML document with print styles (R-01: nothing assembled
 * by hand; PDF is the browser's print of it) and a CSV of the dataset behind it (R-05).
 * The disclosures §18 puts on the face of a report are rendered from the engine's
 * disclosure block, and every non-measured figure is marked beside the figure it affects
 * (C-10), never collected into a footnote. No narrative is generated (W-006): the
 * sections carry figures, disclosures and the manager's own operational note.
 */

export interface ReportTable {
  readonly caption: string
  readonly columns: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

export interface ReportSection {
  readonly heading: string
  readonly paragraphs?: readonly string[]
  readonly table?: ReportTable
  /** A figure that is not measured is marked where it stands (C-10). */
  readonly markers?: readonly string[]
  readonly refusal?: string
}

export interface ReportDocument {
  readonly title: string
  readonly subtitle: string
  readonly client: string
  readonly issuedNote: string
  readonly draft: boolean
  readonly sections: readonly ReportSection[]
  readonly disclosureLines: readonly string[]
  readonly operationalNote: string | null
}

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function renderHtml(doc: ReportDocument): string {
  const draftBanner = doc.draft
    ? '<p class="draft">DRAFT. This report is produced over figures that are not all approved and says so on every page.</p>'
    : ''
  const sections = doc.sections
    .map((s) => {
      const paragraphs = (s.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`).join('')
      const markers = (s.markers ?? []).map((m) => `<p class="marker">${esc(m)}</p>`).join('')
      const refusal = s.refusal ? `<p class="refusal">${esc(s.refusal)}</p>` : ''
      const table = s.table
        ? `<table><caption>${esc(s.table.caption)}</caption><thead><tr>${s.table.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${s.table.rows
            .map(
              (r) =>
                `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'name' : 'num'}">${esc(c)}</td>`).join('')}</tr>`,
            )
            .join('')}</tbody></table>`
        : ''
      return `<section><h2>${esc(s.heading)}</h2>${refusal}${paragraphs}${table}${markers}</section>`
    })
    .join('\n')
  const disclosure = doc.disclosureLines.map((l) => `<li>${esc(l)}</li>`).join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
<style>
body{font-family:Inter,system-ui,sans-serif;color:#1f2933;margin:0;padding:32px;max-width:960px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;padding-bottom:4px;border-bottom:1px solid #d9dee3}
.sub{color:#52606d;margin:0 0 16px}.draft{background:#fff4e5;border-left:4px solid #b7791f;padding:8px 12px;font-weight:600}
table{border-collapse:collapse;width:100%;margin:8px 0}th,td{padding:6px 8px;border-bottom:1px solid #e4e7eb;font-size:13px;text-align:left}
td.num{font-variant-numeric:tabular-nums;text-align:right}caption{font-size:12px;text-align:left;color:#52606d;padding:4px 0}
.marker{background:#fff4e5;padding:6px 8px;font-size:13px}.refusal{background:#fde8e8;padding:6px 8px;font-size:13px}
.disclosure li{font-size:13px}.foot{color:#52606d;font-size:12px;margin-top:24px}
@media print{body{padding:0}.draft{position:fixed;top:0;right:0}}
</style></head><body>
<header><p class="sub">${esc(doc.client)} · Hotel Optimizer</p><h1>${esc(doc.title)}</h1><p class="sub">${esc(doc.subtitle)}</p>${draftBanner}</header>
${sections}
<section><h2>Disclosures</h2><ul class="disclosure">${disclosure}</ul></section>
${doc.operationalNote ? `<section><h2>Management comment</h2><p>${esc(doc.operationalNote)}</p></section>` : ''}
<p class="foot">${esc(doc.issuedNote)}</p>
</body></html>`
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v
}

/** The dataset behind the report, one row per figure (R-05). */
export function renderCsv(doc: ReportDocument): string {
  const lines = ['section,table,row,column,value']
  for (const s of doc.sections) {
    if (!s.table) continue
    for (const r of s.table.rows) {
      const name = r[0] ?? ''
      r.forEach((v, i) => {
        if (i === 0) return
        lines.push(
          [s.heading, s.table!.caption, name, s.table!.columns[i] ?? '', v].map(csvCell).join(','),
        )
      })
    }
  }
  return lines.join('\n') + '\n'
}
