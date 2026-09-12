import { Suspense, lazy } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import RequireAuth from "./components/RequireAuth";
import RouteFallback from "./components/ui/RouteFallback";
// The first screen and the shell stay in the main bundle so they paint immediately.
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Route-level code splitting: every page is its own chunk, fetched on first visit.
// The Suspense boundary inside AppShell keeps the sidebar/top bar in place while
// a page chunk loads, so navigation never flashes to a blank screen.
const Dashboard           = lazy(() => import("./pages/Dashboard"));
const PortfolioSetup      = lazy(() => import("./pages/portfolio/PortfolioSetup"));
const PortfolioReports    = lazy(() => import("./pages/portfolio/PortfolioReports"));
const DataCapture         = lazy(() => import("./pages/DataCapture"));
const ReviewApproval      = lazy(() => import("./pages/ReviewApproval"));
const PerformanceShell    = lazy(() => import("./pages/performance/Shell"));
const PortfolioCompare    = lazy(() => import("./pages/portfolio/Compare"));
const GhgInventory        = lazy(() => import("./pages/GhgInventory"));
const Reports             = lazy(() => import("./pages/Reports"));
const Certifications      = lazy(() => import("./pages/Certifications"));
const Actions             = lazy(() => import("./pages/Actions"));
const SupplierPortal      = lazy(() => import("./pages/SupplierPortal"));
const AIAssistant         = lazy(() => import("./pages/AIAssistant"));
const GuestEngagement     = lazy(() => import("./pages/GuestEngagement"));
const Properties          = lazy(() => import("./pages/Properties"));
const PropertyDetail      = lazy(() => import("./pages/PropertyDetail"));
const Billing             = lazy(() => import("./pages/Billing"));
const Marketplace         = lazy(() => import("./pages/Marketplace"));
const Admin               = lazy(() => import("./pages/Admin"));
const AdminClients        = lazy(() => import("./pages/admin/Clients"));
const AdminEFLibrary      = lazy(() => import("./pages/admin/EFLibrary"));
const AdminUsers          = lazy(() => import("./pages/admin/Users"));
const AdminPools          = lazy(() => import("./pages/admin/Pools"));
const AdminStub           = lazy(() => import("./pages/admin/Stub"));

// Smart Operations
const SmartOpsOverview    = lazy(() => import("./pages/smart-ops/SmartOpsOverview"));
const SmartOpsMeters      = lazy(() => import("./pages/smart-ops/Meters"));
const SmartOpsEndUses     = lazy(() => import("./pages/smart-ops/EndUses"));
const SmartOpsAssets      = lazy(() => import("./pages/smart-ops/Assets"));
const AlertsCentre        = lazy(() => import("./pages/smart-ops/AlertsCentre"));
const SmartOpsVerification = lazy(() => import("./pages/smart-ops/Verification"));

export default function App() {
  return (
    <Suspense fallback={<RouteFallback full />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/portfolio/dashboard" replace />} />
          <Route path="/portfolio/dashboard" element={<Dashboard />} />
          <Route path="/portfolio/setup" element={<PortfolioSetup />} />
          <Route path="/portfolio/reports-certifications" element={<PortfolioReports />} />
          <Route path="/portfolio/compare" element={<PortfolioCompare />} />
          <Route path="/data-capture" element={<DataCapture />} />
          <Route path="/review-approval" element={<ReviewApproval />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/:propertyId" element={<PropertyDetail />} />

          {/* Smart Operations */}
          <Route path="/smart-ops" element={<SmartOpsOverview />} />
          <Route path="/smart-ops/meters" element={<SmartOpsMeters />} />
          <Route path="/smart-ops/end-uses" element={<SmartOpsEndUses />} />
          <Route path="/smart-ops/assets" element={<SmartOpsAssets />} />
          <Route path="/smart-ops/alerts" element={<AlertsCentre />} />
          <Route path="/smart-ops/verification" element={<SmartOpsVerification />} />
          <Route path="/smart-ops/energy" element={<Navigate to="/smart-ops/end-uses" replace />} />
          <Route path="/smart-ops/water" element={<Navigate to="/smart-ops/end-uses" replace />} />
          <Route path="/smart-ops/iaq" element={<Navigate to="/smart-ops" replace />} />
          <Route path="/smart-ops/savings" element={<Navigate to="/smart-ops/verification" replace />} />

          {/* Performance — pillar-first hub */}
          <Route
            path="/performance"
            element={<Navigate to="/performance/energy/overview" replace />}
          />
          <Route
            path="/performance/:pillar"
            element={<PerformanceShellRedirect />}
          />
          <Route
            path="/performance/:pillar/:view"
            element={<PerformanceShell />}
          />

          {/* Backwards-compatible redirects */}
          <Route path="/own-performance" element={<Navigate to="/performance/energy/overview" replace />} />
          <Route path="/genuine-performance" element={<Navigate to="/portfolio/compare" replace />} />
          <Route path="/internal-comparison" element={<Navigate to="/portfolio/compare" replace />} />
          <Route path="/external-comparison" element={<Navigate to="/performance/energy/external-comparison" replace />} />
          <Route path="/carbon-inventory" element={<Navigate to="/performance/carbon/carbon-inventory" replace />} />

          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/ghg-inventory" element={<GhgInventory />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/actions" element={<Actions />} />
          <Route path="/supplier-portal" element={<SupplierPortal />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/guest-engagement" element={<GuestEngagement />} />

          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/clients"    element={<AdminClients />} />
          <Route path="/admin/ef-library" element={<AdminEFLibrary />} />
          <Route path="/admin/users"      element={<AdminUsers />} />
          <Route path="/admin/pools"      element={<AdminPools />} />
          <Route path="/admin/:section"   element={<AdminStub />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function PerformanceShellRedirect() {
  return <PerformanceShell />;
}
