import { useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, Bell, Search, LogOut, Camera } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export type DashboardRole = "candidate" | "issuer" | "verifier";

export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface ShellUser {
  name: string;
  subtitle?: string;
  initials?: string;
  photo?: string | null;
  /** "contain" for logo-style photos that must not be cropped (default "cover"). */
  photoFit?: "cover" | "contain";
}

interface DashboardShellProps {
  role: DashboardRole;
  user: ShellUser;
  navGroups: NavGroup[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Optional content rendered in the topbar (e.g. page title, breadcrumbs). */
  topbarLeft?: ReactNode;
  /** Optional content rendered right of the bell (e.g. role-specific status badge). */
  topbarRightExtra?: ReactNode;
  /** Disable the default top search input. */
  hideSearch?: boolean;
  /** Search input change handler. */
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Number of unread notifications to show on the bell. */
  notificationCount?: number;
  onNotificationsClick?: () => void;
  /** When set, the sidebar avatar becomes an upload target for a new profile photo. */
  onAvatarSelect?: (file: File) => void;
  onLogout?: () => void;
  children: ReactNode;
}

const ROLE_ACCENT: Record<DashboardRole, { text: string; border: string; bg: string; ring: string; label: string }> = {
  candidate: {
    text: "text-role-candidate",
    border: "border-role-candidate",
    bg: "bg-role-candidate-soft",
    ring: "focus:border-role-candidate",
    label: "CANDIDATE",
  },
  issuer: {
    text: "text-role-issuer",
    border: "border-role-issuer",
    bg: "bg-role-issuer-soft",
    ring: "focus:border-role-issuer",
    label: "ISSUER",
  },
  verifier: {
    text: "text-role-verifier",
    border: "border-role-verifier",
    bg: "bg-role-verifier-soft",
    ring: "focus:border-role-verifier",
    label: "VERIFIER",
  },
};

export function roleAccent(role: DashboardRole) {
  return ROLE_ACCENT[role];
}

export default function DashboardShell({
  role,
  user,
  navGroups,
  activeTab,
  onTabChange,
  topbarLeft,
  topbarRightExtra,
  hideSearch = false,
  onSearchChange,
  searchPlaceholder = "Search…",
  notificationCount,
  onNotificationsClick,
  onAvatarSelect,
  onLogout,
  children,
}: DashboardShellProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const accent = ROLE_ACCENT[role];
  const initials = user.initials || user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("credchain_role");
        window.localStorage.removeItem("cc_user");
      }
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-txt-primary flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-bg-surface border-r border-border-main flex flex-col transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Top: Logo + role tag */}
        <div className="px-5 py-5 border-b border-border-subtle flex items-center justify-between">
          <Logo wordmarkSize="sm" />
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-txt-muted hover:text-txt-primary p-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`px-5 py-3 border-b border-border-subtle font-mono text-[10px] tracking-[0.18em] uppercase ${accent.text}`}>
          {accent.label} CONSOLE
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-2 font-mono text-[10px] tracking-[0.18em] uppercase text-txt-muted">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onTabChange(item.id);
                          setMobileOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium text-left transition-colors ${
                          isActive
                            ? `${accent.bg} ${accent.text} border-l-2 ${accent.border} pl-[10px]`
                            : "text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated border-l-2 border-transparent"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
                          <span>{item.label}</span>
                        </span>
                        {item.badge !== undefined && item.badge !== null && (
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${
                              isActive ? accent.bg : "bg-bg-elevated"
                            } ${accent.text}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom: User pill + logout */}
        <div className="border-t border-border-subtle p-4 flex items-center gap-3">
          <div
            className={`group w-9 h-9 rounded-md flex items-center justify-center font-mono text-sm font-semibold ${accent.bg} ${accent.text} border border-border-main flex-shrink-0 overflow-hidden relative`}
          >
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                className={`w-full h-full ${user.photoFit === "contain" ? "object-contain p-0.5" : "object-cover"}`}
              />
            ) : (
              initials
            )}
            {onAvatarSelect && (
              <label
                className="absolute inset-0 rounded-md bg-black/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity"
                title="Change profile photo"
              >
                <Camera className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden />
                <span className="sr-only">Change profile photo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onAvatarSelect(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-txt-primary truncate">{user.name}</div>
            {user.subtitle && (
              <div className="text-[11px] font-mono text-txt-muted truncate">{user.subtitle}</div>
            )}
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="text-txt-muted hover:text-txt-primary p-1.5 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-bg-base/90 backdrop-blur-[12px] border-b border-border-main flex items-center px-4 lg:px-8 gap-4">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-txt-secondary hover:text-txt-primary p-1"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Left content slot */}
          <div className="flex-1 flex items-center gap-4 min-w-0">
            {topbarLeft}
            {!hideSearch && (
              <div className="relative max-w-md w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-txt-muted" />
                <input
                  type="text"
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={`w-full bg-bg-surface border border-border-main pl-9 pr-3 py-2 rounded-md text-sm text-txt-primary placeholder:text-txt-muted focus:outline-none ${accent.ring} transition-colors`}
                />
              </div>
            )}
          </div>

          {/* Right slot */}
          <div className="flex items-center gap-3">
            {topbarRightExtra}
            <ThemeToggle />
            <button
              onClick={onNotificationsClick}
              aria-label="Notifications"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-md border border-border-main bg-bg-surface text-txt-secondary hover:text-txt-primary hover:border-brand-purple transition-colors"
            >
              <Bell className="w-4 h-4" strokeWidth={1.75} />
              {notificationCount !== undefined && notificationCount > 0 && (
                <span
                  className={`absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-sm text-[9px] font-mono font-bold flex items-center justify-center ${accent.text} ${accent.bg} border border-border-main`}
                >
                  {notificationCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
