import { NavLink, useLocation } from "react-router-dom";
import { Building2, ChevronLeft, Leaf } from "lucide-react";
import { NAV, NAV_GROUPS } from "@/lib/nav";
import type { Role } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

export default function Sidebar({ collapsed, onToggle }: Props) {
  const location = useLocation();
  const { profile } = useAuth();
  // "maker" is the most restrictive role — safe fallback when profile not yet loaded.
  const role: Role = profile?.role ?? "maker";

  const visibleNav = NAV.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <aside className={cn("sidebar-shell", collapsed ? "w-[72px]" : "w-[252px]")}>

      {/* ── Brand + client context ── */}
      <div className="shrink-0 border-b sidebar-divider">
        {/* Logo row */}
        <div className="h-16 flex items-center px-4 gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/10 ring-1 ring-white/10 grid place-items-center text-white shadow-sm shrink-0">
            <Leaf size={18} />
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="text-[15px] font-extrabold text-white tracking-tight">HOTEL</div>
              <div className="text-[15px] font-extrabold text-white -mt-1 tracking-tight">OPTIMIZER</div>
            </div>
          )}
        </div>

        {/* Client context — collapsed shows just building icon */}
        {collapsed ? (
          <div className="flex justify-center pb-3">
            <div className="w-8 h-8 rounded-lg bg-white/8 grid place-items-center text-white/50">
              <Building2 size={14} />
            </div>
          </div>
        ) : (
          <div className="px-4 pb-3 space-y-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35 mb-1">
              Client
            </div>
            <div className="text-[13px] font-semibold text-white/90 truncate">Acme Hotels</div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/45">
              <Building2 size={10} className="shrink-0" />
              <span className="truncate">All Properties (72)</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {NAV_GROUPS.map((group) => {
          const items = visibleNav.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-3">
              {!collapsed && (
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider font-semibold nav-group-heading">
                  {group}
                </div>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const prefixActive =
                    !!item.matchPrefix &&
                    location.pathname.startsWith(item.matchPrefix);
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === "/"}
                        className={({ isActive }) =>
                          cn("nav-item", (isActive || prefixActive) && "nav-item-active")
                        }
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon size={18} className="shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={cn(
                                  "ml-auto chip rounded-full text-[10px] font-bold",
                                  item.badge === "BETA"
                                    ? "bg-white/12 text-white/60"
                                    : "bg-warn/25 text-warn"
                                )}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
          <div className="text-[11px] font-semibold text-white/70">Making every stay sustainable</div>
          <div className="text-[10px] text-white/35 mt-0.5 leading-snug">
            Smart data · Better decisions · Greener hospitality
          </div>
        </div>
      )}

      <button
        onClick={onToggle}
        className="m-3 mt-0 nav-item justify-start"
        aria-label="Collapse sidebar"
      >
        <ChevronLeft
          size={18}
          className={cn("transition-transform", collapsed && "rotate-180")}
        />
        {!collapsed && <span>Collapse</span>}
      </button>
    </aside>
  );
}
