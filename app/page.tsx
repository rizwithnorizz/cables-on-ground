import { AuthButton } from "@/components/auth-button";
import { Suspense } from "react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#080C14] text-white overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#0047FF] opacity-[0.06] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#00C8FF] opacity-[0.05] blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#00C8FF 1px, transparent 1px), linear-gradient(90deg, #00C8FF 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 w-full border-b border-white/[0.06] backdrop-blur-sm bg-white/[0.02]">
        <div className="max-w-6xl mx-auto flex justify-between items-center h-16 px-6">
          {/* Logo mark */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.3em] text-[#00C8FF] font-mono uppercase opacity-70">
              MADAR
            </span>
          </div>
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-10">
        {/* Status pill */}
        <div className="flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-[#00C8FF]/20 bg-[#00C8FF]/5 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00C8FF] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00C8FF]" />
          </span>
          <span className="text-[11px] tracking-[0.2em] text-[#00C8FF] font-mono uppercase">
            Live Monitoring Active
          </span>
        </div>

        {/* Main heading */}
        <h1
          className="text-center font-bold leading-[1.05] tracking-tight mb-4"
          style={{ fontSize: "clamp(3rem, 9vw, 7rem)" }}
        >
          <span className="block text-white">CABLES</span>
          <span
            className="block"
            style={{
              background: "linear-gradient(90deg, #0047FF, #00C8FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ON GROUND
          </span>
        </h1>

        <p className="text-white/40 text-lg text-center max-w-md mb-10 font-light tracking-wide">
          Real-time updates and monitoring of ground cable for Madar.
        </p>

        {/* CTA */}
        <Link
          href="/cables_view"
          className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-xl font-medium text-sm tracking-wide overflow-hidden transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #0047FF, #0090FF)",
            boxShadow:
              "0 0 40px rgba(0, 71, 255, 0.6), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          <span>View Cables on Ground</span>
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-7 flex flex-col gap-5 hover:border-[#0090FF]/30 hover:bg-white/[0.05] transition-all duration-300">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(0, 71, 255, 0.15)",
                border: "1px solid rgba(0, 71, 255, 0.25)",
              }}
            >
              <img
                src="/images/excel.png"
                alt="Excel"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base mb-1">
                Available Cables
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Browse and filter all registered cable assets with detailed
                metadata.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-7 flex flex-col gap-5 hover:border-[#00C8FF]/30 hover:bg-white/[0.05] transition-all duration-300">
            {/* Accent glow */}
            <div className="absolute top-0 right-6 w-24 h-px bg-gradient-to-r from-transparent via-[#00C8FF]/40 to-transparent" />
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(0, 200, 255, 0.12)",
                border: "1px solid rgba(0, 200, 255, 0.25)",
              }}
            >
              <img
                src="/images/realtime.png"
                alt="Realtime"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base mb-1">
                Real-Time Data
              </h3>
              <p className="text-white/40 text-sm leading-relaxed">
                Live streaming updates for instant awareness of field
                conditions.
              </p>
            </div>
          </div>

          {/* Card 3 — placeholder */}
          <div className="group relative rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-7 flex flex-col gap-5 hover:border-[#00C8FF]/30 hover:bg-white/[0.05] transition-all duration-300">
            {/* Accent glow */}
            <div className="absolute top-0 right-6 w-24 h-px bg-gradient-to-r from-transparent via-[#00C8FF]/40 to-transparent" />
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(0, 200, 255, 0.12)",
                border: "1px solid rgba(0, 200, 255, 0.25)",
              }}
            >
              <img
                src="/images/reservation.png"
                alt="Realtime"
                className="w-6 h-6 object-contain"
              />
            </div>
            <div>
                <h3 className="text-white font-semibold text-base mb-1">
                Drum Reservations
                </h3>
                <p className="text-white/40 text-sm leading-relaxed">
                Streamlined reservation system for efficient drum management and allocation.
                </p>
            </div>
          </div>
        </div>

        {/* Bottom rule */}
        <div className="mt-16 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/[0.05]" />
          <span className="text-white/20 text-[10px] tracking-[0.3em] font-mono uppercase">
            RizuDev Solutions
          </span>
          <div className="flex-1 h-px bg-white/[0.05]" />
        </div>
      </section>
    </main>
  );
}
