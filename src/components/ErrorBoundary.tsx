import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="min-h-screen bg-background max-w-md mx-auto flex flex-col items-center justify-center gap-5 px-6 text-center"
      >
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="h-9 w-9 text-destructive" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            An unexpected error occurred. Try reloading the page or returning home.
          </p>
        </div>
        {this.state.error?.message && (
          <pre className="text-[10px] font-mono text-muted-foreground bg-secondary rounded-lg px-3 py-2 max-w-full overflow-x-auto">
            {this.state.error.message}
          </pre>
        )}
        <div className="flex flex-col gap-2 w-full max-w-[260px]">
          <Button onClick={this.handleReload} className="rounded-xl h-11 text-sm font-bold gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
          <Button onClick={this.handleHome} variant="outline" className="rounded-xl h-11 text-sm font-semibold gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
