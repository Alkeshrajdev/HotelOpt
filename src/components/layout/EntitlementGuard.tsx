import { Navigate, useLocation } from "react-router-dom";
import { useAccount } from "@/lib/account";

/**
 * Redirects URLs the current account isn't entitled to reach (typed directly or
 * via a stale link) back to its home. Renders nothing when the path is allowed.
 * Admin/Billing are the platform operator's tools and are never module-gated.
 */
export default function EntitlementGuard() {
  const { account, hasModule } = useAccount();
  const { pathname: p } = useLocation();

  const home =
    account.accountType === "single"
      ? `/properties/${account.singleHotelId}`
      : account.modules.portfolio
      ? "/portfolio/dashboard"
      : "/data-capture";

  let redirect: string | null = null;

  if (account.accountType === "single" && (p === "/" || p.startsWith("/portfolio") || p === "/properties")) {
    redirect = home;
  } else if (account.accountType === "portfolio" && !account.modules.portfolio && (p.startsWith("/portfolio") || p === "/properties")) {
    redirect = home;
  } else if (!hasModule("smartOps") && p.startsWith("/smart-ops")) {
    redirect = home;
  } else if (!hasModule("performance") && p.startsWith("/performance")) {
    redirect = home;
  } else if (!hasModule("actions") && p.startsWith("/actions")) {
    redirect = home;
  } else if (!hasModule("marketplace") && p === "/marketplace") {
    redirect = home;
  } else if (
    !hasModule("engagement") &&
    (p.startsWith("/supplier-portal") || p.startsWith("/ai-assistant") || p.startsWith("/guest-engagement"))
  ) {
    redirect = home;
  }

  return redirect && redirect !== p ? <Navigate to={redirect} replace /> : null;
}
