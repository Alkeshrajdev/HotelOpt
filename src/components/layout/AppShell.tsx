import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { PageSkeleton } from "@/components/ui/Skeleton";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import EntitlementGuard from "./EntitlementGuard";
import { TopbarProvider } from "@/lib/topbarContext";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppShell() {
  // Desktop manual collapse (icon rail). Mobile uses an off-canvas drawer.
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile drawer when the viewport grows to desktop.
  useEffect(() => {
    const sync = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return (
    <ToastProvider>
    <TopbarProvider>
      <EntitlementGuard />
      <div className="flex h-screen w-screen overflow-hidden bg-[#ECEEF3]">
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={() => setCollapsed((c) => !c)}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 py-5 max-w-[1600px] mx-auto">
              {/* Page chunks load here; the shell stays put (see App.tsx). A structured
                  skeleton shows the page's shape while it arrives; a render error or a
                  stale chunk is caught with a way out, and clears on navigation. */}
              <ErrorBoundary resetKey={location.pathname}>
                <Suspense fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </TopbarProvider>
    </ToastProvider>
  );
}
