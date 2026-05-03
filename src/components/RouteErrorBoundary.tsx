import { Component, type ErrorInfo, type ReactNode } from "react";
import LoadError from "@/components/LoadError";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight per-route error boundary used inside <Suspense> to recover
 * from lazy-chunk load failures (offline, deploy-mid-session, etc.) without
 * tearing down the whole app like the top-level ErrorBoundary does.
 */
class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Route failed to load:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    // Hard reload to re-fetch any stale chunk references.
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-background max-w-md mx-auto flex items-center justify-center">
        <LoadError
          title="Couldn't load this page"
          description="We hit a snag loading this page. Check your connection and try again."
          onRetry={this.handleRetry}
        />
      </div>
    );
  }
}

export default RouteErrorBoundary;
