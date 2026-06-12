import { useState } from "react";
import { Clock, X, Check, Copy } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type DayHours = { open: string; close: string };
type HoursMap = Record<string, DayHours>;

interface Props {
  currentOpenDays: number[];
  currentOpenHours: HoursMap;
  onSave: (days: number[], hours: HoursMap) => void;
  onClose: () => void;
  isSaving?: boolean;
}

const DEFAULT_HOURS: DayHours = { open: "09:00", close: "20:00" };

export default function WeeklyScheduleModal({
  currentOpenDays,
  currentOpenHours,
  onSave,
  onClose,
  isSaving,
}: Props) {
  const [openDays, setOpenDays] = useState<Set<number>>(new Set(currentOpenDays));
  const [hours, setHours] = useState<HoursMap>(() => {
    const base: HoursMap = {};
    for (let i = 0; i < 7; i++) {
      base[String(i)] = currentOpenHours?.[String(i)] ?? { ...DEFAULT_HOURS };
    }
    return base;
  });

  const toggleDay = (day: number) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const setHour = (day: number, field: "open" | "close", value: string) => {
    setHours((prev) => ({
      ...prev,
      [String(day)]: { ...prev[String(day)], [field]: value },
    }));
  };

  const copyToAll = (day: number) => {
    const src = hours[String(day)];
    const next: HoursMap = {};
    for (let i = 0; i < 7; i++) {
      next[String(i)] = { ...src };
    }
    setHours(next);
  };

  const handleSave = () => {
    const days = Array.from(openDays).sort();
    const filteredHours: HoursMap = {};
    for (const d of days) {
      filteredHours[String(d)] = hours[String(d)];
    }
    onSave(days, filteredHours);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl overflow-hidden max-h-[95dvh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-950 px-5 pt-6 pb-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-black text-white text-lg">Shop Hours</h3>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-blue-200 text-xs">
            Toggle days open/closed and set opening &amp; closing times.
          </p>
        </div>

        {/* Scrollable day list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {DAYS.map((abbr, i) => {
            const isOpen = openDays.has(i);
            const dayHours = hours[String(i)];
            return (
              <div
                key={abbr}
                className={`rounded-xl border-2 transition-all ${
                  isOpen ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50"
                }`}
              >
                {/* Day row header */}
                <div className="flex items-center gap-3 px-3 pt-3 pb-2">
                  {/* Toggle pill */}
                  <button
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                      isOpen ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        isOpen ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  <span className={`font-bold text-sm w-24 ${isOpen ? "text-slate-900" : "text-slate-400"}`}>
                    {FULL_DAYS[i]}
                  </span>
                  {isOpen ? (
                    <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Open
                    </span>
                  ) : (
                    <span className="ml-auto text-xs font-medium text-slate-400">Closed</span>
                  )}
                </div>

                {/* Time pickers — only when open */}
                {isOpen && (
                  <div className="px-3 pb-3 flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                        Opens
                      </label>
                      <input
                        type="time"
                        value={dayHours.open}
                        onChange={(e) => setHour(i, "open", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">
                        Closes
                      </label>
                      <input
                        type="time"
                        value={dayHours.close}
                        onChange={(e) => setHour(i, "close", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      title="Copy these hours to all open days"
                      onClick={() => copyToAll(i)}
                      className="mt-4 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary + Save */}
        <div className="px-4 pb-5 pt-3 border-t border-slate-100 flex-shrink-0 space-y-3">
          <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
            {openDays.size === 0 ? (
              <p className="text-xs text-red-500 font-medium">⚠ Shop marked closed all week</p>
            ) : (
              <p className="text-xs text-slate-600">
                Open{" "}
                <span className="font-semibold text-slate-900">
                  {Array.from(openDays)
                    .sort()
                    .map((d) => DAYS[d])
                    .join(", ")}
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save Hours"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
