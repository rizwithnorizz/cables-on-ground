"use client"; 


import React from "react";
import { Sidebar } from "./sidebar";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthProvider } from "./auth-context";
export function Layout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsAuthenticated(true);

        // Check if user is in admin_role table
        const { data: adminRole, error } = await supabase
          .from("admin_role")
          .select("uuid")
          .eq("uuid", user.id)
          .maybeSingle();

        setIsAdmin(!!adminRole && !error);
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);
  return (
    <AuthProvider isAuthenticated={isAuthenticated} isAdmin={isAdmin} loading={loading}>
      <div className="min-h-screen flex bg-background text-foreground overflow-hidden dark:bg-[#080C14] dark:text-white">
        {/* Background elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#0047FF] opacity-[0.06] blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#00C8FF] opacity-[0.05] blur-[100px]" />
          {/* Grid overlay */}
        </div>

        {/* Sidebar */}
        <Sidebar isAuthenticated={isAuthenticated} isAdmin={isAdmin} loading={loading} />

        {/* Main content */}
        <main className="flex-1 md:ml-64 overflow-y-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
