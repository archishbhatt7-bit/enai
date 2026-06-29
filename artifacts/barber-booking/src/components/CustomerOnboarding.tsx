import { useState } from "react";
import { Scissors, ChevronRight } from "lucide-react";

export interface CustomerProfile {
  name: string;
  gender: string;
  age: string;
  source?: string;
  profilePhoto?: string;
}

const GENDERS = ["Male", "Female", "Other"];
const SOURCES = [
  "Friend / Word of mouth",
  "Instagram",
  "Google Search",
  "Just browsing",
  "Other",
];

interface Props {
  phone: string;
  onDone: (profile: CustomerProfile) => void;
}

export function getCustomerProfile(phone: string): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(`slotcut_profile_${phone}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomerProfile(phone: string, profile: CustomerProfile) {
  localStorage.setItem(`slotcut_profile_${phone}`, JSON.stringify(profile));
}

export default function CustomerOnboarding({ phone, onDone }: Props) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [source, setSource] = useState("");
  const [step, setStep] = useState<"details" | "source">("details");

  const detailsValid = name.trim().length >= 2 && gender && age && Number(age) > 0 && Number(age) < 120;

  const handleNext = () => {
    if (!detailsValid) return;
    setStep("source");
  };

  const handleFinish = () => {
    const profile: CustomerProfile = {
      name: name.trim(),
      gender,
      age,
      source: source || undefined,
    };
    saveCustomerProfile(phone, profile);
    onDone(profile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-blue-950/90 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="bg-blue-950 px-6 pt-8 pb-6 text-center">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Scissors className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Welcome to eNai</h2>
          <p className="text-blue-200 text-sm mt-1">Quick setup — just a few details</p>
        </div>

        <div className="px-6 py-6">
          {step === "details" ? (
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Your name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Arjun"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Gender
                </label>
                <div className="flex gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        gender === g
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Age
                </label>
                <input
                  type="number"
                  placeholder="e.g. 24"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min={1}
                  max={119}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="button"
                disabled={!detailsValid}
                onClick={handleNext}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-base font-bold text-slate-900 mb-1">How did you hear about us?</p>
                <p className="text-sm text-slate-400 mb-4">Optional — helps us reach more people</p>
                <div className="flex flex-col gap-2">
                  {SOURCES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSource(source === s ? "" : s)}
                      className={`w-full py-3 px-4 rounded-xl border-2 text-sm font-semibold text-left transition-all ${
                        source === s
                          ? "bg-blue-50 border-blue-500 text-blue-800"
                          : "bg-white border-slate-200 text-slate-600 hover:border-blue-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
              >
                Let's go →
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
