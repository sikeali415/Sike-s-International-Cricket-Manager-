import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    override state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        try {
            localStorage.removeItem('cricketManagerSave');
            if (window.indexedDB) {
                window.indexedDB.deleteDatabase('CricketManagerDB');
            }
        } catch (e) {
            console.error("Error clearing save:", e);
        }
        window.location.reload();
    };

    override render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
                        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
                            <AlertTriangle size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Something went wrong</h2>
                            <p className="text-xs text-slate-400 mt-1">
                                An unexpected error occurred while rendering the screen.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-left text-xs font-mono text-red-400 max-h-28 overflow-y-auto">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={this.handleReload}
                                className="py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition-all"
                            >
                                <RefreshCw size={14} />
                                <span>Reload App</span>
                            </button>
                            <button
                                onClick={this.handleReset}
                                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Trash2 size={14} />
                                <span>Reset Save</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
