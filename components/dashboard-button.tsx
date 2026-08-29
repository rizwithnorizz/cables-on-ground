"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function DashboardButton() {
  const router = useRouter();

  const dashboard = async () => {
    router.push("/dashboard");
  };

  return <Button className="group inline-flexitems-center gap-3 rounded-xl border border-white/70 bg-white/[0.06] px-5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-[#101821] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#101821]" onClick={dashboard}>Dashboard</Button>;
}
