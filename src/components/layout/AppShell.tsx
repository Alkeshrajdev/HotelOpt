import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import DemoNotice from "@/components/ui/DemoNotice";
import { TopbarProvider } from "@/lib/topbarContext";

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on small viewports so content isn't squeezed
  useEffect(() => {
    const sync = () => {
      if (window.innerWidth < 768) setCollapsed(true);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return (
    <TopbarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#F6F8F7]">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <DemoNotice />
          <main className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 max-w-[1600px] mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TopbarProvider>
  );
}
