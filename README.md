# Hotel Optimizer — Frontend

Premium SaaS frontend for the Hotel Optimizer Global Hotel Sustainability Performance Platform, scaffolded against `HO-BRD-2026-v4.1`.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** with custom brand palette
- **React Router** for client-side routing
- **Recharts** for line, bar, and composed charts
- **lucide-react** for icons

## Running

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173`.

## Project map

```
src/
  components/
    layout/        AppShell, Sidebar, Topbar
    ui/            Card, StatCard, Badge, ProgressBar, PageHeader, PillarTabs, ViewTabs, EmptyState
    charts/        IntensityChart, RawVsGPChart, PillarBars, HBar, SparkLine
  lib/
    nav.ts         Navigation derived from BRD §1.3 (9 UX areas)
    mock.ts        Dummy data — replace with real API calls
    utils.ts
  pages/
    Dashboard, DataCapture, ReviewApproval,
    OwnPerformance, GenuinePerformance, InternalComparison, ExternalComparison, CarbonInventory,
    Reports, Certifications,
    Actions, SupplierPortal, AIAssistant, GuestEngagement,
    Properties, Billing, Admin, NotFound
```

## BRD coverage

| BRD area | Page |
| --- | --- |
| FR-1 Data Capture | `/data-capture` (manual / OCR / bulk / QR / API / surveys) |
| FR-2 Maker–Checker | `/review-approval` |
| FR-3 Own Performance | `/own-performance` (six-pillar tabs) |
| FR-4 Genuine Performance | `/genuine-performance` (excludes Social/Governance per §9.1) |
| FR-5 Internal Comparison | `/internal-comparison` |
| FR-6 External Comparison | `/external-comparison` (Full / Directional / Reference) |
| FR-7 Carbon & GHG Inventory | `/carbon-inventory` |
| FR-8 Reports & Disclosure | `/reports` |
| FR-12 Certification Readiness | `/certifications` |
| FR-15 Supplier Portal | `/supplier-portal` |
| FR-16 Knowledge & AI Assistant | `/ai-assistant` |
| FR-17 Guest Engagement | `/guest-engagement` |
| FR-18 Action & Capex Measure Library | `/actions` |
| FR-10 Subscription Billing | `/billing` |
| FR-11 Admin & Platform Management | `/admin` |
| Properties (master data) | `/properties` |

## Design notes

- Colour system: `brand` (deep forest green) for primary actions, `pillar.*` accents per pillar (Energy/Water/Waste/Carbon/Social/Governance).
- Typography: Inter, weights 400/500/600/700/800.
- Cards use 14px radius, hairline border, soft shadow — mirrors the reference UI.
- Layout shell is a 244 px collapsible sidebar + 64 px topbar.
- The four-layer performance story (Own → Genuine → Internal → External) is exposed as a pill-tab strip on the dashboard and as four dedicated pages — matching BRD §1.2.
- Pillar tabs respect BRD constraints: GP and External Comparison hide Social/Governance; Internal Comparison hides Governance.

## Dummy data

All numbers in `src/lib/mock.ts` are illustrative. Wire to your real APIs by replacing the imports — the components are designed to consume typed objects shaped like the mocks.
