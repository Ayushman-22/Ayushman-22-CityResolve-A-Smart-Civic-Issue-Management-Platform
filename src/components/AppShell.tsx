import { useState, useEffect, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, LogOut, Menu, X, ChevronDown, LayoutDashboard, PlusCircle, ClipboardList, MapPin, BarChart3, type LucideIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ROLE_LABELS, ROLE_ROUTES } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types";

export function AppShell({ children, role }: { children: ReactNode; role: "citizen" | "officer" | "admin" }) {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, [profile]);

  const markAllRead = async () => {
    if (!profile) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", profile.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleSignOut = async () => {
    await signOut();
    toast("Signed out successfully", "info");
    navigate("/");
  };

  const navItems = getNavItems(role);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to={ROLE_ROUTES[role]} className="flex items-center gap-2.5">
                <img src="/city-logo.png" alt="CityResolve" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
                <div className="hidden sm:block">
                  <span className="text-lg font-bold text-slate-900">CityResolve</span>
                  <span className="ml-1.5 rounded-md bg-teal-50 px-1.5 py-0.5 text-xs font-semibold text-teal-700">
                    {ROLE_LABELS[role]}
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) markAllRead(); }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-bold text-slate-800">Notifications</p>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet</p>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="border-b border-slate-50 px-4 py-3 last:border-0">
                              <p className="text-sm text-slate-700">{n.message}</p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {new Date(n.created_at).toLocaleString()}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative hidden md:block">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                    {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="max-w-24 truncate font-medium">{profile?.full_name}</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-slate-100 bg-white px-4 py-3">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

function getNavItems(role: "citizen" | "officer" | "admin") {
  const items: { path: string; label: string; icon: LucideIcon }[] = [];
  if (role === "citizen") {
    items.push({ path: "/citizen", label: "Dashboard", icon: LayoutDashboard });
    items.push({ path: "/citizen/report", label: "Report Issue", icon: PlusCircle });
    items.push({ path: "/citizen/issues", label: "My Issues", icon: ClipboardList });
  } else if (role === "officer") {
    items.push({ path: "/officer", label: "Workspace", icon: LayoutDashboard });
    items.push({ path: "/officer/assigned", label: "Assigned Issues", icon: ClipboardList });
  } else {
    items.push({ path: "/admin", label: "Dashboard", icon: LayoutDashboard });
    items.push({ path: "/admin/issues", label: "All Issues", icon: ClipboardList });
    items.push({ path: "/admin/map", label: "Map View", icon: MapPin });
    items.push({ path: "/admin/analytics", label: "Analytics", icon: BarChart3 });
  }
  return items;
}
