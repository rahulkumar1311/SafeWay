'use client';

import React, { useState } from 'react';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { DrowsinessProvider } from '@/context/DrowsinessContext';
import 'leaflet/dist/leaflet.css';

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
      <body className="bg-[#FFFAF0] text-slate-900 antialiased selection:bg-sky-600 selection:text-white">
        <DrowsinessProvider>
          <div className="min-h-screen flex flex-col bg-[#FFFAF0]">
            <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

            <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full bg-[#FFFAF0]">
              <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

              <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full pb-24 lg:pb-12 bg-[#FFFAF0]">
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
