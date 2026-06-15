import {
  createContext, useContext, useState, useMemo, useCallback, type ReactNode,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Account entitlements — what the platform admin provisions when a paying
// account is activated. Drives which modules the account sees and whether it's
// a single-hotel (property-centric) or portfolio (multi-hotel) experience.
// Persisted to localStorage so the choice survives a refresh, like demo mode.
// ─────────────────────────────────────────────────────────────────────────────

export type ModuleKey =
  | "portfolio" | "smartOps" | "engagement" | "performance" | "marketplace" | "actions";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  portfolio:   "Portfolio",
  smartOps:    "Smart Ops",
  engagement:  "Engagement",
  performance: "Performance",
  marketplace: "Marketplace",
  actions:     "Actions",
};

export const ALL_MODULES: ModuleKey[] = [
  "portfolio", "smartOps", "engagement", "performance", "marketplace", "actions",
];

export type AccountEntitlements = {
  accountType: "single" | "portfolio";
  /** Which property is "the hotel" in single-hotel mode. */
  singleHotelId: string;
  clientName: string;
  modules: Record<ModuleKey, boolean>;
  /** Optional 2nd-layer QC: after the company approver signs off, records go to
   *  a platform-admin review queue. Off = bypass (company approval is final). */
  platformReview: boolean;
};

const DEFAULT: AccountEntitlements = {
  accountType: "portfolio",
  singleHotelId: "p-001", // Skyline Dubai — GP-ready flagship
  clientName: "Acme Hotels",
  modules: { portfolio: true, smartOps: true, engagement: true, performance: true, marketplace: true, actions: true },
  platformReview: false,
};

const KEY = "ho_account";

function load(): AccountEntitlements {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<AccountEntitlements>;
    return { ...DEFAULT, ...p, modules: { ...DEFAULT.modules, ...(p.modules ?? {}) } };
  } catch {
    return DEFAULT;
  }
}

type AccountContextValue = {
  account: AccountEntitlements;
  isPortfolio: boolean;
  /** True only when the module is entitled AND (for portfolio) the account type allows it. */
  hasModule: (m: ModuleKey) => boolean;
  setAccountType: (t: "single" | "portfolio") => void;
  toggleModule: (m: ModuleKey) => void;
  setSingleHotelId: (id: string) => void;
  setPlatformReview: (v: boolean) => void;
  reset: () => void;
};

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountEntitlements>(
    () => (typeof localStorage !== "undefined" ? load() : DEFAULT)
  );

  const persist = useCallback((a: AccountEntitlements) => {
    setAccount(a);
    try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ }
  }, []);

  const value = useMemo<AccountContextValue>(() => ({
    account,
    isPortfolio: account.accountType === "portfolio",
    hasModule: (m) =>
      // Portfolio module only applies to portfolio accounts.
      (m === "portfolio" ? account.accountType === "portfolio" : true) && !!account.modules[m],
    setAccountType: (t) => persist({ ...account, accountType: t }),
    toggleModule: (m) => persist({ ...account, modules: { ...account.modules, [m]: !account.modules[m] } }),
    setSingleHotelId: (id) => persist({ ...account, singleHotelId: id }),
    setPlatformReview: (v) => persist({ ...account, platformReview: v }),
    reset: () => persist(DEFAULT),
  }), [account, persist]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used inside <AccountProvider>");
  return ctx;
}
