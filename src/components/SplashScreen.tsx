import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

export function SplashScreen() {
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const exitTimer = setTimeout(() => setExiting(true), 3000);
    const removeTimer = setTimeout(() => setMounted(false), 3700);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // keep for API compatibility
  void setVisible;

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-opacity duration-700 ${
        exiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background:
          "radial-gradient(1200px 800px at 20% 10%, oklch(0.42 0.15 258) 0%, transparent 60%), radial-gradient(1000px 700px at 90% 100%, oklch(0.28 0.12 258) 0%, transparent 55%), linear-gradient(135deg, oklch(0.22 0.09 258) 0%, oklch(0.15 0.06 258) 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-24 top-1/3 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "oklch(0.78 0.16 82)", animation: "vb-float 6s ease-in-out infinite" }}
        />
        <div
          className="absolute -right-24 bottom-1/4 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "oklch(0.6 0.18 258)", animation: "vb-float 7s ease-in-out infinite reverse" }}
        />
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        {/* Logo */}
        <div
          className={`relative mb-6 transition-all duration-700 ease-out ${
            visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-4 opacity-0 scale-90"
          }`}
        >
          {/* rotating ring */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background:
                "conic-gradient(from 0deg, oklch(0.78 0.16 82) 0deg, transparent 90deg, oklch(0.78 0.16 82) 180deg, transparent 270deg, oklch(0.78 0.16 82) 360deg)",
              animation: "vb-spin 3.5s linear infinite",
              filter: "blur(6px)",
              opacity: 0.6,
            }}
          />
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-3xl shadow-2xl"
            style={{
              background: "linear-gradient(135deg, oklch(0.78 0.16 82), oklch(0.68 0.18 70))",
              animation: "vb-pulse 2.4s ease-in-out infinite",
            }}
          >
            <GraduationCap className="h-12 w-12" style={{ color: "oklch(0.22 0.05 250)" }} />
          </div>
        </div>

        {/* Wordmark */}
        <h1
          className={`font-display text-5xl font-extrabold tracking-tight text-white transition-all delay-200 duration-700 ease-out sm:text-6xl ${
            visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          v-<span style={{ color: "oklch(0.82 0.17 82)" }}>booka</span>
        </h1>

        <p
          className={`mt-3 max-w-xs text-sm font-semibold text-white transition-all delay-500 duration-700 ease-out sm:text-base ${
            visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          Exam Venue &amp; Conference Hall Booking
        </p>

        {/* Loading bar */}
        <div
          className={`mt-8 h-1 w-48 overflow-hidden rounded-full bg-white/15 transition-opacity delay-700 duration-500 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, oklch(0.78 0.16 82), oklch(0.9 0.12 82))",
              animation: "vb-progress 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
            }}
          />
        </div>

        <p
          className={`mt-6 text-[11px] uppercase tracking-[0.3em] text-white/80 transition-opacity delay-[900ms] duration-500 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          Mzumbe University
        </p>
      </div>

      <style>{`
        @keyframes vb-spin { to { transform: rotate(360deg); } }
        @keyframes vb-pulse {
          0%, 100% { box-shadow: 0 10px 40px -5px oklch(0.78 0.16 82 / 0.6); transform: scale(1); }
          50% { box-shadow: 0 20px 60px -5px oklch(0.78 0.16 82 / 0.85); transform: scale(1.04); }
        }
        @keyframes vb-float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(15px); }
        }
        @keyframes vb-progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
