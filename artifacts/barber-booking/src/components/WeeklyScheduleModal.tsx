import { useState } from "react";
import { Calendar, X, Check } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Props {
  currentOpenDays: number[];
  onSave: (days: number[]) => void;
  onClose: () => void;
  isSaving?: boolean;
}

export default function WeeklyScheduleModal({ currentOpenDays, onSave, onClose, isSaving }: Props) {
  const [openDays, setOpenDays] = useState<Set<number>>(new Set(currentOpenDays));

  const toggle = (day: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const allOpen = openDays.size === 7;
  const toggleAll = () => {
    if (allOpen) setOpenDays(new Set());
    else setOpenDays(new Set([0, 1, 2, 3, 4, 5, 6]));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl overflow-hidden">
        <div className="bg-blue-950 px-5 pt-6 pb-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-black text-white text-lg">Weekly Schedule</h3>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white/80">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-blue-200 text-xs">
            Tap a day to toggle it open or closed for this week.
          </p>
        </div>

        <div className="p-5 space-y-3">
          {/* Toggle all */}
          <button
            type="button"
            onClick={toggleAll}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              allOpen
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {allOpen ? "✓ Open every day" : "Set all days open"}
          </button>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((day, i) => {
              const isOpen = openDays.has(i);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggle(i)}
                  className={`flex flex-col items-center py-2.5 rounded-xl border-2 transition-all ${
                    isOpen
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-200 text-slate-400 hover:border-blue-200"
                  }`}
                >
                  <span className="text-xs font-bold">{day}</span>
                  {isOpen ? (
                    <Check className="w-3 h-3 mt-0.5" />
                  ) : (
                    <X className="w-3 h-3 mt-0.5 opacity-40" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl px-3 py-2">
            {openDays.size === 0 ? (
              <p className="text-xs text-red-500 font-medium text-center">⚠ Shop marked closed all week</p>
            ) : (
              <p className="text-xs text-slate-600 text-center">
                Open: <span className="font-semibold text-slate-900">
                  {Array.from(openDays).sort().map((d) => DAYS[d]).join(", ")}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Skip for now
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSave(Array.from(openDays).sort())}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
