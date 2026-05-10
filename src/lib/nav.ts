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
} from "lucide-react";

// Must match database.types.ts Enums["user_role"] exactly.
export type Role = "maker" | "checker" | "property_sm" | "super_admin";

export type NavGroup =
  | "Portfolio"
  | "Workspace"
  | "Smart Operations"
  | "Sustainability Performance"
  | "Action & Improvement"
  | "Reporting"
  | "Engagement"
  | "Admin";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  badge?: string;
  /** Match this prefix for active state. */
  matchPrefix?: string;
  /** Roles that can see this item. Omit to show to everyone. */
  roles?: Role[];
};

export const NAV: NavItem[] = [
  // ── Portfolio ────────────────────────────────────────────────────────
  {
    to: "/portfolio/dashboard",
    label: "Portfolio Dashboard",
    icon: LayoutDashboard,
    group: "Portfolio",
    matchPrefix: "/portfolio/dashboard",
    roles: ["super_admin"],
  },
  {
    to: "/portfolio/setup",
    label: "Portfolio Setup",
    icon: SettingsIcon,
    group: "Portfolio",
    matchPrefix: "/portfolio/setup",
    roles: ["super_admin"],
  },
  {
    to: "/portfolio/reports-certifications",
    label: "Portfolio Reports & Certifications",
    icon: FileText,
    group: "Portfolio",
    matchPrefix: "/portfolio/reports-certifications",
    roles: ["super_admin"],
  },

  // ── Workspace ────────────────────────────────────────────────────────
  {
    to: "/data-capture",
    label: "Data Capture",
    icon: Database,
    group: "Workspace",
    roles: ["maker", "property_sm", "super_admin"],
  },
  {
    to: "/review-approval",
    label: "Review & Approval",
    icon: ClipboardCheck,
    group: "Workspace",
    badge: "24",
    roles: ["maker", "checker", "property_sm", "super_admin"],
  },
  {
    to: "/properties",
    label: "Properties",
    icon: Building2,
    group: "Workspace",
    roles: ["property_sm", "super_admin"],
  },

  // ── Smart Operations ─────────────────────────────────────────────────
  {
    to: "/smart-ops",
    label: "Smart Ops Overview",
    icon: Activity,
    group: "Smart Operations",
    matchPrefix: "/smart-ops",
    roles: ["property_sm", "super_admin"],
  },
  {
    to: "/smart-ops/energy",
    label: "Energy Management",
    icon: Zap,
    group: "Smart Operations",
    roles: ["property_sm", "super_admin"],
  },
  {
    to: "/smart-ops/water",
    label: "Water Management",
    icon: Droplets,
    group: "Smart Operations",
    roles: ["property_sm", "super_admin"],
  },
  {
    to: "/smart-ops/iaq",
    label: "IAQ & Comfort",
    icon: Wind,
    group: "Smart Operations",
    roles: ["property_sm", "super_admin"],
  },
  {
    to: "/smart-ops/assets",
    label: "Asset Performance",
    icon: Cpu,
    group: "Smart Operations",
    roles: ["property_sm", "super_admin"],
  },
  {
    to: "/smart-ops/alerts",
    label: "Alerts Centre",
    icon: Bell,
    group: "Smart Operations",
    badge: "7",
    roles: ["property_sm", "super_admin"],
  },
  {
    to: "/smart-ops/savings",
    label: "Savings Verification",
    icon: TrendingDown,
    group: "Smart Operations",
    roles: ["property_sm", "super_admin"],
  },

  // ── Sustainability Performance ────────────────────────────────────────
  {
    to: "/performance/energy/overview",
    label: "Performance",
    icon: BarChart3,
    group: "Sustainability Performance",
    matchPrefix: "/performance",
    roles: ["property_sm", "super_admin"],
  },

  // ── Action & Improvement ─────────────────────────────────────────────
  {
    to: "/actions",
    label: "Actions",
    icon: Lightbulb,
    group: "Action & Improvement",
    badge: "3",
    roles: ["property_sm", "super_admin"],
  },
  {
    to: "/marketplace",
    label: "Marketplace",
    icon: ShoppingBag,
    group: "Action & Improvement",
    roles: ["property_sm", "super_admin"],
  },

  // ── Reporting ─────────────────────────────────────────────────────────
  {
    to: "/reports",
    label: "Hotel Reports",
    icon: FileText,
    group: "Reporting",
    roles: ["checker", "property_sm", "super_admin"],
  },
  {
    to: "/certifications",
    label: "Hotel Certifications",
    icon: Award,
    group: "Reporting",
    roles: ["checker", "property_sm", "super_admin"],
  },

  // ── Engagement ────────────────────────────────────────────────────────
  {
    to: "/supplier-portal",
    label: "Supplier Portal",
    icon: Truck,
    group: "Engagement",
    roles: ["property_sm", "super_admin"],
  },
  {
    to: "/ai-assistant",
    label: "AI Assistant",
    icon: Bot,
    group: "Engagement",
    badge: "BETA",
    roles: ["property_sm", "super_admin"],
  },
  {
    to: "/guest-engagement",
    label: "Guest Engagement",
    icon: Users,
    group: "Engagement",
    roles: ["property_sm", "super_admin"],
  },

  // ── Admin ─────────────────────────────────────────────────────────────
  { to: "/billing", label: "Billing", icon: CreditCard, group: "Admin", roles: ["super_admin"] },
  { to: "/admin", label: "Admin", icon: SettingsIcon, group: "Admin", roles: ["super_admin"] },
];

export const NAV_GROUPS: NavGroup[] = [
  "Portfolio",
  "Workspace",
  "Smart Operations",
  "Sustainability Performance",
  "Action & Improvement",
  "Reporting",
  "Engagement",
  "Admin",
];
