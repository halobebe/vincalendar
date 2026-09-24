import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogIn,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Cloud,
  Loader2,
  X,
  ExternalLink,
  Shield,
  KeyRound,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSignInGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onCustomAccountSwitch: (customIdentifier: string) => void;
  authError?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignInGoogle,
  onSignOut,
  onCustomAccountSwitch,
  authError,
}) => {
  const [customStudentId, setCustomStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleClick = async () => {
    setIsLoading(true);
    setInternalError(null);
    try {
      await onSignInGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google Sign in error:', err);
      setInternalError(
        err?.message || 'Google sign in was canceled or not authorized on this domain.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customStudentId.trim();
    if (!clean) return;
    setIsLoading(true);
    try {
      onCustomAccountSwitch(clean);
      onClose();
    } catch (err: any) {
      setInternalError(err?.message || 'Failed to switch profile');
    } finally {
      setIsLoading(false);
    }
  };

  const isGuest = currentUser?.isAnonymous || !currentUser?.email;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0B2545] to-[#134074] p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3 backdrop-blur-sm border border-white/20">
              <Cloud className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h3 className="text-xl font-bold tracking-tight">Student Cloud Sync & Account</h3>
            <p className="text-xs text-blue-100/80 mt-1">
              Save your timetable, Canvas courses, and assignment deadlines permanently to your own account.
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Current status banner */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  !isGuest ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="avatar"
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {!isGuest ? 'Authenticated Account' : 'Guest / Private Session'}
                  </span>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      !isGuest ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />
                </div>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {currentUser?.email || 'Guest Student'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  UID: <code className="font-mono">{currentUser?.uid.slice(0, 14)}...</code>
                </p>
              </div>
            </div>

            {/* Error message */}
            {(authError || internalError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{authError || internalError}</span>
              </div>
            )}

            {/* Option 1: Google One-Click Login */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Sign in with Google
              </label>
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm rounded-xl border border-slate-300 shadow-sm transition-all hover:border-slate-400 active:scale-[0.99] disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Continue with VinUni or Personal Google</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                Supports student <code className="text-slate-600 font-semibold">@vinuni.edu.vn</code> or any personal Google accounts.
              </p>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase">
                Or Customize By Student ID
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Option 2: Custom Student ID Switcher (Guaranteed to work regardless of browser popup blockers) */}
            <form onSubmit={handleCustomSwitch} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Switch to Your University ID / Workspace
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g. 26an.ntt or student_john"
                      value={customStudentId}
                      onChange={(e) => setCustomStudentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!customStudentId.trim() || isLoading}
                    className="px-4 py-2.5 bg-[#0B2545] hover:bg-[#134074] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    Load Workspace
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Each student ID gets an isolated cloud database with their own schedule, Canvas reminders, and GPA tracker.
                </p>
              </div>
            </form>

            {/* Sign out button */}
            {!isGuest && (
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    await onSignOut();
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out from Google
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
