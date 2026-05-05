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
  Store,
} from "lucide-react";

// Must match database.types.ts Enums["user_role"] exactly.
export type Role = "maker" | "checker" | "property_sm" | "super_admin";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  group: "Workspace" | "Insights" | "Reporting" | "Engagement" | "Admin";
  badge?: string;
  /** Match this prefix for active state (e.g. /performance covers all pillar/view sub-routes). */
  matchPrefix?: string;
  /** Roles that can see this item. Omit to show to everyone. */
  roles?: Role[];
};

export const NAV: NavItem[] = [
  // Workspace
  { to: "/", label: "Dashboard", icon: LayoutDashboard, group: "Workspace" },
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

  // Insights
  {
    to: "/performance/energy/overview",
    label: "Performance",
    icon: BarChart3,
    group: "Insights",
    matchPrefix: "/performance",
    roles: ["property_sm", "super_admin"],
  },

  // Reporting
  {
    to: "/reports",
    label: "Reports & Disclosure",
    icon: FileText,
    group: "Reporting",
    roles: ["checker", "property_sm", "super_admin"],
  },
  {
    to: "/certifications",
    label: "Certifications",
    icon: Award,
    group: "Reporting",
    roles: ["checker", "property_sm", "super_admin"],
  },

  // Engagement & Action
  {
    to: "/actions",
    label: "Actions",
    icon: Lightbulb,
    group: "Engagement",
    badge: "3",
    roles: ["property_sm", "super_admin"],
  },
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

  // Admin
  { to: "/marketplace", label: "Solutions Hub", icon: Store, group: "Admin", roles: ["super_admin"] },
  { to: "/billing", label: "Billing", icon: CreditCard, group: "Admin", roles: ["super_admin"] },
  { to: "/admin", label: "Admin", icon: SettingsIcon, group: "Admin", roles: ["super_admin"] },
];

export const NAV_GROUPS: NavItem["group"][] = [
  "Workspace",
  "Insights",
  "Reporting",
  "Engagement",
  "Admin",
];
