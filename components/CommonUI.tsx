
import React from 'react';

// --- Shared Icon Library ---
export const Icon = ({ children, className = "h-6 w-6" }: { children?: React.ReactNode, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        {children}
    </svg>
);

export const Icons = {
    Home: () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></Icon>,
    Podium: () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></Icon>,
    ChartPie: () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></Icon>,
    Settings: () => <Icon><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.227l.128-.054a2.25 2.25 0 012.864 2.864l-.054.128c-.22.55-.685 1.02-1.227 1.11l-.442.166a2.25 2.25 0 00-1.942 1.942l-.166.442c-.09.542-.56 1.007-1.11 1.227l-.128.054a2.25 2.25 0 01-2.864-2.864l.054-.128c.22-.55.685-1.02 1.227-1.11l.442-.166a2.25 2.25 0 001.942-1.942l.166-.442zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" /></Icon>,
    Customize: () => <Icon className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.077-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></Icon>,
    PlayMatch: () => <Icon className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" /></Icon>,
    Leagues: () => <Icon className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" /></Icon>,
    News: () => <Icon className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25" /></Icon>,
    Lineups: () => <Icon className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></Icon>,
    Editor: () => <Icon className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82" /></Icon>,
    Transfers: () => <Icon className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5" /></Icon>,
    Compare: () => <Icon className="h-7 w-7"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992" /></Icon>,
    X: ({ className }: { className?: string }) => <Icon className={className || "h-6 w-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></Icon>,
    Check: ({ className }: { className?: string }) => <Icon className={className || "h-6 w-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></Icon>,
};

// --- Shared Styled Components ---
// Fix: children is now optional to prevent TypeScript errors when elements are nested.
export const SlantedContainer = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
    <div className={`relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 skew-x-[-12deg] bg-current opacity-10" />
        <div className="relative z-10">{children}</div>
    </div>
);

// Fix: children is now optional to prevent TypeScript errors when elements are nested.
export const ActionButton = ({ onClick, children, variant = "primary", className = "" }: { onClick: () => void, children?: React.ReactNode, variant?: "primary" | "secondary" | "danger", className?: string }) => {
    const styles = {
        primary: "bg-pink-600 hover:bg-pink-500 text-white",
        secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200",
        danger: "bg-red-600 hover:bg-red-500 text-white"
    };
    return (
        <button onClick={onClick} className={`${styles[variant]} py-3 px-6 rounded-xl font-black italic tracking-tighter uppercase transition-all active:scale-95 shadow-lg ${className}`}>
            {children}
        </button>
    );
};
