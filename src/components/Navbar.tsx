import React from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Clock,
  CheckSquare,
  LayoutGrid,
  Bell,
  Plus,
  Layers,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import { CalendarViewMode } from '../types';

interface NavbarProps {
  currentView: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenAddCourse: () => void;
  isCloudConnected?: boolean;
  userEmail?: string | null;
  onSignInGoogle?: () => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenAddCourse,
  isCloudConnected = true,
  userEmail,
  onSignInGoogle,
  onSignOut,
}) => {
  const navItems: { id: CalendarViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'week', label: 'Week Timetable', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'month', label: 'Month Calendar', icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: 'day', label: 'Day Schedule', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'deadlines', label: 'Deadlines & Exams', icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { id: 'canvas', label: 'Canvas iCal Feed', icon: <GraduationCap className="w-3.5 h-3.5 text-[#D4AF37]" /> },
    { id: 'widgets', label: 'Home Widget', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand & Monogram Crest */}
          <div className="flex items-center gap-3">
            <div
              id="vinuni-brand-badge"
              className="w-10 h-10 rounded-xl bg-[#0B2545] flex items-center justify-center text-white shadow-xs border border-[#134074]"
            >
              <span className="font-extrabold text-sm tracking-tight text-[#D4AF37]">VU</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
                  VinUniversity
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[11px] font-bold bg-[#0B2545] text-white rounded-md">
                  Planner
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 hidden md:flex">
                <span>Fall 2026</span>
                <span>•</span>
                <a
                  href="https://one.vinuni.edu.vn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#0B2545] flex items-center gap-1 font-medium transition-colors text-slate-600"
                >
                  <span>one.vinuni.edu.vn</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Navigation View Switcher with Framer Motion liquid sliding pill */}
          <nav
            id="nav-view-switcher"
            aria-label="Calendar Views"
            className="hidden lg:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200"
          >
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${item.id}-view`}
                  onClick={() => onViewChange(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                    isActive ? 'text-[#0B2545]' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 bg-white rounded-lg shadow-xs border border-slate-200/80 z-0"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Realtime Cloud Sync Status Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isCloudConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={
                isCloudConnected
                  ? 'Connected to Firebase Firestore in real-time'
                  : 'Syncing to Firebase cloud...'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="hidden md:inline">
                {isCloudConnected ? 'Firestore Realtime' : 'Syncing...'}
              </span>
            </div>

            {/* Auth / Account */}
            {userEmail ? (
              <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-700 max-w-[130px] truncate" title={userEmail}>
                  {userEmail}
                </span>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="text-[10px] text-slate-500 hover:text-red-600 font-semibold transition-colors"
                  >
                    Logout
                  </button>
                )}
              </div>
            ) : onSignInGoogle ? (
              <button
                onClick={onSignInGoogle}
                className="hidden md:flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              >
                Sign In
              </button>
            ) : null}

            {/* Push Notifications Bell */}
            <button
              id="btn-open-notifications"
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="Canvas & Academic Deadline Reminders"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Manual Course Add Primary Button */}
            <motion.button
              id="btn-add-course"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenAddCourse}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0B2545] hover:bg-[#134074] rounded-xl shadow-xs transition-all whitespace-nowrap border border-[#134074]"
            >
              <Plus className="w-4 h-4 text-[#D4AF37]" />
              <span>Add Course</span>
            </motion.button>
          </div>
        </div>

        {/* Mobile View Sub-Bar */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-slate-100 gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`px-3 py-1 text-xs font-bold rounded-md whitespace-nowrap ${
                currentView === item.id ? 'bg-[#0B2545] text-white' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
