import React from 'react';

export const DashboardCardSkeleton: React.FC<{ isDark?: boolean }> = ({ isDark }) => (
  <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between animate-pulse ${
    isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-[#80C7F2]/20 shadow-xs'
  }`}>
    <div className="flex items-center justify-between">
      <div className={`h-3 sm:h-4 w-24 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
      <div className={`w-8 h-8 rounded-xl ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
    </div>
    <div className="mt-4 sm:mt-6 space-y-2">
      <div className={`h-6 sm:h-8 w-16 rounded-lg ${isDark ? 'bg-neutral-700' : 'bg-neutral-300'}`} />
      <div className={`h-3 w-32 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
    </div>
  </div>
);

export const ListSkeletonItem: React.FC<{ isDark?: boolean }> = ({ isDark }) => (
  <div className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border flex items-center justify-between min-w-0 animate-pulse ${
    isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-neutral-50/70 border-neutral-200'
  }`}>
    <div className="flex items-center space-x-3 min-w-0">
      <div className={`w-8 h-8 rounded-full flex-shrink-0 ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
      <div className="space-y-1.5 min-w-0">
        <div className={`h-3.5 w-32 rounded-md ${isDark ? 'bg-neutral-700' : 'bg-neutral-300'}`} />
        <div className={`h-2.5 w-24 rounded-md ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
      </div>
    </div>
    <div className="space-y-1.5 flex-shrink-0 text-right">
      <div className={`h-3.5 w-16 rounded-md ml-auto ${isDark ? 'bg-neutral-700' : 'bg-neutral-300'}`} />
      <div className={`h-2.5 w-10 rounded-md ml-auto ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`} />
    </div>
  </div>
);

export const EmptyStateBanner: React.FC<{ title: string; message: string; icon: React.ReactNode; isDark?: boolean }> = ({ title, message, icon, isDark }) => (
  <div className={`flex flex-col items-center justify-center p-8 rounded-2xl border text-center transition-all ${
    isDark ? 'bg-neutral-900/40 border-neutral-800 text-neutral-400' : 'bg-neutral-50/50 border-neutral-200 text-neutral-500'
  }`}>
    <div className={`p-3 rounded-full mb-3 ${isDark ? 'bg-neutral-800 text-neutral-500' : 'bg-neutral-200 text-neutral-400'}`}>
      {icon}
    </div>
    <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{title}</h3>
    <p className="text-[11px] max-w-[250px] leading-relaxed">{message}</p>
  </div>
);
