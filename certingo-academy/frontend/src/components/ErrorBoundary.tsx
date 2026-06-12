"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-10 text-white">
          <div className="max-w-md w-full bg-white/5 border border-white/10 p-10 rounded-[2.5rem] text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-500/10">
               <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4 tracking-tight">System Exception</h1>
            <p className="text-white/40 text-sm mb-10 leading-relaxed font-medium">
              We encountered an unexpected technical issue. Our telemetry team has been notified.
            </p>
            <div className="space-y-3">
               <button
                 onClick={() => window.location.reload()}
                 className="w-full bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:scale-[1.02] transition-all"
               >
                 <RefreshCw className="w-4 h-4" />
                 <span>Restart Application</span>
               </button>
               <button
                 onClick={() => window.location.href = '/'}
                 className="w-full bg-white/5 text-white/60 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-white/10 transition-all"
               >
                 <Home className="w-4 h-4" />
                 <span>Return to Safety</span>
               </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
