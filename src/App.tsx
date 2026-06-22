import { Navigate, Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import RequireAuth from "./components/RequireAuth";
import Dashboard from "./pages/Dashboard";
import PortfolioSetup from "./pages/portfolio/PortfolioSetup";
import PortfolioReports from "./pages/portfolio/PortfolioReports";
import DataCapture from "./pages/DataCapture";
import ReviewApproval from "./pages/ReviewApproval";
import PerformanceShell from "./pages/performance/Shell";
import GenuinePortfolio from "./pages/performance/GenuinePortfolio";
import GhgInventory from "./pages/GhgInventory";
import Reports from "./pages/Reports";
import Certifications from "./pages/Certifications";
import Actions from "./pages/Actions";
import SupplierPortal from "./pages/SupplierPortal";
import AIAssistant from "./pages/AIAssistant";
import GuestEngagement from "./pages/GuestEngagement";
import Properties from "./pages/Properties";
import PropertyDetail from "./pages/PropertyDetail";
import Billing from "./pages/Billing";
import Marketplace from "./pages/Marketplace";
import Admin from "./pages/Admin";
import AdminClients from "./pages/admin/Clients";
import AdminEFLibrary from "./pages/admin/EFLibrary";
import AdminUsers from "./pages/admin/Users";
import AdminPools from "./pages/admin/Pools";
import AdminStub from "./pages/admin/Stub";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Smart Operations
import SmartOpsOverview from "./pages/smart-ops/SmartOpsOverview";
import EnergyManagement from "./pages/smart-ops/EnergyManagement";
import WaterManagement from "./pages/smart-ops/WaterManagement";
import IAQComfort from "./pages/smart-ops/IAQComfort";
import AssetPerformance from "./pages/smart-ops/AssetPerformance";
import AlertsCentre from "./pages/smart-ops/AlertsCentre";
import SavingsVerification from "./pages/smart-ops/SavingsVerification";

export default function App() {
  return (
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
        <Route path="/data-capture" element={<DataCapture />} />
        <Route path="/review-approval" element={<ReviewApproval />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:propertyId" element={<PropertyDetail />} />

        {/* Smart Operations */}
        <Route path="/smart-ops" element={<SmartOpsOverview />} />
        <Route path="/smart-ops/energy" element={<EnergyManagement />} />
        <Route path="/smart-ops/water" element={<WaterManagement />} />
        <Route path="/smart-ops/iaq" element={<IAQComfort />} />
        <Route path="/smart-ops/assets" element={<AssetPerformance />} />
        <Route path="/smart-ops/alerts" element={<AlertsCentre />} />
        <Route path="/smart-ops/savings" element={<SavingsVerification />} />

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
        <Route path="/genuine-performance" element={<GenuinePortfolio />} />
        <Route path="/internal-comparison" element={<Navigate to="/performance/energy/by-property" replace />} />
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
  );
}

function PerformanceShellRedirect() {
  return <PerformanceShell />;
}
