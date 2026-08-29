import { AuthButton } from "@/components/auth-button";
import { LandingScrollSections } from "@/components/landing-scroll-sections";
import {
  ArrowDown,
  ArrowRight,
  Cable,
  ClipboardCheck,
  FileCheck2,
  ReceiptText,
  Scissors,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const inventoryFeatures = [
  {
    title: "Available cables",
    description: "See current stock and remaining lengths before allocation.",
  },
  {
    title: "Cutting orders",
    description: "Plan cuts against the exact drums assigned to the work.",
  },
  {
    title: "Test certificates",
    description: "Keep the supporting documentation with every cable record.",
  },
  {
    title: "Transactions",
    description: "Follow movement, reservations, and inventory activity clearly.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#172330] text-white selection:bg-[#D8E5FF] selection:text-[#101821]">
      <nav className="absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-[#101821]/50 backdrop-blur-md">
        <div className="mx-auto flex h-[72px]  items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101821]"
          >
            <span className="text-sm font-bold tracking-[0.16em] text-white">MADAR</span>
          </Link>
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      <LandingScrollSections inventoryFeatures={inventoryFeatures} />
      <footer className="border-t border-white/10 bg-[#0A1119] text-[#AEBFD2]">
        <div className="mx-auto flex justify-end py-6 text-xs sm:px-8">
          <span>@rev_n software solutions</span>
        </div>
      </footer>
    </main>
  );
}
