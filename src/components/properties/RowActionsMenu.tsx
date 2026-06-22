import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Edit3,
  FileSearch,
  History,
  MoreHorizontal,
  PowerOff,
  QrCode,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

type Action = {
  key: string;
  icon: any;
  label: string;
  hint?: string;
  destructive?: boolean;
  onClick: () => void;
};

export default function RowActionsMenu({
  propertyId,
  onEdit,
  onAssignUsers,
  onDeactivate,
}: {
  propertyId: string;
  onEdit?: () => void;
  onAssignUsers?: () => void;
  onDeactivate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const actions: Action[] = [
    {
      key: "dashboard",
      icon: BarChart3,
      label: "Open dashboard",
      onClick: () => navigate(`/performance/energy/overview?property=${propertyId}`),
    },
    {
      key: "view",
      icon: FileSearch,
      label: "View configuration",
      onClick: () => navigate(`/properties/${propertyId}`),
    },
    {
      key: "edit",
      icon: Edit3,
      label: "Edit property",
      onClick: () => (onEdit ? onEdit() : navigate(`/properties/${propertyId}?edit=1`)),
    },
    {
      key: "users",
      icon: Users,
      label: "Assign users",
      onClick: () => (onAssignUsers ? onAssignUsers() : navigate(`/properties/${propertyId}?tab=users`)),
    },
    {
      key: "gp",
      icon: Sparkles,
      label: "Configure baseline / GP",
      onClick: () => navigate(`/properties/${propertyId}?tab=configuration`),
    },
    {
      key: "cert",
      icon: ShieldCheck,
      label: "Configure certifications",
      onClick: () => navigate(`/properties/${propertyId}?tab=certifications`),
    },
    {
      key: "qr",
      icon: QrCode,
      label: "Manage QR points",
      onClick: () => navigate(`/properties/${propertyId}?tab=qr`),
    },
    {
      key: "history",
      icon: History,
      label: "View audit history",
      onClick: () => navigate(`/properties/${propertyId}?tab=history`),
    },
    {
      key: "deactivate",
      icon: PowerOff,
      label: "Deactivate property",
      destructive: true,
      hint: "Stops new data submissions; preserves audit trail.",
      onClick: () => onDeactivate?.(),
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-100 text-ink-500"
        aria-label="Property actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 w-72 card overflow-hidden z-20"
        >
          <ul className="py-1">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.key}>
                  <button
                    onClick={() => {
                      a.onClick();
                      setOpen(false);
                    }}
                    className={
                      "w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-ink-50 text-sm " +
                      (a.destructive ? "text-bad" : "text-ink-700")
                    }
                  >
                    <Icon size={14} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium">{a.label}</div>
                      {a.hint && (
                        <div className="text-[11px] text-ink-500 mt-0.5 leading-tight">
                          {a.hint}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// Small wrapper for the page header settings cluster (eg in detail page).
export function ConfigButton({ to }: { to: string }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(to)} className="btn-secondary">
      <Settings size={14} /> Configure
    </button>
  );
}
