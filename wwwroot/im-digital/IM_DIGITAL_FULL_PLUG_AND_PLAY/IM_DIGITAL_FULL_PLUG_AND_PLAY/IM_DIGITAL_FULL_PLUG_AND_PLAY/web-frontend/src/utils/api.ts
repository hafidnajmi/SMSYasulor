/**
 * Utility helper untuk URL Backend API.
 * Menjamin sistem Plug & Play:
 * - Jika dibuka di server lokal (localhost), otomatis akses localhost:5268.
 * - Jika dibuka dari laptop/HP lain via IP LAN (misal http://192.168.1.50:3000), otomatis akses http://192.168.1.50:5268.
 * - Jika di-hosting di VPS/Domain, bisa diatur lewat environment variable NEXT_PUBLIC_API_URL.
 */

export const getApiBaseUrl = (): string => {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:5268`;
  }
  return "http://localhost:5268";
};

export const API_BASE = getApiBaseUrl();

export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${cleanPath}`;
};
