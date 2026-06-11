import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"slide" | "reveal" | "out">("slide");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 900);
    const t2 = setTimeout(() => setPhase("out"), 2000);
    const t3 = setTimeout(() => onDone(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-blue-950 flex items-center justify-center overflow-hidden"
      style={{
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity 0.5s ease-in-out" : "none",
        pointerEvents: "none",
      }}
    >
      {/* Horizontal cut line */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: "50%",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
          transform: "translateY(-50%)",
        }}
      />

      {/* Scissors */}
      <div
        className="absolute"
        style={{
          top: "50%",
          left: 0,
          transform: "translateY(-60%)",
          animation: "splashScissor 1.8s cubic-bezier(0.32,0.72,0.45,0.94) forwards",
        }}
      >
        <svg width="72" height="52" viewBox="0 0 72 52" fill="none">
          {/* Top blade */}
          <path
            d="M8 26 Q20 6 44 14 L64 22 L44 18 Q24 12 12 26Z"
            fill="#3b82f6"
            stroke="#60a5fa"
            strokeWidth="0.8"
          />
          {/* Bottom blade */}
          <path
            d="M8 26 Q20 46 44 38 L64 30 L44 34 Q24 40 12 26Z"
            fill="#2563eb"
            stroke="#60a5fa"
            strokeWidth="0.8"
          />
          {/* Handle top ring */}
          <ellipse cx="9" cy="22" rx="7" ry="9" fill="none" stroke="#60a5fa" strokeWidth="2.5" transform="rotate(-10,9,22)" />
          {/* Handle bottom ring */}
          <ellipse cx="9" cy="30" rx="7" ry="9" fill="none" stroke="#3b82f6" strokeWidth="2.5" transform="rotate(10,9,30)" />
          {/* Pivot */}
          <circle cx="32" cy="26" r="3" fill="#93c5fd" />
          <circle cx="32" cy="26" r="1.5" fill="#1e40af" />
        </svg>
      </div>

      {/* Text */}
      <div
        style={{
          opacity: phase === "reveal" || phase === "out" ? 1 : 0,
          transform: phase === "reveal" || phase === "out" ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
          transitionDelay: "0.1s",
          textAlign: "center",
          userSelect: "none",
        }}
      >
        <div className="text-white/20 text-xs tracking-[0.35em] uppercase font-semibold mb-2">
          time is money
        </div>
        <div className="text-4xl font-black text-white tracking-tight">SlotCut</div>
      </div>
    </div>
  );
}
