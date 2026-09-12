/**
 * Sankey — flows between columns of nodes (source → use, source → scope → total).
 * Hand-drawn SVG so labels, colours and hover behaviour follow the design system.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { CHART } from "@/lib/chartPalette";
import { fmtN } from "./ChartBits";

export type SankeyNode = { id: string; label: string; column: number; color?: string; sub?: string };
export type SankeyLink = { source: string; target: string; value: number; color?: string };

type Placed = SankeyNode & { x: number; y: number; h: number; value: number; outY: number; inY: number };
type Band = { link: SankeyLink; s: Placed; t: Placed; sy: number; ty: number; h: number; color: string };

export default function Sankey({
  nodes, links, height = 300, unit = "", format = (v: number) => fmtN(v), nodeWidth = 14, nodePadding = 12,
  labelWidth = 150, onNodeClick, selectedId,
}: {
  nodes: SankeyNode[]; links: SankeyLink[]; height?: number; unit?: string; format?: (v: number) => string;
  nodeWidth?: number; nodePadding?: number; labelWidth?: number; onNodeClick?: (id: string) => void; selectedId?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => { const w = entries[0]?.contentRect.width; if (w) setWidth(Math.max(320, w)); });
    ro.observe(el);
    setWidth(Math.max(320, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const { placed, bands } = useMemo(() => {
    const cols = [...new Set(nodes.map((n) => n.column))].sort((a, b) => a - b);
    const value = (id: string) => Math.max(
      links.filter((l) => l.source === id).reduce((s, l) => s + l.value, 0),
      links.filter((l) => l.target === id).reduce((s, l) => s + l.value, 0),
    );
    const padTop = 8;
    const H = height - padTop * 2;
    // One vertical scale for every column so bands stay proportional across the chart.
    const scale = Math.min(...cols.map((c) => {
      const members = nodes.filter((n) => n.column === c);
      const total = members.reduce((s, n) => s + value(n.id), 0) || 1;
      return (H - (members.length - 1) * nodePadding) / total;
    }));
    const innerW = width - labelWidth * 2;
    const placed: Placed[] = [];
    cols.forEach((c, ci) => {
      const members = nodes.filter((n) => n.column === c);
      const used = members.reduce((s, n) => s + value(n.id) * scale, 0) + (members.length - 1) * nodePadding;
      let y = padTop + (H - used) / 2;
      const x = labelWidth + (cols.length === 1 ? 0 : (innerW - nodeWidth) * (ci / (cols.length - 1)));
      members.forEach((n) => {
        const v = value(n.id);
        placed.push({ ...n, x, y, h: v * scale, value: v, outY: y, inY: y });
        y += v * scale + nodePadding;
      });
    });
    const byId = new Map(placed.map((p) => [p.id, p]));
    // Order bands by the position of the node on the other side so they don't cross needlessly.
    const ordered = [...links].sort((a, b) => (byId.get(a.source)!.y - byId.get(b.source)!.y) || (byId.get(a.target)!.y - byId.get(b.target)!.y));
    const bands: Band[] = [];
    ordered.forEach((l) => {
      const s = byId.get(l.source), t = byId.get(l.target);
      if (!s || !t) return;
      const h = l.value * scale;
      bands.push({ link: l, s, t, sy: s.outY, ty: t.inY, h, color: l.color ?? s.color ?? CHART.olive });
      s.outY += h; t.inY += h;
    });
    return { placed, bands };
  }, [nodes, links, width, height, nodeWidth, nodePadding, labelWidth]);

  const lastCol = Math.max(...nodes.map((n) => n.column));
  const isDim = (id: string) => hover !== null && hover !== id && !bands.some((b) => (b.s.id === hover && b.t.id === id) || (b.t.id === hover && b.s.id === id));

  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={height} className="block overflow-visible">
        {bands.map((b, i) => {
          const x0 = b.s.x + nodeWidth, x1 = b.t.x, mx = (x0 + x1) / 2;
          const d = `M${x0},${b.sy} C${mx},${b.sy} ${mx},${b.ty} ${x1},${b.ty} L${x1},${b.ty + b.h} C${mx},${b.ty + b.h} ${mx},${b.sy + b.h} ${x0},${b.sy + b.h} Z`;
          const active = hover === b.s.id || hover === b.t.id;
          return (
            <path key={i} d={d} fill={b.color} fillOpacity={hover === null ? 0.32 : active ? 0.6 : 0.08} className="transition-[fill-opacity] duration-150">
              <title>{`${b.s.label} → ${b.t.label}: ${format(b.link.value)}${unit ? ` ${unit}` : ""}`}</title>
            </path>
          );
        })}
        {placed.map((n) => {
          const left = n.column === 0;
          const right = n.column === lastCol;
          const color = n.color ?? CHART.olive;
          const dim = isDim(n.id);
          const labelX = left ? n.x - 8 : n.x + nodeWidth + 8;
          const anchor = left ? "end" : "start";
          const selected = selectedId === n.id;
          return (
            <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} onClick={() => onNodeClick?.(n.id)} className={onNodeClick ? "cursor-pointer" : undefined} opacity={dim ? 0.35 : 1}>
              <rect x={n.x} y={n.y} width={nodeWidth} height={Math.max(2, n.h)} rx={3} fill={color} stroke={selected ? CHART.label : "none"} strokeWidth={selected ? 1.5 : 0}>
                <title>{`${n.label}: ${format(n.value)}${unit ? ` ${unit}` : ""}`}</title>
              </rect>
              {(n.h >= 14 || left || right) && (
                <text x={labelX} y={n.y + n.h / 2} textAnchor={anchor} dominantBaseline="central" fontSize={11} fill={CHART.label} fontWeight={600}>
                  {n.label}
                  <tspan fill={CHART.axis} fontWeight={400} fontSize={10}>{`  ${format(n.value)}${n.sub ? ` · ${n.sub}` : ""}`}</tspan>
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
