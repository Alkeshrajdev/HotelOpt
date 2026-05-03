import { Navigate, Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import RequireAuth from "./components/RequireAuth";
import Dashboard from "./pages/Dashboard";
import DataCapture from "./pages/DataCapture";
import ReviewApproval from "./pages/ReviewApproval";
import PerformanceShell from "./pages/performance/Shell";
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
        <Route index element={<Dashboard />} />
        <Route path="/data-capture" element={<DataCapture />} />
        <Route path="/review-approval" element={<ReviewApproval />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/:propertyId" element={<PropertyDetail />} />

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

        {/* Backwards-compatible redirects from old top-level routes */}
        <Route
          path="/own-performance"
          element={<Navigate to="/performance/energy/overview" replace />}
        />
        <Route
          path="/genuine-performance"
          element={<Navigate to="/performance/energy/genuine-performance" replace />}
        />
        <Route
          path="/internal-comparison"
          element={<Navigate to="/performance/energy/internal-comparison" replace />}
        />
        <Route
          path="/external-comparison"
          element={<Navigate to="/performance/energy/external-comparison" replace />}
        />
        <Route
          path="/carbon-inventory"
          element={<Navigate to="/performance/carbon/carbon-inventory" replace />}
        />

        <Route path="/reports" element={<Reports />} />
        <Route path="/certifications" element={<Certifications />} />

        <Route path="/actions" element={<Actions />} />
        <Route path="/supplier-portal" element={<SupplierPortal />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/guest-engagement" element={<GuestEngagement />} />

        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/clients"   element={<AdminClients />} />
        <Route path="/admin/ef-library" element={<AdminEFLibrary />} />
        <Route path="/admin/users"      element={<AdminUsers />} />
        <Route path="/admin/pools"      element={<AdminPools />} />
        <Route path="/admin/:section"   element={<AdminStub />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

// Default a bare /performance/:pillar to its overview view.
function PerformanceShellRedirect() {
  // We can't useParams() here without typing — react-router gives us the params
  // via the Navigate's URL composition. Easiest: render PerformanceShell which
  // already redirects to /:pillar/overview when view is missing/invalid.
  return <PerformanceShell />;
}
