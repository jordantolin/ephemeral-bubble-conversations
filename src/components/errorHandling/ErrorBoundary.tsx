
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#FEF7E4]">
          <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
            <AlertTriangle className="h-16 w-16 text-[#ebbd34] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#ebbd34] mb-4 text-center">Oops! Something went wrong</h2>
            <p className="text-gray-600 mb-6 text-center">
              We encountered an unexpected error. Please try refreshing the page or returning home.
            </p>
            {this.state.error && (
              <div className="bg-red-50 p-4 rounded-md border border-red-200 mb-6 overflow-auto max-h-32">
                <p className="font-mono text-sm text-red-600 break-words">{this.state.error.toString()}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={this.resetErrorBoundary}
                className="bg-[#ebbd34] hover:bg-[#ebbd34]/90 text-white"
              >
                Try Again
              </Button>
              <Button 
                asChild
                variant="outline"
                className="border-[#ebbd34]/30 text-[#ebbd34]"
              >
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
