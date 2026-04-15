"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './logout-button';
import { createClient } from '@/lib/supabase/client';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';  
interface SidebarItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

const userSidebarItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Cables View', href: '/cables_view' },
  { label: 'Reserve', href: '/reserve' }, 
  { label: 'Transactions', href: '/transactions' },
];

const allSidebarItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Cables View', href: '/cables_view' },
  { label: 'Cutting', href: '/cutting' },
  { label: 'Reserve', href: '/reserve' }, 
  { label: 'New Drum', href: '/new_drum' },
  { label: 'Transactions', href: '/transactions' },
];

const publicSidebarItems: SidebarItem[] = [
  { label: 'Cables View', href: '/cables_view' },
  { label: 'Reservations', href: '/reservations' },
  { label: 'Transactions', href: '/transactions' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setIsAuthenticated(true);
        
        // Check if user is in admin_role table
        const { data: adminRole, error } = await supabase
          .from('admin_role')
          .select('*')
          .eq('uuid', user.id)
          .single();
        
        setIsAdmin(!!adminRole && !error);
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, []);

  const sidebarItems = isAuthenticated ? (isAdmin ? allSidebarItems : userSidebarItems) : publicSidebarItems;
  


 if (loading) {
    return (
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0e1a] border-r border-[#1a1f3a] flex flex-col p-6 overflow-y-auto z-50">
        <div className="mb-8">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#0047FF] to-[#00C8FF] bg-clip-text text-transparent">
            Cables on Ground
          </h1>
        </div>
        <div className="flex-1" />
      </aside>
    );
  }
  return (
    <>
      {/* Hamburger Menu Button - Hidden on Medium and Above */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="sm:hidden fixed bottom-6 left-6 z-50 p-2 rounded-lg bg-[#1a1f3a] text-white hover:bg-[#2a2f4a] transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop for Mobile - Hidden on Medium and Above */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on Small, Visible on Medium and Above */}
      <aside className={`fixed left-0 top-0 h-screen w-64 bg-[#0a0e1a] border-r border-[#1a1f3a] flex flex-col p-6 overflow-y-auto z-50 transition-transform duration-300 md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } `}>
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#0047FF] to-[#00C8FF] bg-clip-text text-transparent">
            Cables on Ground
          </h1>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`block px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#0047FF] to-[#00C8FF] text-white shadow-lg shadow-[#0047FF]/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1f3a]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className=" pt-4 border-t border-[#1a1f3a] space-y-3">
          {isAuthenticated ? (
            <LogoutButton className="w-full text-gray-400 hover:text-white hover:bg-[#1a1f3a] bg-transparent" />
          ) : (
            <Button asChild className="w-full bg-gradient-to-r from-[#0047FF] to-[#00C8FF] text-white hover:shadow-lg hover:shadow-[#0047FF]/20">
              <Link href="/auth/login">Login</Link>
            </Button>
          )}
          <p className="text-xs text-gray-500">© 2026 Cables</p>
        </div>
      </aside>
    </>
  );
}
