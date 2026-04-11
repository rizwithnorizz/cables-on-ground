import React from 'react'
import { Sidebar } from './sidebar'

export function Layout( {
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[#080C14] text-white overflow-hidden">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#0047FF] opacity-[0.06] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#00C8FF] opacity-[0.05] blur-[100px]" />
        {/* Grid overlay */}
       
      </div>
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <main className="flex-1 md:ml-64 overflow-y-auto">
        { children }
      </main>
    </div>
  )
}

