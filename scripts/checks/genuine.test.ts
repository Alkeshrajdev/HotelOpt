import { buildGenuine, type GpMonthlyPoint } from "../../src/lib/data/genuine";

const MONTHS = ["05","06","07","08","09","10","11","12","01","02","03","04"];
let seed = 42;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const noise = (sd: number) => (rnd() + rnd() + rnd() + rnd() + rnd() + rnd() - 3) * sd;

// Known model: y = 500 + 2.0·cdd + 0.40·orn
const TRUE = { b0: 500, cdd: 2.0, orn: 0.40 };
const mk = (year: number, sd: number, efficiencyGain = 0): GpMonthlyPoint[] =>
  MONTHS.map((m, i) => {
    const cdd = 60 + 90 * Math.sin((i / 12) * 2 * Math.PI) + rnd() * 20;
    const orn = 4000 + 600 * Math.cos((i / 12) * 2 * Math.PI) + rnd() * 200;
    const clean = TRUE.b0 + TRUE.cdd * cdd + TRUE.orn * orn;
    return {
      month: `${year}-${m}`,
      consumption: clean * (1 - efficiencyGain) + noise(sd),
      cdd, hdd: 0, orn, covers: orn * 0.3, laundry: orn * 3,
    };
  });

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail: string) => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${name.padEnd(52)} ${detail}`);
  ok ? pass++ : fail++;
};

// 1 — recovers known coefficients
{
  const g = buildGenuine("energy", 2024, 2025, mk(2024, 40), mk(2025, 40));
  const cdd = g.drivers.find((d) => d.key === "cdd");
  const orn = g.drivers.find((d) => d.key === "orn");
  check("tier is regression", g.tier === "regression", g.tier);
  check("recovers cdd coefficient (true 2.0)", !!cdd && Math.abs(cdd.coefficient - 2.0) < 0.5, cdd ? cdd.coefficient.toFixed(3) : "not selected");
  check("recovers orn coefficient (true 0.40)", !!orn && Math.abs(orn.coefficient - 0.40) < 0.1, orn ? orn.coefficient.toFixed(4) : "not selected");
  check("no efficiency change is reported as none", !g.significant, `gp ${g.genuinePct?.toFixed(2)}%`);
}

// 2 — detects a real 8 % saving
{
  const g = buildGenuine("energy", 2024, 2025, mk(2024, 40), mk(2025, 40, 0.08));
  check("detects an injected 8 % saving", g.significant && g.genuinePct! < -6 && g.genuinePct! > -10, `gp ${g.genuinePct?.toFixed(2)}%`);
}

// 3 — a 1 % change is inside the noise and must not be claimed
{
  const g = buildGenuine("energy", 2024, 2025, mk(2024, 40), mk(2025, 40, 0.01));
  check("1 % change is not claimed as a result", !g.significant, `gp ${g.genuinePct?.toFixed(2)}%, ${g.verdict.slice(0, 44)}`);
}

// 4 — baseline NMBE is zero by construction; LOOCV is not
{
  const g = buildGenuine("energy", 2024, 2025, mk(2024, 40), mk(2025, 40));
  check("baseline NMBE is 0 by construction", g.fit!.nmbe === 0, String(g.fit!.nmbe));
  check("cross-validated NMBE is a real number", Number.isFinite(g.fit!.nmbeCv) && g.fit!.nmbeCv !== 0, g.fit!.nmbeCv.toFixed(4) + " %");
  check("LOOCV scatter >= in-sample scatter", g.fit!.cvrmseCv >= g.fit!.cvrmse, `${g.fit!.cvrmseCv.toFixed(2)} >= ${g.fit!.cvrmse.toFixed(2)}`);
}

// 5 — noise so bad the gates must reject the model
{
  const g = buildGenuine("energy", 2024, 2025, mk(2024, 3000), mk(2025, 3000));
  check("a hopeless fit falls back, not through", g.tier !== "regression", `${g.tier} — ${g.why.slice(0, 60)}`);
}

// 6 — tier 2 when weather is missing
{
  const strip = (a: GpMonthlyPoint[]) => a.map((p) => ({ ...p, cdd: null, hdd: null }));
  const g = buildGenuine("energy", 2024, 2025, strip(mk(2024, 40)), strip(mk(2025, 40)));
  check("no weather -> tier 2 ratio", g.tier === "ratio", `${g.tier} — ${g.why.slice(0, 58)}`);
  check("tier 2 states the weather caveat", g.gaps.some((x) => x.toLowerCase().includes("weather")), "");
}

// 7 — tier 3 when there is no driver at all
{
  const bare = (a: GpMonthlyPoint[]) => a.map((p) => ({ ...p, cdd: null, hdd: null, orn: null, covers: null, laundry: null }));
  const g = buildGenuine("energy", 2024, 2025, bare(mk(2024, 40)), bare(mk(2025, 40)));
  check("no drivers at all -> tier 3 raw", g.tier === "raw", `${g.tier}`);
  check("tier 3 refuses to call itself a result", g.verdict.includes("not a performance result"), "");
}

// 8 — a short baseline cannot support a regression
{
  const g = buildGenuine("energy", 2024, 2025, mk(2024, 40).slice(0, 7), mk(2025, 40));
  check("7 baseline months -> not a regression", g.tier !== "regression", `${g.tier} — ${g.why.slice(0, 52)}`);
}

// 9 — an empty reporting year says so rather than printing zero
{
  const g = buildGenuine("energy", 2024, 2025, mk(2024, 40), mk(2025, 40).map((p) => ({ ...p, consumption: null })));
  check("empty reporting year is stated, not zeroed", g.genuinePct === null && g.gaps.length > 0, g.verdict);
}

// 10 — a driver that never moves must not enter the model
{
  const flat = (a: GpMonthlyPoint[]) => a.map((p) => ({ ...p, hdd: 0 }));
  const g = buildGenuine("energy", 2024, 2025, flat(mk(2024, 40)), flat(mk(2025, 40)));
  check("a constant driver is excluded", !g.drivers.some((d) => d.key === "hdd"), g.drivers.map((d) => d.key).join(","));
}

// 11 — waste must never take a weather driver
{
  const g = buildGenuine("waste", 2024, 2025, mk(2024, 40), mk(2025, 40));
  check("waste takes no weather driver", !g.drivers.some((d) => d.key === "cdd" || d.key === "hdd"), g.drivers.map((d) => d.key).join(","));
}

// 12 — the prediction interval must bracket the truth about 95 % of the time
{
  let covered = 0;
  const RUNS = 200;
  for (let r = 0; r < RUNS; r++) {
    const g = buildGenuine("energy", 2024, 2025, mk(2024, 40), mk(2025, 40));
    if (g.interval && g.measured >= g.interval.low && g.measured <= g.interval.high) covered++;
  }
  const pct = (covered / RUNS) * 100;
  check("95 % interval covers ~95 % of null runs", pct >= 88 && pct <= 100, `${pct.toFixed(1)} % over ${RUNS} runs`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
