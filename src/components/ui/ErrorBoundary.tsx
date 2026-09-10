import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Change this (e.g. the pathname) to clear a caught error on navigation. */
  resetKey?: string;
};
type State = { error: Error | null };

/**
 * Catches render errors and failed lazy-chunk loads inside the app shell so the
 * sidebar and top bar survive and the user gets a designed way out, instead of a
 * blank screen. Stale chunks (a deploy happened mid-session) get a reload hint.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const staleChunk = /Loading chunk|dynamically imported module|Failed to fetch/i.test(error.message);

    return (
      <div className="min-h-[50vh] grid place-items-center" role="alert">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-bad/10 grid place-items-center text-bad-700 mb-4">
            <AlertTriangle size={20} />
          </div>
          <div className="text-[15px] font-semibold text-ink-900">
            {staleChunk ? "This page couldn't load" : "Something went wrong"}
          </div>
          <div className="text-[13px] text-ink-500 mt-1 leading-snug">
            {staleChunk
              ? "A new version may have been deployed while you were working. Reloading fetches the latest files."
              : "The page hit an unexpected error. Your data is safe — reload, or go back to the dashboard."}
          </div>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              <RefreshCw size={14} /> Reload
            </button>
            <a href="/portfolio/dashboard" className="btn-secondary">Dashboard</a>
          </div>
        </div>
      </div>
    );
  }
}
