'use client';

import React, { useState } from 'react';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import Navbar from '@/components/layout/Navbar';
import TopNavigation from '@/components/layout/TopNavigation';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { DrowsinessProvider } from '@/context/DrowsinessContext';

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>SafeWay AI — Intelligent Road Safety Platform</title>
        <meta name="description" content="AI-powered road safety companion for smarter and safer driving." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#FFFAF0] text-slate-900 antialiased selection:bg-sky-600 selection:text-white font-sans min-h-screen">
        <DrowsinessProvider>
          <div className="min-h-screen flex flex-col bg-[#FFFAF0]">
            {/* Top Main Header */}
            <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

            {/* Horizontal Top Navigation directly below Header */}
            <TopNavigation />

            {/* Mobile Responsive Drawer only when hamburger is toggled */}
            {sidebarOpen && (
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            )}

            {/* Full-Width Main Content Container (No Left Sidebar on Desktop) */}
            <div className="flex-1 w-full max-w-[1600px] mx-auto bg-[#FFFAF0]">
              <main className="p-4 sm:p-6 lg:p-8 w-full pb-24 lg:pb-12 bg-[#FFFAF0]">
                {children}
              </main>
            </div>

            <MobileNav />
          </div>
        </DrowsinessProvider>
      </body>
    </html>
  );
}
