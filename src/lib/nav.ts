import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Database,
  ClipboardCheck,
  BarChart3,
  FileText,
  Award,
  Building2,
  Truck,
  Bot,
  Lightbulb,
  Users,
  Settings as SettingsIcon,
  CreditCard,
  ShoppingBag,
  Zap,
  Droplets,
  Wind,
  Cpu,
  Bell,
  TrendingDown,
  Activity,
  FolderOpen,
} from "lucide-react";

// Must match database.types.ts Enums["user_role"] exactly.
export type Role = "maker" | "checker" | "property_sm" | "super_admin";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  matchPrefix?: string;
  roles?: Role[];
};

export type NavGroup = {
  type: "group";
  label: string;
  icon: LucideIcon;
  matchPrefix?: string;
  roles?: Role[];
  items: NavItem[];
};

export type NavDivider = { type: "divider" };

export type NavSection = ({ type: "item" } & NavItem) | NavGroup | NavDivider;

export const NAV: NavSection[] = [
  // ── Portfolio (super_admin only) ─────────────────────────────────────
  {
    type: "group",
    label: "Portfolio",
    icon: FolderOpen,
    matchPrefix: "/portfolio",
    roles: ["super_admin"],
    items: [
      { to: "/portfolio/dashboard",               label: "Dashboard",           icon: LayoutDashboard, matchPrefix: "/portfolio/dashboard" },
      { to: "/properties",                        label: "Properties",          icon: Building2 },
      { to: "/portfolio/setup",                   label: "Setup",               icon: SettingsIcon },
      { to: "/portfolio/reports-certifications",  label: "Reports & Certs",     icon: FileText },
    ],
  },

  { type: "divider" },

  // ── Performance & Reporting ──────────────────────────────────────────
  { type: "item", to: "/performance/energy/overview", label: "Performance",    icon: BarChart3,   matchPrefix: "/performance", roles: ["property_sm", "super_admin"] },

  { type: "divider" },

  // ── Workspace ────────────────────────────────────────────────────────
  { type: "item", to: "/data-capture",    label: "Data Capture",      icon: Database,       roles: ["maker", "property_sm", "super_admin"] },
  { type: "item", to: "/review-approval", label: "Review & Approval", icon: ClipboardCheck, badge: "24", roles: ["maker", "checker", "property_sm", "super_admin"] },

  { type: "divider" },

  // ── Smart Ops (collapsible) ───────────────────────────────────────────
  {
    type: "group",
    label: "Smart Ops",
    icon: Activity,
    matchPrefix: "/smart-ops",
    roles: ["property_sm", "super_admin"],
    items: [
      { to: "/smart-ops",         label: "Overview",    icon: Activity,    matchPrefix: "/smart-ops" },
      { to: "/smart-ops/energy",  label: "Energy",      icon: Zap },
      { to: "/smart-ops/water",   label: "Water",       icon: Droplets },
      { to: "/smart-ops/iaq",     label: "IAQ & Comfort", icon: Wind },
      { to: "/smart-ops/assets",  label: "Assets",      icon: Cpu },
      { to: "/smart-ops/alerts",  label: "Alerts",      icon: Bell,        badge: "7" },
      { to: "/smart-ops/savings", label: "Savings",     icon: TrendingDown },
    ],
  },

  { type: "divider" },

  // ── Actions & other ──────────────────────────────────────────────────
  { type: "item", to: "/actions",                     label: "Actions",        icon: Lightbulb,   badge: "3",  roles: ["property_sm", "super_admin"] },
  { type: "item", to: "/reports",                     label: "Reports",        icon: FileText,    roles: ["checker", "property_sm", "super_admin"] },
  { type: "item", to: "/certifications",              label: "Certifications", icon: Award,       roles: ["checker", "property_sm", "super_admin"] },
  { type: "item", to: "/marketplace",                 label: "Marketplace",    icon: ShoppingBag, roles: ["property_sm", "super_admin"] },

  { type: "divider" },

  // ── Engagement (collapsible) ─────────────────────────────────────────
  {
    type: "group",
    label: "Engagement",
    icon: Users,
    roles: ["property_sm", "super_admin"],
    items: [
      { to: "/supplier-portal",  label: "Supplier Portal",  icon: Truck },
      { to: "/ai-assistant",     label: "AI Assistant",     icon: Bot,   badge: "BETA" },
      { to: "/guest-engagement", label: "Guest Engagement", icon: Users },
    ],
  },

  { type: "divider" },

  // ── Admin ─────────────────────────────────────────────────────────────
  { type: "item", to: "/billing", label: "Billing",        icon: CreditCard,  roles: ["super_admin"] },
  { type: "item", to: "/admin",   label: "Admin Settings", icon: SettingsIcon, roles: ["super_admin"] },
];
