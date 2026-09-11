import React from 'react';
import {
  ShoppingBag,
  ChefHat,
  Truck,
  Boxes,
  Receipt,
  Megaphone,
  MapPin,
  Globe,
  Building2,
  Users,
  Sparkles,
} from 'lucide-react';
import { Announcement } from '../../types';
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_PRIORITIES,
  getLocationDisplay,
  getAudienceDisplay,
} from '../../utils/notificationUtils';

interface NotificationBadgeGroupProps {
  announcement: Announcement;
  compact?: boolean;
}

export const NotificationBadgeGroup: React.FC<NotificationBadgeGroupProps> = ({
  announcement,
  compact = false,
}) => {
  const kindMeta = announcement.kind ? NOTIFICATION_KINDS[announcement.kind] : NOTIFICATION_KINDS.general;
  const priorityMeta = announcement.priority
    ? NOTIFICATION_PRIORITIES[announcement.priority]
    : NOTIFICATION_PRIORITIES.normal;
  const location = getLocationDisplay(announcement);
  const audienceText = getAudienceDisplay(announcement);

  // Icon mapping
  const renderKindIcon = () => {
    const className = compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0';
    switch (announcement.kind) {
      case 'order':
        return <ShoppingBag className={className} />;
      case 'production':
        return <ChefHat className={className} />;
      case 'logistics':
        return <Truck className={className} />;
      case 'inventory':
        return <Boxes className={className} />;
      case 'pos':
        return <Receipt className={className} />;
      case 'general':
      default:
        return <Megaphone className={className} />;
    }
  };

  const renderLocationIcon = () => {
    const className = compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0';
    if (location.isNationwide) return <Globe className={className} />;
    if (location.isCommissary) return <Building2 className={className} />;
    return <MapPin className={className} />;
  };

  const textSize = compact ? 'text-[9.5px]' : 'text-[11px]';
  const padding = compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${textSize}`}>
      {/* 1. WHAT KIND */}
      <span
        className={`inline-flex items-center space-x-1 font-semibold rounded-md border ${padding} ${kindMeta.bgLight} ${kindMeta.textLight} dark:${kindMeta.bgDark} dark:${kindMeta.textDark} ${kindMeta.borderColor}`}
        title={`Category: ${kindMeta.description}`}
      >
        {renderKindIcon()}
        <span>{kindMeta.label}</span>
      </span>

      {/* Urgency / Priority Tag (if not normal) */}
      {announcement.priority && announcement.priority !== 'normal' && (
        <span
          className={`inline-flex items-center space-x-1 font-bold rounded-md ${padding} ${priorityMeta.badgeClass}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dotClass}`} />
          <span>{priorityMeta.label}</span>
        </span>
      )}

      {/* 2. WHERE */}
      <span
        className={`inline-flex items-center space-x-1 font-medium rounded-md border ${padding} ${
          location.isNationwide
            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
            : location.isCommissary
            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        }`}
        title={`Location Scope: ${location.label}`}
      >
        {renderLocationIcon()}
        <span className="truncate max-w-[170px]">{location.label}</span>
      </span>

      {/* 3. WHO CAN SEE */}
      <span
        className={`inline-flex items-center space-x-1 font-medium rounded-md border ${padding} bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700`}
        title={`Target Audience: ${audienceText}`}
      >
        <Users className={compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'} />
        <span className="truncate max-w-[140px]">{audienceText}</span>
      </span>
    </div>
  );
};
