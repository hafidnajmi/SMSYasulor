/**
 * Authentication & Authorization Utilities for IM DIGITAL
 */

export function isUserAdmin(user: any): boolean {
  if (!user) return false;
  const role = (user.role || user.Role || "").toString().toUpperCase();
  return role === "ADMIN";
}

export function userHasPermission(user: any, permission: string): boolean {
  if (!user) return false;
  if (isUserAdmin(user)) return true;

  const permUpper = (permission || "").toString().trim().toUpperCase();
  const rawAllowed: any[] = user.allowedDivisions || user.AllowedDivisions || [];
  const allowed = rawAllowed.map((p: any) => (p || "").toString().trim().toUpperCase());

  // Direct array match
  if (allowed.includes(permUpper)) return true;

  // Aliases: LIHAT IM <-> DATA IM
  if ((permUpper === "DATA IM" || permUpper === "LIHAT IM") && (allowed.includes("LIHAT IM") || allowed.includes("DATA IM"))) {
    return true;
  }

  // Check direct database column flags if present on user object
  const checkProps: Record<string, any> = {
    "LAUNCH CO": user.launchCo ?? user.LaunchCo,
    "UP": user.up ?? user.Up,
    "POLE": user.pole ?? user.Pole,
    "MSC ADM": user.mscAdm ?? user.MscAdm,
    "IQ": user.iq ?? user.Iq,
    "UP FILLING SPV": user.upFillingSpv ?? user.UpFillingSpv,
    "UP FILLING MANAGER": user.upFillingManager ?? user.UpFillingManager,
    "PACKAGING & POLE": user.packagingPole ?? user.PackagingPole,
    "HEAD LAB": user.qaLab ?? user.QaLab,
    "LIHAT IM": user.lihatIm ?? user.LihatIm,
    "DATA IM": user.lihatIm ?? user.LihatIm,
    "HISTORI PENGISIAN": user.historiPengisian ?? user.HistoriPengisian,
    "SETTINGS": user.settings ?? user.Settings,
    "INPUT SPEC CODE": user.inputSpecCode ?? user.InputSpecCode,
    "SPEC CODE & PDF": user.specCodePdf ?? user.SpecCodePdf,
  };

  const val = checkProps[permUpper];
  if (val === 1 || val === true || val === "1") {
    return true;
  }

  return false;
}

/**
 * Determines the appropriate landing / default route for a user based on their permissions.
 * Admins and Launch CO staff land on "/im-digital/dashboard/".
 * Operators with only "LIHAT IM" land on "/im-digital/dashboard/divisions/DATA%20IM/".
 */
export function getDefaultDashboardRoute(user: any): string {
  if (!user) return "/im-digital/";

  // Admins and users with LAUNCH CO access land on Launch CO dashboard
  if (isUserAdmin(user) || userHasPermission(user, "LAUNCH CO")) {
    return "/im-digital/dashboard/";
  }

  // Operators / users with LIHAT IM permission go directly to Data IM
  if (userHasPermission(user, "LIHAT IM") || userHasPermission(user, "DATA IM")) {
    return "/im-digital/dashboard/divisions/DATA%20IM/";
  }

  // Other divisions in order
  if (userHasPermission(user, "HISTORI PENGISIAN")) {
    return "/im-digital/dashboard/filling-history/";
  }
  if (userHasPermission(user, "UP")) {
    return "/im-digital/dashboard/divisions/UP/";
  }
  if (userHasPermission(user, "POLE")) {
    return "/im-digital/dashboard/divisions/POLE/";
  }
  if (userHasPermission(user, "MSC ADM")) {
    return "/im-digital/dashboard/divisions/MSC%20ADM/";
  }
  if (userHasPermission(user, "IQ")) {
    return "/im-digital/dashboard/divisions/IQ/";
  }
  if (userHasPermission(user, "INPUT SPEC CODE")) {
    return "/im-digital/dashboard/spec-code/";
  }
  if (userHasPermission(user, "SPEC CODE & PDF")) {
    return "/im-digital/dashboard/spec-code-pdf/";
  }
  if (userHasPermission(user, "UP FILLING SPV")) {
    return "/im-digital/dashboard/divisions/UP%20FILLING%20SPV/";
  }
  if (userHasPermission(user, "UP FILLING MANAGER")) {
    return "/im-digital/dashboard/divisions/UP%20FILLING%20MANAGER/";
  }
  if (userHasPermission(user, "PACKAGING & POLE")) {
    return "/im-digital/dashboard/divisions/PACKAGING%20%26%20POLE/";
  }
  if (userHasPermission(user, "HEAD LAB")) {
    return "/im-digital/dashboard/divisions/HEAD%20LAB/";
  }
  if (userHasPermission(user, "SETTINGS")) {
    return "/im-digital/dashboard/admin/users/";
  }

  // Fallback to first available allowed division if any exists
  const rawAllowed: any[] = user.allowedDivisions || user.AllowedDivisions || [];
  if (Array.isArray(rawAllowed) && rawAllowed.length > 0) {
    const first = (rawAllowed[0] || "").toString().trim().toUpperCase();
    if (first === "LIHAT IM" || first === "DATA IM") return "/im-digital/dashboard/divisions/DATA%20IM/";
    if (first === "HISTORI PENGISIAN") return "/im-digital/dashboard/filling-history/";
    if (first === "LAUNCH CO") return "/im-digital/dashboard/";
    if (first === "INPUT SPEC CODE") return "/im-digital/dashboard/spec-code/";
    if (first === "SPEC CODE & PDF") return "/im-digital/dashboard/spec-code-pdf/";
    return `/im-digital/dashboard/divisions/${encodeURIComponent(rawAllowed[0])}/`;
  }

  return "/im-digital/dashboard/divisions/DATA%20IM/";
}
