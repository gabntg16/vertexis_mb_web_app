import React from 'react';
import { useData } from '../../context/DataContext';
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';

export const BranchCalendar: React.FC = () => {
  const { currentBranch, events, themeMode } = useData();

  if (!currentBranch) return null;

  const branchId = currentBranch.id;
  const isDark = themeMode === 'dark';

  // Events that are general or specific to this branch
  const branchEvents = events.filter((e) => !e.branchId || e.branchId === branchId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight">Branch Calendar & HQ Schedule</h1>
        <p className="text-xs text-neutral-500 font-medium">
          Scheduled commissary batch dispatches, quality audits, and corporate franchise promotions.
        </p>
      </div>

      <div className="space-y-3">
        {branchEvents.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <CalendarIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold">No upcoming schedule items</p>
          </div>
        ) : (
          branchEvents
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((evt) => (
              <div
                key={evt.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="font-extrabold text-sm">{evt.title}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    evt.type === 'task'
                      ? 'bg-[#80C7F2]/20 text-[#1a7bb5] dark:text-[#80C7F2]'
                      : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                  }`}>
                    {evt.type === 'task' ? 'Production Schedule' : 'Franchise Audit'}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">{evt.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-2">
                  <span className="flex items-center space-x-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-[#F37021]" />
                    <span>{new Date(evt.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </span>
                  {evt.branchName && (
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{evt.branchName}</span>
                    </span>
                  )}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
