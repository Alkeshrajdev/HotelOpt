import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { NAV } from "@/lib/nav";
import type { NavGroup, NavItem, Role } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
};

function hasRole(roles: Role[] | undefined, role: Role) {
  return !roles || roles.includes(role);
}

function NavItemLink({
  item,
  collapsed,
  indent = false,
}: {
  item: NavItem;
  collapsed: boolean;
  indent?: boolean;
}) {
  const location = useLocation();
  const prefixActive =
    !!item.matchPrefix && location.pathname.startsWith(item.matchPrefix);
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={!item.matchPrefix}
      className={({ isActive }) =>
        cn(
          "nav-item",
          indent && !collapsed && "pl-9",
          (isActive || prefixActive) && "nav-item-active"
        )
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
  );
}

function NavGroupSection({
  group,
  collapsed,
}: {
  group: NavGroup;
  collapsed: boolean;
}) {
  const location = useLocation();
  const isCurrentSection =
    !!group.matchPrefix
      ? location.pathname.startsWith(group.matchPrefix)
      : group.items.some((i) => location.pathname.startsWith(i.to));

  const [open, setOpen] = useState(isCurrentSection);
  const Icon = group.icon;

  // In collapsed mode show a simple icon-only button (tooltip only)
  if (collapsed) {
    return (
      <div className="relative group/g">
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn("nav-item w-full", isCurrentSection && "nav-item-active")}
          title={group.label}
        >
          <Icon size={18} className="shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "nav-item w-full",
          isCurrentSection && !open && "nav-item-active"
        )}
      >
        <Icon size={18} className="shrink-0" />
        <span className="truncate flex-1 text-left">{group.label}</span>
        <ChevronRight
          size={14}
          className={cn(
            "ml-auto shrink-0 text-white/40 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </button>

      {open && (
        <ul className="mt-0.5 space-y-0.5">
          {group.items.map((item) => (
            <li key={item.to}>
              <NavItemLink item={item} collapsed={false} indent />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const { profile } = useAuth();
  const role: Role = profile?.role ?? "maker";

  return (
    <aside className={cn("sidebar-shell", collapsed ? "w-[72px]" : "w-[252px]")}>

      {/* ── Brand + client context ── */}
      <div className="shrink-0 border-b sidebar-divider">
        <div className={cn("flex items-center", collapsed ? "h-16 justify-center px-2" : "h-14 px-3")}>
          {collapsed ? (
            /* Collapsed: square crop — icon fills the badge */
            <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center">
              <img
                src="/LogoDark.png"
                alt="Hotel Optimizer"
                className="w-9 h-9 object-cover"
              />
            </div>
          ) : (
            /* Expanded: fill the full brand area width, image is square so
               we give a wide fixed container and use object-contain so
               the whole logo (icon + wordmark) is visible */
            <img
              src="/LogoDark.png"
              alt="Hotel Optimizer"
              className="w-full h-12 object-contain object-left"
            />
          )}
        </div>

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
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {(() => {
          // Build visible sections first so we can strip orphan dividers
          type Rendered = { type: "divider"; idx: number } | { type: "node"; key: string; el: React.ReactNode };
          const visible: Rendered[] = [];

          NAV.forEach((section, i) => {
            if (section.type === "divider") {
              visible.push({ type: "divider", idx: i });
              return;
            }
            if (section.type === "group") {
              if (!hasRole(section.roles, role)) return;
              visible.push({ type: "node", key: section.label, el: <NavGroupSection key={section.label} group={section} collapsed={collapsed} /> });
              return;
            }
            if (!hasRole(section.roles, role)) return;
            visible.push({ type: "node", key: section.to, el: <NavItemLink key={section.to} item={section} collapsed={collapsed} /> });
          });

          // Remove leading, trailing, and consecutive dividers
          const cleaned: Rendered[] = [];
          for (const v of visible) {
            if (v.type === "divider") {
              const last = cleaned[cleaned.length - 1];
              if (!last || last.type === "divider") continue; // leading or consecutive
              cleaned.push(v);
            } else {
              cleaned.push(v);
            }
          }
          // Remove trailing divider
          while (cleaned.length > 0 && cleaned[cleaned.length - 1].type === "divider") cleaned.pop();

          return cleaned.map((v) =>
            v.type === "divider"
              ? collapsed ? null : <div key={`div-${v.idx}`} className="my-1.5 border-t border-white/8" />
              : <React.Fragment key={v.key}>{v.el}</React.Fragment>
          );
        })()}
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
