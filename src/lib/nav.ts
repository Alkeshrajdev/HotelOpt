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

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  group: "Workspace" | "Insights" | "Reporting" | "Engagement" | "Admin";
  badge?: string;
  /** Match this prefix for active state (e.g. /performance covers all pillar/view sub-routes). */
  matchPrefix?: string;
};

// Sidebar nav. Performance is now a single pillar-first hub with route
// /performance/:pillar/:view. The standalone Own / Genuine / Internal /
// External / Carbon entries have been removed.
export const NAV: NavItem[] = [
  // Workspace
  { to: "/", label: "Dashboard", icon: LayoutDashboard, group: "Workspace" },
  { to: "/data-capture", label: "Data Capture", icon: Database, group: "Workspace" },
  {
    to: "/review-approval",
    label: "Review & Approval",
    icon: ClipboardCheck,
    group: "Workspace",
    badge: "24",
  },
  { to: "/properties", label: "Properties", icon: Building2, group: "Workspace" },

  // Insights — single pillar-first hub
  {
    to: "/performance/energy/overview",
    label: "Performance",
    icon: BarChart3,
    group: "Insights",
    matchPrefix: "/performance",
  },

  // Reporting
  { to: "/reports", label: "Reports & Disclosure", icon: FileText, group: "Reporting" },
  { to: "/certifications", label: "Certifications", icon: Award, group: "Reporting" },

  // Engagement & Action
  { to: "/actions", label: "Actions & Measures", icon: Lightbulb, group: "Engagement", badge: "3" },
  { to: "/supplier-portal", label: "Supplier Portal", icon: Truck, group: "Engagement" },
  { to: "/ai-assistant", label: "AI Assistant", icon: Bot, group: "Engagement", badge: "BETA" },
  { to: "/guest-engagement", label: "Guest Engagement", icon: Users, group: "Engagement" },

  // Admin
  { to: "/marketplace", label: "Marketplace", icon: Store, group: "Admin" },
  { to: "/billing", label: "Billing", icon: CreditCard, group: "Admin" },
  { to: "/admin", label: "Admin", icon: SettingsIcon, group: "Admin" },
];

export const NAV_GROUPS: NavItem["group"][] = [
  "Workspace",
  "Insights",
  "Reporting",
  "Engagement",
  "Admin",
];
