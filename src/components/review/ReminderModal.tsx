import { useState } from "react";
import { AlertTriangle, CheckCircle2, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReminderGroup = {
  responsible: { name: string; email: string; role: string };
  items: { dataType: string; months: string[] }[];
};

/** Reusable data-chase composer: pick a responsible contact, edit the email body,
 *  send. Used by ReviewApproval Capture Status and the property Data Readiness tab. */
export default function ReminderModal({
  property,
  groups,
  onClose,
  intro = "We noticed the following data entries are still missing",
}: {
  property: string;
  groups: ReminderGroup[];
  onClose: () => void;
  /** Lead sentence — tweak for "missing" vs "anomaly to confirm" flows. */
  intro?: string;
}) {
  const [sent, setSent] = useState(false);
  const [bodies, setBodies] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of groups) {
      const lines = g.items.map((i) => `  • ${i.dataType} — ${i.months.join(", ")}`).join("\n");
      init[g.responsible.email] =
        `Hi ${g.responsible.name.split(" ")[0]},\n\n${intro} for ${property}:\n\n${lines}\n\nCould you please submit or clarify these by end of week?\n\nThank you,\nSustainability Team`;
    }
    return init;
  });
  const [activeEmail, setActiveEmail] = useState(groups[0]?.responsible.email ?? "");

  if (sent) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-pop max-w-sm w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-good/10 grid place-items-center mx-auto">
            <CheckCircle2 size={22} className="text-good" />
          </div>
          <div>
            <h3 className="font-bold text-ink-900 text-base">Reminders sent</h3>
            <p className="text-[13px] text-ink-500 mt-1">{groups.length} email{groups.length > 1 ? "s" : ""} dispatched to responsible contacts.</p>
          </div>
          <button onClick={onClose} className="btn-primary w-full">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-pop max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200 shrink-0">
          <div>
            <h3 className="font-bold text-ink-900 text-base">Send data reminders</h3>
            <p className="text-[12px] text-ink-500 mt-0.5">{groups.length} responsible contact{groups.length > 1 ? "s" : ""} · {property}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 grid place-items-center rounded-lg hover:bg-ink-100"><X size={14} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: person list */}
          <div className="w-48 shrink-0 border-r border-ink-200 overflow-y-auto">
            {groups.map((g) => (
              <button
                key={g.responsible.email}
                onClick={() => setActiveEmail(g.responsible.email)}
                className={cn(
                  "w-full text-left px-3 py-3 border-b border-ink-100 transition-colors",
                  activeEmail === g.responsible.email ? "bg-brand-50" : "hover:bg-ink-50"
                )}
              >
                <div className="text-[12px] font-semibold text-ink-900 truncate">{g.responsible.name}</div>
                <div className="text-[11px] text-ink-500 truncate">{g.responsible.role}</div>
                <div className="text-[11px] text-ink-400 truncate mt-0.5">{g.items.length} item{g.items.length > 1 ? "s" : ""}</div>
              </button>
            ))}
          </div>

          {/* Right: email editor */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
            {(() => {
              const g = groups.find((x) => x.responsible.email === activeEmail);
              if (!g) return null;
              return (
                <>
                  <div className="flex items-center gap-2 text-[12px] text-ink-600">
                    <Mail size={13} className="text-ink-400" />
                    <span className="font-medium">{g.responsible.email}</span>
                    <span className="ml-auto text-ink-400">{g.items.length} item{g.items.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="rounded-xl border border-ink-200 bg-ink-50 px-3 py-2">
                    <div className="text-[11px] font-semibold text-ink-500 mb-1">Items</div>
                    <ul className="space-y-1">
                      {g.items.map((item) => (
                        <li key={item.dataType} className="text-[12px] text-ink-700 flex items-center gap-2">
                          <AlertTriangle size={10} className="text-bad shrink-0" />
                          <span className="font-medium">{item.dataType}</span>
                          <span className="text-ink-400">— {item.months.join(", ")}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <textarea
                    className="input flex-1 min-h-[180px] py-2 font-mono text-[12px] resize-none"
                    value={bodies[activeEmail]}
                    onChange={(e) => setBodies((b) => ({ ...b, [activeEmail]: e.target.value }))}
                  />
                </>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-ink-200 shrink-0">
          <span className="text-[12px] text-ink-500">{groups.length} email{groups.length > 1 ? "s" : ""} will be sent</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => setSent(true)} className="btn-primary">
              <Mail size={14} /> Send reminders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
