import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { CalendarEventType } from '../../types';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Clock,
  MapPin,
  CheckCircle,
  Tag,
} from 'lucide-react';

export const AdminCalendar: React.FC = () => {
  const { events, addEvent, deleteEvent, branches, themeMode } = useData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CalendarEventType>('task');
  const [branchId, setBranchId] = useState('');

  const isDark = themeMode === 'dark';

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    const branch = branches.find((b) => b.id === branchId);
    addEvent(
      title.trim(),
      date,
      description.trim(),
      type,
      branch ? branch.id : undefined,
      branch ? branch.name : undefined
    );
    setShowAddModal(false);
    setTitle('');
    setDescription('');
    setBranchId('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Production & Franchise Calendar</h1>
          <p className="text-xs text-neutral-500 font-medium">
            Schedule commissary batch production runs, branch inspections, and inventory audits.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#F37021] text-white text-xs sm:text-sm font-bold shadow-md hover:bg-[#d85e15] transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Event / Task</span>
        </button>
      </div>

      {/* Events Timeline */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border ${
            isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200'
          }`}>
            <CalendarIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold">No upcoming events scheduled</p>
          </div>
        ) : (
          events
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((evt) => (
              <div
                key={evt.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isDark ? 'bg-[#161616] border-neutral-800' : 'bg-white border-neutral-200 shadow-xs'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-extrabold text-sm">{evt.title}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      evt.type === 'task'
                        ? 'bg-[#80C7F2]/20 text-[#1a7bb5] dark:text-[#80C7F2]'
                        : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                    }`}>
                      {evt.type === 'task' ? 'Production Task' : 'Branch Audit'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-300">{evt.description}</p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 pt-1">
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

                <button
                  onClick={() => deleteEvent(evt.id)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors self-end sm:self-auto"
                  title="Remove event"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border ${
            isDark ? 'bg-[#1c1c1c] border-neutral-700 text-white' : 'bg-white border-neutral-200 text-neutral-900'
          }`}>
            <h3 className="text-base font-bold">Schedule Calendar Event</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Add production schedules or franchise appointments.
            </p>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Batch Run: Oreo Cookies & Strawberry Cheesecake"
                  className={`w-full p-2.5 rounded-xl border ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Event Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as CalendarEventType)}
                    className={`w-full p-2.5 rounded-xl border font-semibold ${
                      isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <option value="task">Production Task</option>
                    <option value="appointment">Branch Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Associated Branch (Optional)
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <option value="">All Branches / Central HQ</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-neutral-400 mb-1">
                  Description & Details
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task goals, quantity targets, inspector names..."
                  className={`w-full p-2.5 rounded-xl border ${
                    isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-neutral-50 border-neutral-200'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 font-medium rounded-xl border border-neutral-300 dark:border-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold rounded-xl bg-[#F37021] text-white hover:bg-[#d85e15]"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
