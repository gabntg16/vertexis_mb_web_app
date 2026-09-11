import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Bell,
  Calendar,
  CheckCircle2,
  CheckCheck,
  ExternalLink,
  MapPin,
  Globe,
  Filter,
  Search,
  X,
  Store,
} from 'lucide-react';
import { NotificationKind } from '../../types';
import { filterNotificationsForUser } from '../../utils/notificationUtils';
import { NotificationBadgeGroup } from '../common/NotificationBadgeGroup';

interface BranchAnnouncementsProps {
  onNavigateTab?: (tab: string) => void;
}

export const BranchAnnouncements: React.FC<BranchAnnouncementsProps> = ({ onNavigateTab }) => {
  const {
    announcements,
    currentBranch,
    currentUser,
    markAnnouncementAsRead,
    markAllAnnouncementsAsRead,
    themeMode,
  } = useData();

  const isDark = themeMode === 'dark';
  const [selectedKind, setSelectedKind] = useState<'all' | NotificationKind>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter notifications specifically targeted to this branch and user role
  const branchTargetedAnnouncements = useMemo(() => {
    return filterNotificationsForUser(announcements, currentUser, currentBranch);
  }, [announcements, currentUser, currentBranch]);

  // Apply category and read filters
  const filteredAnnouncements = useMemo(() => {
    return branchTargetedAnnouncements.filter((ann) => {
      // 1. Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ann.title.toLowerCase().includes(q);
        const matchesMsg = ann.message.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg) return false;
      }

      // 2. Kind filter
      if (selectedKind !== 'all' && ann.kind !== selectedKind) {
        return false;
      }

      // 3. Unread only filter
      if (showUnreadOnly && currentUser) {
        const isRead = ann.readBy?.includes(currentUser.id);
        if (isRead) return false;
      }

      return true;
    });
  }, [branchTargetedAnnouncements, searchQuery, selectedKind, showUnreadOnly, currentUser]);

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return branchTargetedAnnouncements.filter((a) => !a.readBy?.includes(currentUser.id)).length;
  }, [branchTargetedAnnouncements, currentUser]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Branch Bulletins & Incoming Alerts</h1>
          <p className="text-xs text-neutral-500 font-medium mt-1 flex items-center space-x-1.5">
            <Store className="w-3.5 h-3.5 text-[#F37021]" />
            <span>
              Targeted to: <strong>{currentBranch?.name || 'Local Store Branch'}</strong> (and nationwide directives)
            </span>
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAnnouncementsAsRead()}
            className="px-4 py-2 rounded-xl bg-[#80C7F2]/20 border border-[#80C7F2]/40 text-[#1a7bb5] dark:text-[#80C7F2] text-xs font-bold hover:bg-[#80C7F2]/30 transition-all flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div
        className={`p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incoming alerts and bulletins..."
              className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border ${
                isDark
                  ? 'bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Unread Only Toggle */}
          <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer select-none shrink-0">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="rounded text-[#F37021] focus:ring-[#F37021]"
            />
            <span className="text-neutral-700 dark:text-neutral-300">Show Unread Only ({unreadCount})</span>
          </label>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedKind('all')}
            className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
              selectedKind === 'all'
                ? 'bg-[#80C7F2] text-neutral-900 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            All Alerts ({branchTargetedAnnouncements.length})
          </button>
          <button
            onClick={() => setSelectedKind('order')}
            className={`px-3 py-1 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
              selectedKind === 'order'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            📦 Requisitions & Orders
          </button>
          <button
            onClick={() => setSelectedKind('logistics')}
            className={`px-3 py-1 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
              selectedKind === 'logistics'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            🚚 Logistics & Deliveries
          </button>
          <button
            onClick={() => setSelectedKind('inventory')}
            className={`px-3 py-1 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
              selectedKind === 'inventory'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            ⚠️ Stock Warnings
          </button>
          <button
            onClick={() => setSelectedKind('production')}
            className={`px-3 py-1 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
              selectedKind === 'production'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            🏭 Commissary Batches
          </button>
          <button
            onClick={() => setSelectedKind('general')}
            className={`px-3 py-1 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
              selectedKind === 'general'
                ? 'bg-neutral-700 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            📢 Corporate Directives
          </button>
        </div>
      </div>

      {/* Announcements Stream */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div
            className={`p-12 text-center rounded-3xl border ${
              isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <Bell className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold">No announcements found matching your criteria</p>
            <p className="text-xs text-neutral-500 mt-1">
              Check back for incoming replenishment updates or corporate directives.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((ann) => {
            const isRead = currentUser && ann.readBy?.includes(currentUser.id);

            return (
              <div
                key={ann.id}
                className={`p-6 rounded-3xl border transition-all relative ${
                  !isRead
                    ? isDark
                      ? 'bg-[#161616] border-[#80C7F2]/50 shadow-md ring-1 ring-[#80C7F2]/20'
                      : 'bg-white border-[#80C7F2]/60 shadow-md ring-1 ring-[#80C7F2]/20'
                    : isDark
                    ? 'bg-[#161616] border-neutral-800 hover:border-neutral-700'
                    : 'bg-white border-neutral-200/80 shadow-xs'
                }`}
              >
                {/* Specific Kind, Where, and Who Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <NotificationBadgeGroup announcement={ann} compact={false} />

                  <div className="flex items-center space-x-2">
                    {!isRead ? (
                      <button
                        onClick={() => markAnnouncementAsRead(ann.id)}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#F37021]/15 text-[#F37021] hover:bg-[#F37021] hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Acknowledge notification"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mark Read</span>
                      </button>
                    ) : (
                      <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Acknowledged</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Message */}
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-snug">
                  {ann.title}
                </h3>

                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed mt-2 whitespace-pre-line">
                  {ann.message}
                </p>

                {/* Footer with Timestamp, Author, and Action Link */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400 font-medium pt-3 mt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(ann.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(ann.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>

                    <span>
                      From: <strong className="text-neutral-700 dark:text-neutral-300">{ann.authorName || 'HQ Naga Central'}</strong>
                    </span>
                  </div>

                  {ann.actionUrl && onNavigateTab && (
                    <button
                      onClick={() => {
                        markAnnouncementAsRead(ann.id);
                        onNavigateTab(ann.actionUrl!);
                      }}
                      className="font-bold text-[#1a7bb5] dark:text-[#80C7F2] hover:underline flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Jump to Relevant Module</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
