import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { DashboardButton } from "./dashboard-button";

export async function AuthButton() {
  const supabase = await createClient();

  // You can also use getUser() which will be slower.
  const { data } = await supabase.auth.getClaims();

  const user = data?.claims;

  return user ? (
    <div className="flex items-center gap-5">
      Hey, {user.email}!
      <DashboardButton />
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button
        asChild
        size="sm"
        variant="outline"
        className="rounded-lg !border-white/65 !bg-transparent px-3.5 text-white shadow-none transition-colors hover:!border-white hover:!bg-white hover:text-[#102238]"
      >
        <Link href="/auth/login">Sign in</Link>
      </Button>
    </div>
  );
}
