import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { NAV } from "@/lib/nav";
import type { NavGroup, NavItem, Role } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { useAccount } from "@/lib/account";
import { findProperty } from "@/lib/propertiesData";
import { cn } from "@/lib/utils";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
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

export default function Sidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }: Props) {
  const { profile } = useAuth();
  const role: Role = profile?.role ?? "maker";
  const { account, hasModule } = useAccount();
  const singleHotelName = account.accountType === "single"
    ? findProperty(account.singleHotelId)?.name ?? "Single property"
    : null;

  return (
    <aside
      className={cn(
        "sidebar-shell w-[252px] z-40 transition-transform duration-200",
        // Mobile: off-canvas drawer that slides in.
        "fixed inset-y-0 left-0 lg:static lg:z-auto lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        // Desktop: optional icon-rail collapse.
        collapsed ? "lg:w-[72px]" : "lg:w-[252px]"
      )}
    >

      {/* ── Brand + client context ── */}
      <div className="shrink-0 border-b sidebar-divider">
        {/* Logo text — styled to match logo typography */}
        <div className={cn("flex items-center gap-2.5", collapsed ? "h-16 justify-center px-2" : "h-16 px-4")}>
          {/* Icon badge — small building mark */}
          <div className="w-8 h-8 rounded-lg bg-white/12 grid place-items-center shrink-0">
            <Building2 size={15} className="text-white" />
          </div>
          {!collapsed && (
            <div className="leading-none min-w-0">
              {/* "HOTEL" — bold, white, like the logo's primary wordmark */}
              <div className="text-[15px] font-extrabold text-white tracking-widest uppercase">Hotel</div>
              {/* "OPTIMIZER" — lighter, muted, like the logo's secondary line */}
              <div className="text-[11px] font-medium text-white/55 tracking-[0.2em] uppercase mt-0.5">Optimizer</div>
            </div>
          )}
        </div>

        {/* Client context */}
        {!collapsed && (
          <div className="px-4 pb-3 space-y-0.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35 mb-1">Client</div>
            <div className="text-[13px] font-semibold text-white/90 truncate">{account.clientName}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/45">
              <Building2 size={10} className="shrink-0" />
              <span className="truncate">{singleHotelName ?? "Portfolio · 10 properties"}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5"
        onClick={(e) => {
          // On mobile, tapping a destination link dismisses the drawer.
          if ((e.target as HTMLElement).closest("a")) onMobileClose?.();
        }}
      >
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
              // Single-hotel accounts have no portfolio rollup — the Portfolio
              // group collapses to a direct "My Hotel" link to that property.
              // This runs BEFORE the role gate so a single-property user who
              // isn't super_admin (e.g. property_sm) still gets a route to their
              // own property instead of no sidebar link at all.
              if (section.module === "portfolio" && account.accountType === "single") {
                const myHotel: NavItem = {
                  to: `/properties/${account.singleHotelId}`,
                  label: "My Hotel", icon: Building2, matchPrefix: "/properties",
                };
                visible.push({ type: "node", key: "my-hotel", el: <NavItemLink key="my-hotel" item={myHotel} collapsed={collapsed} /> });
                return;
              }
              if (!hasRole(section.roles, role)) return;
              if (section.module && !hasModule(section.module)) return;
              visible.push({ type: "node", key: section.label, el: <NavGroupSection key={section.label} group={section} collapsed={collapsed} /> });
              return;
            }
            if (!hasRole(section.roles, role)) return;
            if (section.module && !hasModule(section.module)) return;
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
        className="m-3 mt-0 nav-item justify-start hidden lg:flex"
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
