import { useEffect, useState } from "react";

type Phase = "enter" | "snip" | "curtain" | "gone";

function ScissorsSVG({ open }: { open: boolean }) {
  const t = "transition: transform 0.1s cubic-bezier(0.9,0,1,0.5)";
  return (
    <svg width="96" height="60" viewBox="0 0 96 60" fill="none" style={{ display: "block" }}>
      {/* Upper blade — rotates around pivot (44,30) */}
      <g
        style={{
          transformOrigin: "44px 30px",
          transform: open ? "rotate(-13deg)" : "rotate(0deg)",
          transition: open ? "none" : "transform 0.11s cubic-bezier(0.9,0,1,0.5)",
        }}
      >
        <path
          d="M 10 30 Q 26 10 50 22 L 84 28 L 50 25 Q 28 13 12 30 Z"
          fill="#3b82f6"
          stroke="#60a5fa"
          strokeWidth="0.7"
        />
        <ellipse
          cx="9"
          cy="23"
          rx="7"
          ry="10"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2.4"
          transform="rotate(-13 9 23)"
        />
      </g>

      {/* Lower blade — rotates around pivot (44,30) */}
      <g
        style={{
          transformOrigin: "44px 30px",
          transform: open ? "rotate(13deg)" : "rotate(0deg)",
          transition: open ? "none" : "transform 0.11s cubic-bezier(0.9,0,1,0.5)",
        }}
      >
        <path
          d="M 10 30 Q 26 50 50 38 L 84 32 L 50 35 Q 28 47 12 30 Z"
          fill="#2563eb"
          stroke="#60a5fa"
          strokeWidth="0.7"
        />
        <ellipse
          cx="9"
          cy="37"
          rx="7"
          ry="10"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.4"
          transform="rotate(13 9 37)"
        />
      </g>

      {/* Pivot bolt */}
      <circle cx="44" cy="30" r="4" fill="#93c5fd" />
      <circle cx="44" cy="30" r="2" fill="#1d4ed8" />
    </svg>
  );
}

const CenterText = () => (
  <div style={{ textAlign: "center", userSelect: "none", whiteSpace: "nowrap" }}>
    <div
      style={{
        color: "rgba(255,255,255,0.18)",
        fontSize: "11px",
        letterSpacing: "0.38em",
        textTransform: "uppercase",
        fontWeight: 700,
        marginBottom: "8px",
      }}
    >
      time is money
    </div>
    <div
      style={{
        color: "#fff",
        fontSize: "40px",
        fontWeight: 900,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      SlotCut
    </div>
  </div>
);

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("enter");
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("snip"), 860);
    const t2 = setTimeout(() => setFlash(true), 920);
    const t3 = setTimeout(() => setFlash(false), 1020);
    const t4 = setTimeout(() => setPhase("curtain"), 1050);
    const t5 = setTimeout(() => setPhase("gone"), 2300);
    const t6 = setTimeout(() => onDone(), 2450);
    return () => [t1, t2, t3, t4, t5, t6].forEach(clearTimeout);
  }, []);

  const isCurtain = phase === "curtain" || phase === "gone";
  const isSnip = phase === "snip" || isCurtain;

  const CURTAIN_TRANSITION = "transform 1.1s cubic-bezier(0.55,0,0.85,0.3)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* ── TOP CURTAIN (slides up) ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "#0f172a",
          overflow: "hidden",
          transform: isCurtain ? "translateY(-100%)" : "translateY(0)",
          transition: isCurtain ? CURTAIN_TRANSITION : "none",
        }}
      >
        {/* Text: center of text aligns with bottom edge (= screen midpoint) */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%) translateY(50%)",
          }}
        >
          <CenterText />
        </div>
      </div>

      {/* ── BOTTOM CURTAIN (slides down) ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50%",
          background: "#0f172a",
          overflow: "hidden",
          transform: isCurtain ? "translateY(100%)" : "translateY(0)",
          transition: isCurtain ? CURTAIN_TRANSITION : "none",
        }}
      >
        {/* Text: center of text aligns with top edge (= screen midpoint) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%) translateY(-50%)",
          }}
        >
          <CenterText />
        </div>
      </div>

      {/* ── CUT LINE ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.15) 70%, transparent 100%)",
          transform: "translateY(-50%)",
          zIndex: 5,
        }}
      />

      {/* ── SNIP FLASH ── */}
      {flash && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 120,
            height: 120,
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%)",
            zIndex: 25,
            animation: "flashFade 0.18s ease-out forwards",
          }}
        />
      )}

      {/* ── SCISSORS ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          zIndex: 20,
          opacity: isCurtain ? 0 : 1,
          transition: isCurtain ? "opacity 0.25s ease-in" : "none",
          animation:
            phase === "enter"
              ? "scissorSlide 0.86s cubic-bezier(0.25,0.4,0.3,1) forwards"
              : "none",
          transform: phase !== "enter" ? "translate(-50%, -50%)" : undefined,
        }}
      >
        <ScissorsSVG open={!isSnip} />
      </div>
    </div>
  );
}
