import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  Volume2,
  VolumeX,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { NotificationItem } from '../types';
import {
  getPushNotificationStatus,
  requestPushPermission,
  sendBrowserNotification,
} from '../utils/notifications';
import { soundEffects } from '../utils/sound';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const [permission, setPermission] = useState(getPushNotificationStatus());
  const [soundEnabled, setSoundEnabled] = useState(true);

  if (!isOpen) return null;

  const handleEnablePush = async () => {
    const res = await requestPushPermission();
    setPermission(res);
    if (res === 'granted') {
      sendBrowserNotification('Push Notifications Activated!', {
        body: "You'll receive real-time alerts for upcoming VinUni assignment deadlines and exam dates.",
      });
    }
  };

  const handleTriggerTestPush = () => {
    if (soundEnabled) {
      soundEffects.playNotificationSound();
    }
    sendBrowserNotification('⚡ Upcoming Midterm Exam: COMP 2030', {
      body: 'Midterm Examination starts in 48 hours (Sept 24 at 08:30) in Main Auditorium 1.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        id="notification-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Drawer Header: Solid VinUni Navy */}
        <div className="p-5 bg-[#0B2545] text-white flex items-center justify-between border-b border-[#134074]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl text-[#D4AF37]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">OneVinUni Push Alerts</h3>
              <p className="text-[11px] text-slate-300">Canvas, Exam & Attendance Notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Push Notification Permission Card */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  permission === 'granted'
                    ? 'bg-emerald-500'
                    : permission === 'denied'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-bold text-slate-800">
                Push Permission: {permission.toUpperCase()}
              </span>
            </div>

            {permission !== 'granted' && (
              <button
                onClick={handleEnablePush}
                className="px-3 py-1.5 bg-[#0B2545] hover:bg-[#134074] text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap"
              >
                Enable Push
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              onClick={handleTriggerTestPush}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0B2545] border border-slate-200 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Send Live Push Test</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1 text-slate-600 font-bold hover:text-slate-900 whitespace-nowrap"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#0B2545]" />
                  <span>Sound ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sound Muted</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notification Actions */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700">
            {notifications.filter((n) => !n.read).length} Unread Alerts
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onMarkAllAsRead}
              className="text-[#0B2545] hover:underline font-bold flex items-center gap-1 whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={onClearAll}
              className="text-slate-500 hover:text-red-600 font-bold flex items-center gap-1 whitespace-nowrap"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No notifications right now</p>
              <p className="text-xs text-slate-400 mt-1">
                You're all caught up with your college deadlines!
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onMarkAsRead(notif.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  !notif.read
                    ? 'bg-slate-50 border-slate-300 shadow-xs'
                    : 'bg-white border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {notif.type === 'exam' ? (
                      <span className="w-2 h-2 rounded-full bg-red-600" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#0B2545]" />
                    )}
                    <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider font-mono">
                      {notif.courseCode || notif.type.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {notif.timestamp}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 mt-1">
                  {notif.title}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {notif.body}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          Push notifications deliver automated reminders 24h and 1h before submission.
        </div>
      </motion.div>
    </div>
  );
};
