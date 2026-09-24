import React from 'react';
import {
  Calendar,
  Clock,
  CheckSquare,
  LayoutGrid,
  Plus,
  Bell,
  GraduationCap,
  Layers,
  User as UserIcon,
} from 'lucide-react';
import { CalendarViewMode } from '../types';

interface NavbarProps {
  currentView: CalendarViewMode;
  onViewChange: (view: CalendarViewMode) => void;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  onOpenAddCourse: () => void;
  onOpenAuthModal?: () => void;
  isCloudConnected?: boolean;
  userEmail?: string | null;
  userPhoto?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  unreadNotificationsCount,
  onOpenNotifications,
  onOpenAddCourse,
  onOpenAuthModal,
  isCloudConnected = true,
  userEmail,
  userPhoto,
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
                  className="hover:text-blue-600 font-medium"
                >
                  myVinUni One
                </a>
              </div>
            </div>
          </div>

          {/* Navigation View Switcher */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onViewChange(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
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

            {/* Account & Full VinUni Mail Button */}
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 transition-all active:scale-95"
                title="Account, Google Sign In & Student Cloud Customization"
              >
                {userPhoto ? (
                  <img
                    src={userPhoto}
                    alt="avatar"
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span className="max-w-[170px] sm:max-w-[210px] truncate font-medium">
                  {userEmail || 'student@vinuni.edu.vn'}
                </span>
              </button>
            )}

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

            {/* Add Course Primary Button */}
            <button
              id="btn-add-course"
              onClick={onOpenAddCourse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0B2545] hover:bg-[#134074] text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Course</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100 no-scrollbar">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#0B2545] text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
