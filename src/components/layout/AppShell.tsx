import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import EntitlementGuard from "./EntitlementGuard";
import DemoNotice from "@/components/ui/DemoNotice";
import { TopbarProvider } from "@/lib/topbarContext";

export default function AppShell() {
  // Desktop manual collapse (icon rail). Mobile uses an off-canvas drawer.
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
    <TopbarProvider>
      <EntitlementGuard />
      <div className="flex h-screen w-screen overflow-hidden bg-[#F6F8F7]">
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
          <DemoNotice />
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 py-5 max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TopbarProvider>
  );
}
