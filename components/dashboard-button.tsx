"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function DashboardButton() {
  const router = useRouter();

  const dashboard = async () => {
    router.push("/dashboard");
  };

  return <Button variant="secondary" className=" shadow-purple-800" onClick={dashboard}>Dashboard</Button>;
}
