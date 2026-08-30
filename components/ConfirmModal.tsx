import React from 'react';
import { AlertTriangle, RotateCcw, Check, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    icon?: 'warning' | 'restart' | 'danger';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false,
    icon = 'warning',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                        isDanger 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                        {icon === 'restart' ? (
                            <RotateCcw size={22} className="animate-spin-slow" />
                        ) : (
                            <AlertTriangle size={22} />
                        )}
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">{title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{message}</p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-1.5 ${
                            isDanger 
                                ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/20' 
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/20'
                        }`}
                    >
                        <Check size={14} />
                        <span>{confirmText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
