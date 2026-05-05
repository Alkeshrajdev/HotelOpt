import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { TopbarProvider } from "@/lib/topbarContext";
import { SUPABASE_CONFIGURED } from "@/lib/supabase";

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
          {!SUPABASE_CONFIGURED && (
            <div className="shrink-0 flex items-center gap-2 px-5 py-1.5 bg-amber-50 border-b border-amber-200 text-[11px] font-semibold text-amber-800">
              <FlaskConical size={12} className="shrink-0 text-amber-500" />
              Demo environment — sample data only · Not connected to live client records
            </div>
          )}
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
