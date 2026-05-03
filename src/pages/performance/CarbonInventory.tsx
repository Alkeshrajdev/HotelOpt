import { useState } from "react";
import { Cloud, Info } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import KpiTile from "@/components/ui/KpiTile";
import Modal from "@/components/ui/Modal";
import HBar from "@/components/charts/HBar";
import {
  HeroValue,
  ScopeDrilldown,
} from "@/components/dashboard/Drilldowns";

type ScopeKey = null | 1 | 2 | 3;

export default function CarbonInventory() {
  const [drill, setDrill] = useState<ScopeKey>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-pillar-carbon/10 text-pillar-carbon"
          label="Scope 1" value="1,820" unit="tCO₂e" delta={-3.1}
          onClick={() => setDrill(1)}
        />
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-info/10 text-info"
          label="Scope 2 — location" value="6,420" unit="tCO₂e" delta={-7.4}
          onClick={() => setDrill(2)}
        />
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-cyan-50 text-cyan-700"
          label="Scope 2 — market" value="4,910" unit="tCO₂e" delta={-12.1}
          onClick={() => setDrill(2)}
        />
        <KpiTile
          icon={<Cloud size={18} />} iconBg="bg-pillar-social/10 text-pillar-social"
          label="Scope 3 (Cat 1–7)" value="22,640" unit="tCO₂e" delta={-2.2}
          onClick={() => setDrill(3)}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Scope 3 by category" hint="% of Scope 3 inventory" />
          <div className="p-6">
            <HBar
              data={[
                { name: "Cat 1 — Purchased goods", value: 38 },
                { name: "Cat 2 — Capital goods", value: 9 },
                { name: "Cat 4 — Upstream transport", value: 12 },
                { name: "Cat 5 — Waste", value: 8 },
                { name: "Cat 6 — Business travel", value: 14 },
                { name: "Cat 7 — Employee commute", value: 11 },
                { name: "Cat 3 — Fuel & energy related", value: 8 },
              ]}
            />
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Emission factor library" hint="Versioned · audit-logged" />
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-ink-50">
                  <th className="table-th">Source</th>
                  <th className="table-th">Region</th>
                  <th className="table-th">Year</th>
                  <th className="table-th">EF</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="table-td">Grid electricity</td><td className="table-td">UAE</td><td className="table-td">2026 Q2</td><td className="table-td tabular-nums">0.418 kgCO₂e/kWh</td></tr>
                <tr><td className="table-td">Grid electricity</td><td className="table-td">SG</td><td className="table-td">2026 Q2</td><td className="table-td tabular-nums">0.408 kgCO₂e/kWh</td></tr>
                <tr><td className="table-td">Natural gas</td><td className="table-td">Global</td><td className="table-td">IPCC AR6</td><td className="table-td tabular-nums">2.02 kgCO₂e/m³</td></tr>
                <tr><td className="table-td">R-410A</td><td className="table-td">Global</td><td className="table-td">IPCC AR6</td><td className="table-td tabular-nums">GWP 2,088</td></tr>
                <tr><td className="table-td">Linen laundry — supplier</td><td className="table-td">IT</td><td className="table-td">Supplier 2026</td><td className="table-td tabular-nums">0.92 kgCO₂e/kg</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="rounded-xl bg-brand-50 border border-brand-100 p-3 flex items-start gap-2.5">
        <Info size={16} className="text-brand-700 mt-0.5" />
        <div className="text-[13px] text-brand-900">
          EFs are versioned. Re-stating a prior period uses the EF active at submission, with the option to re-state under a current EF — both versions preserved for assurance.
        </div>
      </div>

      <Modal
        open={drill === 1}
        onClose={() => setDrill(null)}
        title="Scope 1 — direct emissions"
        subtitle="Natural gas, diesel, refrigerant leaks (GHG Protocol)"
        size="xl"
        hero={<HeroValue value="1,820" unit="tCO₂e" delta={-3.1} context="Last 12 months · vs prior year" />}
      >
        <ScopeDrilldown scope={1} />
      </Modal>

      <Modal
        open={drill === 2}
        onClose={() => setDrill(null)}
        title="Scope 2 — purchased energy"
        subtitle="Electricity, district cooling, steam (location & market)"
        size="xl"
        hero={<HeroValue value="6,140" unit="tCO₂e" delta={-9.4} context="Average of location & market views" />}
      >
        <ScopeDrilldown scope={2} />
      </Modal>

      <Modal
        open={drill === 3}
        onClose={() => setDrill(null)}
        title="Scope 3 — value chain emissions"
        subtitle="Categories 1–7 · spend-based & supplier-specific (FR-7)"
        size="xl"
        hero={<HeroValue value="22,640" unit="tCO₂e" delta={-2.2} context="Last 12 months" />}
      >
        <ScopeDrilldown scope={3} />
      </Modal>
    </div>
  );
}
