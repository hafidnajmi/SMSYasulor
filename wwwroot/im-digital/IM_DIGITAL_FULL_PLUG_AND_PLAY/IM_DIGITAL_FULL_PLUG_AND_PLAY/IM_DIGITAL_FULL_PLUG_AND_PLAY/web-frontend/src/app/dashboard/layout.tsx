"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/utils/api';
import {
  History,
  FileText,
  Rocket,
  Settings2,
  FlaskConical,
  Building2,
  ClipboardCheck,
  UserCheck,
  UserCog,
  Package,
  Microscope,
  Users,
  KeyRound,
  LogOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Barcode,
  Files
} from 'lucide-react';
import { userHasPermission, isUserAdmin } from '@/utils/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  const getLinkClass = (path: string) => {
    // Exact match or decoded match for encoded URLs
    const isActive = pathname === path || decodeURIComponent(pathname) === path;
    if (isActive) {
      return "flex items-center justify-between px-3.5 py-1.5 bg-[#004578] border-l-[3px] border-[#63B3ED] text-white select-none";
    }
    return "flex items-center justify-between px-3.5 py-1.5 hover:bg-[#1A6EB4] text-[#E1DFDD] transition-colors border-l-[3px] border-transparent select-none";
  };

  const fetchPendingCounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/im/pending-counts`);
      if (res.ok) {
        setPendingCounts(await res.json());
      }
    } catch (err) {
      console.warn("Failed to fetch pending counts", err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("im_user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) { }
    } else {
      router.push("/");
    }

    fetchPendingCounts();

    const handleRefresh = () => fetchPendingCounts();
    window.addEventListener('refresh_im_data', handleRefresh);

    // Auto-refresh pending counts every 5 seconds
    const intervalId = setInterval(() => {
      fetchPendingCounts();
    }, 5000);

    return () => {
      window.removeEventListener('refresh_im_data', handleRefresh);
      clearInterval(intervalId);
    };
  }, [router]);

  const initials = (user?.username || user?.Username) ? (user.username || user.Username).substring(0, 2).toUpperCase() : 'SA';

  const hasAccess = (div: string) => {
    return userHasPermission(user, div);
  };

  const showGeneral = hasAccess('HISTORI PENGISIAN') || hasAccess('LIHAT IM');
  const showDataInput = hasAccess('LAUNCH CO') || hasAccess('UP') || hasAccess('POLE') || hasAccess('MSC ADM') || hasAccess('IQ') || hasAccess('INPUT SPEC CODE') || hasAccess('SPEC CODE & PDF');
  const showAssignment = hasAccess('UP FILLING SPV') || hasAccess('UP FILLING MANAGER') || hasAccess('PACKAGING & POLE') || hasAccess('HEAD LAB');
  const showAdmin = isUserAdmin(user);

  return (
    <div className="h-screen overflow-hidden bg-[#FDFDFD] flex flex-col print:h-auto print:overflow-visible print:block" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* 1. Top Header Bar */}
      <header className="bg-[#FFFFFF] border-b border-[#E2E8F0] h-[44px] flex items-center justify-between px-4 shrink-0 print:hidden">
        <div className="w-[200px]"></div> {/* Spacer for symmetry */}

        {/* Center Branding */}
        <div className="flex items-center space-x-1.5 absolute left-1/2 -translate-x-1/2">
          <span className="text-[18px] font-bold text-[#163A5F]">INTRUKSI MUTU</span>
          <span className="text-[18px] font-bold text-[#00B8A9]">DIGITAL</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => window.dispatchEvent(new Event('refresh_im_data'))}
            className="flex items-center space-x-1.5 bg-[#0078D4] hover:bg-[#1A86D9] active:bg-[#5BA8E0] text-white px-3.5 py-1.5 rounded-[6px] transition-colors border border-[#0078D4] hover:border-[#1A86D9]"
          >
            <RotateCw className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[12.5px] font-semibold">Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative print:overflow-visible print:block">
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute top-1/2 -translate-y-1/2 z-50 bg-[#005A9E] hover:bg-[#004578] text-white w-[16px] h-[56px] flex items-center justify-center rounded-r-md transition-all duration-300 print:hidden ${isSidebarOpen ? 'left-[230px]' : 'left-0'}`}
        >
          {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* 2. Left Sidebar Navigation */}
        <aside className={`${isSidebarOpen ? 'w-[230px]' : 'w-0'} bg-[#005A9E] flex flex-col shrink-0 transition-all duration-300 ease-in-out overflow-hidden print:hidden select-none`}>

          {/* User Profile Card */}
          <div className="mx-3 mt-2.5 mb-2 flex items-center shrink-0">
            {/* Avatar Initials */}
            <div className="w-[30px] h-[30px] rounded-full bg-[#FFFFFF] flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-[#005A9E] text-[12px] font-bold">{initials}</span>
            </div>
            {/* Name & Role */}
            <div className="ml-2.5 overflow-hidden">
              <div className="text-[#FFFFFF] text-[11.5px] font-bold truncate leading-tight">
                {user?.username || user?.Username || 'System Administrator'}
              </div>
              <div className="text-[#BAE6FD] text-[9.5px] font-semibold mt-0.5 uppercase tracking-wide">
                {user?.role || user?.Role || 'ADMIN'}
              </div>
            </div>
          </div>

          {/* Scrollable Menu Items (Compact & No Ugly Scrollbar) */}
          <div className="flex-1 overflow-y-auto px-0 pb-1.5 sidebar-scrollbar custom-scrollbar">

            {/* GENERAL */}
            {showGeneral && (
              <div className="mt-1.5 mb-1">
                <div className="text-[#BAE6FD] text-[8.5px] font-bold px-3.5 py-0.5 mb-0.5 tracking-wider uppercase">General</div>
                {hasAccess('HISTORI PENGISIAN') && (
                  <Link href="/dashboard/filling-history" className={getLinkClass("/dashboard/filling-history")}>
                    <div className="flex items-center">
                      <History className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">Filling History</span>
                    </div>
                  </Link>
                )}
                {hasAccess('LIHAT IM') && (
                  <Link href="/dashboard/divisions/DATA%20IM" className={getLinkClass("/dashboard/divisions/DATA IM")}>
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">Data IM</span>
                    </div>
                  </Link>
                )}
              </div>
            )}

            {/* DATA INPUT */}
            {showDataInput && (
              <div className="mt-1.5 mb-1">
                <div className="text-[#BAE6FD] text-[8.5px] font-bold px-3.5 py-0.5 mb-0.5 tracking-wider uppercase">Data Input</div>
                {hasAccess('LAUNCH CO') && (
                  <Link href="/dashboard" className={getLinkClass("/dashboard")}>
                    <div className="flex items-center">
                      <Rocket className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">Launch CO</span>
                    </div>
                  </Link>
                )}
                {hasAccess('UP') && (
                  <Link href="/dashboard/divisions/UP" className={getLinkClass("/dashboard/divisions/UP")}>
                    <div className="flex items-center">
                      <Settings2 className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">UP</span>
                    </div>
                    {pendingCounts['UP'] > 0 && <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">{pendingCounts['UP']}</span>}
                  </Link>
                )}
                {hasAccess('POLE') && (
                  <Link href="/dashboard/divisions/POLE" className={getLinkClass("/dashboard/divisions/POLE")}>
                    <div className="flex items-center">
                      <ClipboardCheck className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">POLE</span>
                    </div>
                    {pendingCounts['POLE'] > 0 && <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">{pendingCounts['POLE']}</span>}
                  </Link>
                )}
                {hasAccess('MSC ADM') && (
                  <Link href="/dashboard/divisions/MSC%20ADM" className={getLinkClass("/dashboard/divisions/MSC ADM")}>
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">MSC ADM</span>
                    </div>
                    {pendingCounts['MSC ADM'] > 0 && <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">{pendingCounts['MSC ADM']}</span>}
                  </Link>
                )}
                {hasAccess('IQ') && (
                  <Link href="/dashboard/divisions/IQ" className={getLinkClass("/dashboard/divisions/IQ")}>
                    <div className="flex items-center">
                      <FlaskConical className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">IQ</span>
                    </div>
                    {pendingCounts['IQ'] > 0 && <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">{pendingCounts['IQ']}</span>}
                  </Link>
                )}
                {hasAccess('INPUT SPEC CODE') && (
                  <Link href="/dashboard/spec-code" className={getLinkClass("/dashboard/spec-code")}>
                    <div className="flex items-center">
                      <Barcode className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">INPUT SPEC CODE</span>
                    </div>
                  </Link>
                )}
                {hasAccess('SPEC CODE & PDF') && (
                  <Link href="/dashboard/spec-code-pdf" className={getLinkClass("/dashboard/spec-code-pdf")}>
                    <div className="flex items-center">
                      <Files className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">SPEC CODE & PDF</span>
                    </div>
                  </Link>
                )}
              </div>
            )}

            {/* ASSIGNMENT & OTHER */}
            {showAssignment && (
              <div className="mt-1.5 mb-1">
                <div className="text-[#BAE6FD] text-[8.5px] font-bold px-3.5 py-0.5 mb-0.5 tracking-wider uppercase">Assignment & Other</div>
                {hasAccess('UP FILLING SPV') && (
                  <Link href="/dashboard/divisions/UP%20FILLING%20SPV" className={getLinkClass("/dashboard/divisions/UP FILLING SPV")}>
                    <div className="flex items-center">
                      <UserCheck className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">UP FILLING SPV</span>
                    </div>
                    {pendingCounts['UP FILLING SPV'] > 0 && <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">{pendingCounts['UP FILLING SPV']}</span>}
                  </Link>
                )}
                {hasAccess('UP FILLING MANAGER') && (
                  <Link href="/dashboard/divisions/UP%20FILLING%20MANAGER" className={getLinkClass("/dashboard/divisions/UP FILLING MANAGER")}>
                    <div className="flex items-center">
                      <UserCog className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">UP FILLING MANAGER</span>
                    </div>
                    {pendingCounts['UP FILLING MANAGER'] > 0 && <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">{pendingCounts['UP FILLING MANAGER']}</span>}
                  </Link>
                )}
                {hasAccess('PACKAGING & POLE') && (
                  <Link href="/dashboard/divisions/PACKAGING%20%26%20POLE" className={getLinkClass("/dashboard/divisions/PACKAGING & POLE")}>
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">PACKAGING & POLE</span>
                    </div>
                    {pendingCounts['PACKAGING & POLE'] > 0 && <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">{pendingCounts['PACKAGING & POLE']}</span>}
                  </Link>
                )}
                {hasAccess('HEAD LAB') && (
                  <Link href="/dashboard/divisions/HEAD%20LAB" className={getLinkClass("/dashboard/divisions/HEAD LAB")}>
                    <div className="flex items-center">
                      <Microscope className="w-4 h-4 mr-2.5 text-white shrink-0" />
                      <span className="text-[10.5px] font-bold uppercase tracking-wider">HEAD LAB</span>
                    </div>
                    {pendingCounts['HEAD LAB'] > 0 && <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight">{pendingCounts['HEAD LAB']}</span>}
                  </Link>
                )}
              </div>
            )}

            {/* ADMINISTRATION */}
            {showAdmin && (
              <div className="mt-1.5 mb-1">
                <div className="text-[#BAE6FD] text-[8.5px] font-bold px-3.5 py-0.5 mb-0.5 tracking-wider uppercase">Administration</div>
                <Link href="/dashboard/admin/users" className={getLinkClass("/dashboard/admin/users")}>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2.5 text-white shrink-0" />
                    <span className="text-[10.5px] font-bold uppercase tracking-wider">USER MANAGEMENT</span>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Bottom Back to Login */}
          <div className="px-3.5 py-2 border-t border-[#1A6EB4]/50 shrink-0">
            <button
              onClick={() => { localStorage.removeItem("im_user"); router.push("/"); }}
              className="flex items-center space-x-2 text-[#E1DFDD] hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-[#E1DFDD] shrink-0" />
              <span className="text-[11px] font-semibold">Back to Login</span>
            </button>
          </div>
        </aside>

        {/* 3. Page Content */}
        <main className="flex-1 overflow-hidden bg-[#FFFFFF] flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
