import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import {
  Bell,
  Plus,
  Trash2,
  Calendar,
  Send,
  Filter,
  Search,
  CheckCircle2,
  X,
  MapPin,
  Globe,
  Users,
  Building2,
  ShoppingBag,
  ChefHat,
  Truck,
  Boxes,
  Receipt,
  Megaphone,
  CheckCheck,
} from 'lucide-react';
import {
  NotificationKind,
  NotificationPriority,
  NotificationAudience,
} from '../../types';
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_PRIORITIES,
  AUDIENCE_OPTIONS,
} from '../../utils/notificationUtils';
import { NotificationBadgeGroup } from '../common/NotificationBadgeGroup';

export const AdminAnnouncements: React.FC = () => {
  const {
    announcements,
    branches,
    currentUser,
    addAnnouncement,
    deleteAnnouncement,
    markAllAnnouncementsAsRead,
    themeMode,
  } = useData();

  const [showAddModal, setShowAddModal] = useState(false);

  // Form State for New Targeted Broadcast
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<NotificationKind>('general');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [scopeType, setScopeType] = useState<'nationwide' | 'commissary' | 'branch'>('nationwide');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedAudiences, setSelectedAudiences] = useState<NotificationAudience[]>(['all']);
  const [actionUrl, setActionUrl] = useState('');

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterAudience, setFilterAudience] = useState<string>('all');

  const isDark = themeMode === 'dark';

  // Available kinds array for selection
  const kindList: { key: NotificationKind; label: string; icon: React.ReactNode }[] = [
    { key: 'general', label: 'General Directive', icon: <Megaphone className="w-4 h-4" /> },
    { key: 'order', label: 'Order Requisition', icon: <ShoppingBag className="w-4 h-4" /> },
    { key: 'logistics', label: 'Logistics & Dispatch', icon: <Truck className="w-4 h-4" /> },
    { key: 'production', label: 'Kitchen Production', icon: <ChefHat className="w-4 h-4" /> },
    { key: 'inventory', label: 'Inventory & Stock Alert', icon: <Boxes className="w-4 h-4" /> },
    { key: 'pos', label: 'Retail POS & BIR', icon: <Receipt className="w-4 h-4" /> },
  ];

  // Audience toggle handler
  const handleToggleAudience = (aud: NotificationAudience) => {
    if (aud === 'all') {
      setSelectedAudiences(['all']);
      return;
    }

    let next = selectedAudiences.filter((a) => a !== 'all');
    if (next.includes(aud)) {
      next = next.filter((a) => a !== aud);
    } else {
      next.push(aud);
    }

    if (next.length === 0) {
      setSelectedAudiences(['all']);
    } else {
      setSelectedAudiences(next);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    let targetBranchId: string | undefined = undefined;
    let targetBranchName: string | undefined = undefined;

    if (scopeType === 'commissary') {
      targetBranchId = 'COMMISSARY-NAGA';
      targetBranchName = 'Naga Central Commissary Hub';
    } else if (scopeType === 'branch') {
      targetBranchId = selectedBranchId || branches[0]?.id || 'ALL';
      const b = branches.find((branch) => branch.id === targetBranchId);
      targetBranchName = b ? b.name : undefined;
    } else {
      targetBranchId = 'ALL';
      targetBranchName = 'Nationwide (All 19 Branches)';
    }

    addAnnouncement(title.trim(), message.trim(), {
      kind,
      priority,
      scope: scopeType,
      targetBranchId,
      targetBranchName,
      targetAudience: selectedAudiences,
      actionUrl: actionUrl.trim() ? actionUrl.trim() : undefined,
    });

    // Reset Form
    setShowAddModal(false);
    setTitle('');
    setMessage('');
    setKind('general');
    setPriority('normal');
    setScopeType('nationwide');
    setSelectedBranchId('');
    setSelectedAudiences(['all']);
    setActionUrl('');
  };

  // Filter announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((ann) => {
      // 1. Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ann.title.toLowerCase().includes(q);
        const matchesMsg = ann.message.toLowerCase().includes(q);
        const matchesLoc = ann.targetBranchName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg && !matchesLoc) return false;
      }

      // 2. Kind filter
      if (filterKind !== 'all' && ann.kind !== filterKind) {
        return false;
      }

      // 3. Location filter
      if (filterLocation !== 'all') {
        if (filterLocation === 'nationwide' && ann.targetBranchId !== 'ALL' && ann.scope !== 'nationwide') {
          return false;
        }
        if (filterLocation === 'commissary' && ann.scope !== 'commissary') {
          return false;
        }
        if (
          filterLocation !== 'nationwide' &&
          filterLocation !== 'commissary' &&
          ann.targetBranchId !== filterLocation
        ) {
          return false;
        }
      }

      // 4. Audience filter
      if (filterAudience !== 'all') {
        if (
          ann.targetAudience &&
          ann.targetAudience.length > 0 &&
          !ann.targetAudience.includes('all') &&
          !ann.targetAudience.includes(filterAudience as NotificationAudience)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [announcements, searchQuery, filterKind, filterLocation, filterAudience]);

  return (
    <div className="space-y-6">
      {/* Header & New Broadcast Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center space-x-2">
            <span>Targeted Notifications & Broadcast Center</span>
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-1 max-w-2xl leading-relaxed">
            Configure specific announcements with explicit classification: <strong>What Kind</strong> (Order,
            Logistics, Kitchen, Stock, POS), <strong>Where</strong> (Nationwide, Commissary, or Specific
            Branch), and <strong>Who can see</strong> (Role-based access).
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            onClick={() => markAllAnnouncementsAsRead()}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 ${
              isDark
                ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
            }`}
            title="Mark all notifications as read for current user"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mark All Read</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#F37021] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#d85e15] transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Targeted Broadcast</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200/80 shadow-xs'
          }`}
        >
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Broadcasts</p>
          <p className="text-xl font-black mt-1 text-neutral-900 dark:text-white">
            {announcements.length}
          </p>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200/80 shadow-xs'
          }`}
        >
          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Requisitions & Logistics</p>
          <p className="text-xl font-black mt-1 text-blue-600 dark:text-blue-400">
            {announcements.filter((a) => a.kind === 'order' || a.kind === 'logistics').length}
          </p>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200/80 shadow-xs'
          }`}
        >
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Kitchen & Stock</p>
          <p className="text-xl font-black mt-1 text-amber-600 dark:text-amber-400">
            {announcements.filter((a) => a.kind === 'production' || a.kind === 'inventory').length}
          </p>
        </div>

        <div
          className={`p-3.5 rounded-2xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200/80 shadow-xs'
          }`}
        >
          <p className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">Directives & POS</p>
          <p className="text-xl font-black mt-1 text-purple-600 dark:text-purple-400">
            {announcements.filter((a) => a.kind === 'general' || a.kind === 'pos' || !a.kind).length}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className={`p-4 rounded-2xl border space-y-3 ${
          isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by title, content, or branch name..."
              className={`w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border transition-colors ${
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

          {/* Filter 1: WHAT KIND */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <span className="text-xs font-bold text-neutral-400 whitespace-nowrap">Kind:</span>
            <select
              value={filterKind}
              onChange={(e) => setFilterKind(e.target.value)}
              className={`flex-1 md:w-44 py-2 px-2.5 text-xs font-medium rounded-xl border ${
                isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <option value="all">All Categories</option>
              <option value="order">📦 Order Requisition</option>
              <option value="logistics">🚚 Logistics & Dispatch</option>
              <option value="production">🏭 Kitchen Production</option>
              <option value="inventory">⚠️ Inventory & Stock</option>
              <option value="pos">🧾 Retail POS & BIR</option>
              <option value="general">📢 General Directive</option>
            </select>
          </div>

          {/* Filter 2: WHERE (Location) */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <span className="text-xs font-bold text-neutral-400 whitespace-nowrap">Where:</span>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className={`flex-1 md:w-48 py-2 px-2.5 text-xs font-medium rounded-xl border ${
                isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <option value="all">All Locations</option>
              <option value="nationwide">🌐 Nationwide (All Branches)</option>
              <option value="commissary">🏢 Naga Central Commissary</option>
              <optgroup label="Specific Branch Stores">
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    📍 {b.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Filter 3: WHO (Audience) */}
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <span className="text-xs font-bold text-neutral-400 whitespace-nowrap">Who:</span>
            <select
              value={filterAudience}
              onChange={(e) => setFilterAudience(e.target.value)}
              className={`flex-1 md:w-44 py-2 px-2.5 text-xs font-medium rounded-xl border ${
                isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
              }`}
            >
              <option value="all">All Audiences</option>
              <option value="admin">👑 HQ Admin Only</option>
              <option value="branch_manager">🏪 Branch Managers</option>
              <option value="cashier">🧾 Cashiers & Crew</option>
              <option value="commissary_staff">👨‍🍳 Commissary Kitchen</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(filterKind !== 'all' || filterLocation !== 'all' || filterAudience !== 'all' || searchQuery) && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 dark:border-neutral-800 text-[11px]">
            <span className="text-neutral-500 font-medium">
              Showing <strong>{filteredAnnouncements.length}</strong> of {announcements.length} broadcasts
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterKind('all');
                setFilterLocation('all');
                setFilterAudience('all');
              }}
              className="text-[#1a7bb5] dark:text-[#80C7F2] font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Announcements List */}
      <div className="space-y-3.5">
        {filteredAnnouncements.length === 0 ? (
          <div
            className={`p-12 text-center rounded-3xl border ${
              isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
            }`}
          >
            <Bell className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold">No announcements found matching current filters</p>
            <p className="text-xs text-neutral-500 mt-1">
              Try adjusting your category, location, or audience filters above.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className={`p-5 sm:p-6 rounded-3xl border transition-all relative ${
                isDark
                  ? 'bg-[#161616] border-neutral-800 hover:border-neutral-700'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2.5 flex-1 min-w-0">
                  {/* Categorization Badges: WHAT KIND, WHERE, and WHO */}
                  <NotificationBadgeGroup announcement={ann} compact={false} />

                  {/* Title & Message */}
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-snug">
                    {ann.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {ann.message}
                  </p>

                  {/* Metadata Footer: Author, Date, and Read Counter */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-400 font-medium pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {new Date(ann.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(ann.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>

                    <span>
                      Posted by: <strong className="text-neutral-700 dark:text-neutral-200">{ann.authorName || 'HQ System'}</strong>
                      {ann.authorRole ? ` (${ann.authorRole})` : ''}
                    </span>

                    {ann.readBy && ann.readBy.length > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Read by {ann.readBy.length} staff member{ann.readBy.length > 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => {
                    if (window.confirm('Delete this broadcast notification?')) {
                      deleteAnnouncement(ann.id);
                    }
                  }}
                  className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* Broadcast Creation Modal with Explicit WHAT KIND, WHERE, and WHO Controls */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className={`w-full max-w-xl rounded-3xl p-6 shadow-2xl border my-8 ${
              isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
              <div className="flex items-center space-x-2 text-[#F37021]">
                <Send className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                    Publish Targeted Broadcast
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Define specific category, location scoping, and audience visibility
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 text-xs">
              {/* SECTION 1: WHAT KIND (Category & Priority) */}
              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50/80 border-neutral-200'
                }`}
              >
                <label className="block font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  1. What Kind (Category & Urgency)
                </label>

                {/* Category Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {kindList.map((k) => {
                    const isSelected = kind === k.key;
                    return (
                      <button
                        type="button"
                        key={k.key}
                        onClick={() => setKind(k.key)}
                        className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#80C7F2]/20 border-[#80C7F2] text-[#1a7bb5] dark:text-[#80C7F2] font-bold shadow-xs'
                            : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                        }`}
                      >
                        <span className="shrink-0">{k.icon}</span>
                        <span className="text-[11px] leading-snug">{k.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Priority Selector */}
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Urgency Level:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['normal', 'info', 'warning', 'urgent', 'success'] as NotificationPriority[]).map((p) => {
                      const meta = NOTIFICATION_PRIORITIES[p];
                      const isSelected = priority === p;
                      return (
                        <button
                          type="button"
                          key={p}
                          onClick={() => setPriority(p)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#F37021] bg-[#F37021] text-white shadow-xs'
                              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 2: WHERE (Location Scoping) */}
              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50/80 border-neutral-200'
                }`}
              >
                <label className="block font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  2. Where (Location & Branch Scope)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScopeType('nationwide')}
                    className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                      scopeType === 'nationwide'
                        ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-purple-500 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold">Nationwide</p>
                      <p className="text-[9.5px] text-neutral-400">All 19 Branches</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScopeType('commissary')}
                    className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                      scopeType === 'commissary'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold">Commissary Hub</p>
                      <p className="text-[9.5px] text-neutral-400">Naga HQ Kitchen</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScopeType('branch')}
                    className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                      scopeType === 'branch'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold">Specific Branch</p>
                      <p className="text-[9.5px] text-neutral-400">Select store below</p>
                    </div>
                  </button>
                </div>

                {scopeType === 'branch' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
                      Choose Target Branch Store:
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border ${
                        isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-200'
                      }`}
                    >
                      <option value="">-- Select One of 19 Branches --</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.city || 'Regional Store'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* SECTION 3: WHO CAN SEE (Audience Controls) */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50/80 border-neutral-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <label className="block font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    3. Who Can See (Role-Based Audience)
                  </label>
                  <span className="text-[10px] text-neutral-400">Select all that apply</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AUDIENCE_OPTIONS.map((aud) => {
                    const isChecked = selectedAudiences.includes(aud.key);
                    return (
                      <button
                        type="button"
                        key={aud.key}
                        onClick={() => handleToggleAudience(aud.key)}
                        className={`p-2 rounded-xl border text-left flex items-start space-x-2 transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-[#80C7F2]/15 border-[#80C7F2] text-neutral-900 dark:text-white font-semibold'
                            : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-[#F37021] focus:ring-[#F37021]"
                        />
                        <div>
                          <p className="text-[11px] font-bold leading-tight">{aud.label}</p>
                          <p className="text-[9.5px] text-neutral-400 leading-snug">{aud.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: Subject & Message Body */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Subject / Headline
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. [Restock Notice] Naga Kitchen Fresh Vanilla Batch Completed"
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Broadcast Details & Instructions
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type detailed workflow instructions, arrival timelines, or guidelines..."
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Direct Workflow Tab (Optional)
                  </label>
                  <select
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    className={`w-full p-2 rounded-xl border ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <option value="">No Direct Tab Link</option>
                    <option value="orders">Orders & Approvals (Requisitions)</option>
                    <option value="logistics">Logistics & Deliveries (Fleet)</option>
                    <option value="production">Kitchen Production (Kettles & Batches)</option>
                    <option value="branches">Branch Management & Inventories</option>
                    <option value="sales">Sales & BIR Reports</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold rounded-xl bg-[#F37021] text-white hover:bg-[#d85e15] shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
