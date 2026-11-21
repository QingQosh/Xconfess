"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/app/lib/i18n";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Feed",
  "/login": "Log in",
  "/register": "Create account",
  "/forgot-password": "Reset password",
  "/settings/account": "Account settings",
  "/settings/notifications": "Notification settings",
  "/settings/privacy": "Privacy settings",
  "/profile": "Profile",
  "/search": "Search",
  "/confessions": "Confessions",
  "/anchors": "Anchors",
  "/compare": "Compare confessions",
  "/messages": "Messages",
  "/analytics": "Analytics",
  "/admin": "Admin dashboard",
  "/admin/action-approvals": "Action approvals",
  "/admin/audit-logs": "Audit logs",
  "/admin/dashboard": "Admin dashboard",
  "/admin/diagnostics": "Diagnostics",
  "/admin/feature-flags": "Feature flags",
  "/admin/notifications": "Notification settings",
  "/admin/reports": "Reports",
  "/admin/templates": "Message templates",
  "/admin/users": "User management",
  "/dashboard": "Dashboard",
  "/dev/components": "Component playground",
  "/dev/notification-center": "Notification center preview",
  "/offline": "Offline",
  "/traction": "Traction",
  "/trending": "Trending",
  "/shared/confessions": "Shared confession",
};

const RTL_ROUTE_TITLES: Record<string, string> = {
  "/": "الصفحة الرئيسية",
  "/login": "تسجيل الدخول",
  "/register": "إنشاء حساب",
  "/forgot-password": "إعادة تعيين كلمة المرور",
  "/settings/account": "إعدادات الحساب",
  "/settings/notifications": "إعدادات الإشعارات",
  "/settings/privacy": "إعدادات الخصوصية",
  "/profile": "الملف الشخصي",
  "/search": "بحث",
  "/confessions": "الاعترافات",
  "/anchors": "المراسي",
  "/compare": "مقارنة الاعترافات",
  "/messages": "الرسائل",
  "/analytics": "التحليلات",
  "/admin": "لوحة الإدارة",
  "/dashboard": "لوحة التحكم",
  "/dev/components": "معرض المكونات",
  "/dev/notification-center": "معاينة مركز الإشعارات",
  "/offline": "غير متصل",
  "/traction": "مؤشرات التفاعل",
  "/trending": "الأكثر تداولًا",
  "/shared/confessions": "اعتراف مشترك",
};

function getRouteTitle(pathname: string, locale: string): string {
  const titles = locale === "ar" ? RTL_ROUTE_TITLES : ROUTE_TITLES;
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith("/confessions/")) {
    return locale === "ar" ? "تفاصيل الاعتراف" : "Confession detail";
  }
  if (pathname.startsWith("/shared/confessions/")) {
    return locale === "ar" ? "اعتراف مشترك" : "Shared confession";
  }
  return locale === "ar" ? "صفحة" : "Page";
}

export default function RouteAnnouncer() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const previousPathname = useRef(pathname);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const routeChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    const title = getRouteTitle(pathname, locale);
    document.title = `${title} | xConfess`;
    if (!routeChanged) return;

    setAnnouncement("");
    const announcementTimer = window.setTimeout(
      () => setAnnouncement(title),
      0,
    );
    return () => window.clearTimeout(announcementTimer);
  }, [pathname, locale]);

  return (
    <p
      key={pathname}
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {announcement}
    </p>
  );
}
