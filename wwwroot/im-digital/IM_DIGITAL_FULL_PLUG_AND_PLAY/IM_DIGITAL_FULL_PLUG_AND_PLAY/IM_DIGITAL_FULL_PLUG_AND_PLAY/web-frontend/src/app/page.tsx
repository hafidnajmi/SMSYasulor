"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { getDefaultDashboardRoute } from "@/utils/auth";
import { API_BASE } from "@/utils/api";

// Official Bootstrap Icons (SVG 16x16)
const BsArrowLeft = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
  </svg>
);

const BsEye = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
  </svg>
);

const BsEyeSlash = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
  </svg>
);

export default function Home() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [portalUrl, setPortalUrl] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const envPortal = process.env.NEXT_PUBLIC_PORTAL_URL;
      if (envPortal) {
        setPortalUrl(envPortal);
      } else {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (isLocal) {
          setPortalUrl(`${window.location.protocol}//${window.location.hostname}:5005`);
        } else {
          setPortalUrl(`${window.location.protocol}//${window.location.hostname}`);
        }
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || "Gagal menghubungi server.");
        setLoading(false);
      } else {
        // Simpan data user ke localStorage
        localStorage.setItem("im_user", JSON.stringify(data.user));
        // Show success state immediately
        setLoginSuccess(true);
        // Determine landing route based on user permissions
        const targetRoute = getDefaultDashboardRoute(data.user);
        // Use window.location for instant redirect (avoids Next.js prefetch delay)
        window.location.href = targetRoute;
      }
    } catch (err) {
      setErrorMsg("Tidak dapat terhubung ke server backend.");
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-4 bg-[#F8FAFC]">
      {/* Centered Login Card */}
      <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-none shadow-none w-full max-w-[440px] p-8">
        
        {/* Top Header Bar: Back to Portal Switch */}
        <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-[#F1F5F9]">
          <a
            href={portalUrl}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#475569] hover:text-[#0047AB] transition-colors py-1 px-2.5 border border-[#CBD5E1] hover:border-[#94A3B8] bg-[#F8FAFC] rounded-none shadow-none no-underline cursor-pointer"
            title="Kembali ke Halaman Switch Portal (SMS & IM Digital)"
          >
            <BsArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Switch System</span>
          </a>
          <span className="text-[10px] text-[#94A3B8] font-bold tracking-wider uppercase">UPMS PORTAL</span>
        </div>

        <div className="flex flex-col items-center">
          {/* Logo */}
          <div className="flex justify-center mb-4 mt-1">
            <img 
              src="/LOGO-IM.png" 
              alt="Instruksi Mutu Digital Logo" 
              className="max-w-[360px] max-h-[70px] object-contain"
            />
          </div>

          {/* Subtitle */}
          <p className="text-[13px] text-[#605E5C] text-center mb-5 leading-relaxed px-4">
            Sign in to your account to access the document system.
          </p>
        </div>

        <form className="space-y-3.5" onSubmit={handleLogin}>
          {/* Username Field */}
          <div>
            <label className="block text-[13px] font-semibold text-[#323130] mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-9 px-2.5 py-1.5 bg-[#FFFFFF] border border-[#CBD5E1] rounded-none text-[13px] text-[#323130] focus:outline-none focus:border-[#0067B8] shadow-none transition-colors"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[13px] font-semibold text-[#323130] mb-1">
              Password
            </label>
            <div className="relative border border-[#CBD5E1] rounded-none bg-[#FFFFFF] h-9 flex items-center focus-within:border-[#0067B8] shadow-none transition-colors">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 h-full px-2.5 py-1.5 bg-transparent text-[13px] text-[#323130] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="w-9 h-full flex items-center justify-center text-[#605E5C] hover:bg-gray-100 transition-colors cursor-pointer"
                title={showPassword ? "Sembunyikan Password" : "Lihat Password"}
              >
                {showPassword ? <BsEyeSlash className="w-4 h-4 text-gray-500" /> : <BsEye className="w-4 h-4 text-gray-500" />}
              </button>
            </div>
          </div>

          {/* Error Message Space */}
          <div className="min-h-4 mt-2">
            {errorMsg && (
              <span className="text-[#A4262C] text-[12px] font-medium">{errorMsg}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-1 flex flex-col gap-2">
            <button
              type="submit"
              disabled={loading || loginSuccess}
              className={`w-full h-9 ${loginSuccess ? 'bg-[#16A34A]' : 'bg-[#0067B8] hover:bg-[#005A9E] active:bg-[#004578]'} disabled:bg-gray-400 text-[#FFFFFF] text-[13px] font-semibold rounded-none transition-colors flex items-center justify-center cursor-pointer border-none shadow-none ${loginSuccess ? '!bg-[#16A34A]' : ''}`}
            >
              {loginSuccess ? "Redirecting..." : loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Back to Switch Portal Button */}
            <a
              href={portalUrl}
              className="w-full h-9 border border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#334155] hover:text-[#0F172A] text-[12px] font-semibold rounded-none transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-none no-underline"
            >
              <BsArrowLeft className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
              <span>Kembali ke Halaman Switch (UPMS)</span>
            </a>
          </div>
        </form>
        <div className="text-[10px] text-[#A19F9D] text-center mt-5 font-semibold tracking-wider">
          IM DIGITAL VERSI 1.8
        </div>
      </div>
    </main>
  );
}
