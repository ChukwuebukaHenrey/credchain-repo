import { useEffect, useRef, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Camera,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
  /** Show the topbar chat button; clicking fires this (e.g. open Messages tab). */
  onMessagesClick?: () => void;
  /** Unread chat messages to show on the chat button. */
  messageCount?: number;
  /** When set, the sidebar avatar becomes an upload target for a new profile photo. */
  onAvatarSelect?: (file: File) => void;
  onLogout?: () => void;
  /** Include the Admin entry in the topbar profile menu. Issuer & verifier only. */
  showProfileMenu?: boolean;
  children: ReactNode;
}

const ROLE_ACCENT: Record<DashboardRole, { text: string; border: string; bg: string; ring: string; dot: string; label: string; avatarRing: string }> = {
  candidate: {
    text: "text-role-candidate",
    border: "border-role-candidate",
    bg: "bg-role-candidate-soft",
    ring: "focus:border-role-candidate",
    dot: "bg-role-candidate",
    label: "CANDIDATE",
    avatarRing: "from-role-candidate via-brand-purple to-brand-purple-dim",
  },
  issuer: {
    text: "text-role-issuer",
    border: "border-role-issuer",
    bg: "bg-role-issuer-soft",
    ring: "focus:border-role-issuer",
    dot: "bg-role-issuer",
    label: "ISSUER",
    avatarRing: "from-role-issuer via-brand-purple to-brand-purple-dim",
  },
  verifier: {
    text: "text-role-verifier",
    border: "border-role-verifier",
    bg: "bg-role-verifier-soft",
    ring: "focus:border-role-verifier",
    dot: "bg-role-verifier",
    label: "VERIFIER",
    avatarRing: "from-role-verifier via-brand-purple to-brand-purple-dim",
  },
};

export function roleAccent(role: DashboardRole) {
  return ROLE_ACCENT[role];
}

const COLLAPSE_KEY = "cc_sidebar_collapsed";

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
  onMessagesClick,
  messageCount,
  onAvatarSelect,
  onLogout,
  showProfileMenu = false,
  children,
}: DashboardShellProps) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop-only collapse (Claude-style icon rail). Persisted per browser.
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && window.localStorage.getItem(COLLAPSE_KEY) === "1"
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const accent = ROLE_ACCENT[role];
  const initials = user.initials || user.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  };

  // Close the profile dropdown on outside click / Escape.
  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

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

  const avatarBox = (size: string, rounded = "rounded-md") => (
    <div
      className={`group/avatar ${size} ${rounded} flex items-center justify-center font-mono text-sm font-semibold ${accent.bg} ${accent.text} border border-border-main flex-shrink-0 overflow-hidden relative`}
    >
      {user.photo ? (
        <img
          src={user.photo}
          alt={user.name}
          className={`w-full h-full ${user.photoFit === "contain" ? "object-contain p-0.5" : "object-cover object-[center_top]"}`}
        />
      ) : (
        initials
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-bg-base text-txt-primary flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen bg-bg-surface border-r border-border-main flex flex-col transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          collapsed ? "w-64 lg:w-[68px]" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Top: Logo + collapse toggle */}
        <div
          className={`h-[69px] border-b border-border-subtle flex items-center flex-shrink-0 ${
            collapsed ? "lg:justify-center lg:px-0 px-5 justify-between" : "px-5 justify-between"
          }`}
        >
          <span className={collapsed ? "lg:hidden" : ""}>
            <Logo wordmarkSize="sm" />
          </span>
          {/* Collapsed: logo mark only */}
          {collapsed && (
            <span className="hidden lg:block">
              <Logo wordmarkSize="sm" showWordmark={false} />
            </span>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-txt-muted hover:text-txt-primary p-1"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="group hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-md text-txt-muted hover:text-txt-primary hover:bg-bg-elevated transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4 icon-anim" strokeWidth={1.75} />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-border-subtle flex-shrink-0">
            <button
              onClick={toggleCollapsed}
              className="group inline-flex items-center justify-center w-9 h-9 rounded-md text-txt-muted hover:text-txt-primary hover:bg-bg-elevated transition-colors cursor-pointer"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 icon-anim" strokeWidth={1.75} />
            </button>
          </div>
        )}

        <div
          className={`px-5 py-3 border-b border-border-subtle font-mono text-[10px] tracking-[0.18em] uppercase flex-shrink-0 ${accent.text} ${
            collapsed ? "lg:hidden" : ""
          }`}
        >
          {accent.label} CONSOLE
        </div>

        {/* Nav groups */}
        <nav className={`flex-1 overflow-y-auto py-4 space-y-6 ${collapsed ? "px-3 lg:px-2.5" : "px-3"}`}>
          {navGroups.map((group) => (
            <div key={group.label}>
              <div
                className={`px-3 mb-2 font-mono text-[10px] tracking-[0.18em] uppercase text-txt-muted ${
                  collapsed ? "lg:hidden" : ""
                }`}
              >
                {group.label}
              </div>
              {/* Collapsed: thin divider stands in for the group label */}
              {collapsed && <div className="hidden lg:block mx-2 mb-2 border-t border-border-subtle" />}
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
                        title={item.label}
                        className={`group relative w-full flex items-center gap-3 rounded-md text-sm font-medium text-left transition-colors cursor-pointer ${
                          collapsed
                            ? "lg:justify-center lg:px-0 lg:py-2.5 justify-between px-3 py-2"
                            : "justify-between px-3 py-2"
                        } ${
                          isActive
                            ? `${accent.bg} ${accent.text} pl-[10px]`
                            : `text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated`
                        }`}
                      >
                        {/* Active indicator — a shared-layout bar that glides
                            between tabs instead of snapping on each switch. */}
                        {isActive && !collapsed && (
                          <motion.span
                            layoutId={`nav-indicator-${role}`}
                            className={`absolute left-0 top-0 bottom-0 w-[2px] rounded-full ${accent.dot}`}
                            transition={{ type: "spring", stiffness: 500, damping: 40 }}
                          />
                        )}
                        <span className={`flex items-center gap-3 ${collapsed ? "lg:gap-0" : ""}`}>
                          <span className="relative w-4 h-4 flex items-center justify-center icon-anim">
                            {item.icon}
                            {/* Collapsed: badge becomes a dot on the icon */}
                            {collapsed && item.badge !== undefined && item.badge !== null && Number(item.badge) > 0 && (
                              <span className={`hidden lg:block absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${accent.dot}`} />
                            )}
                          </span>
                          <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
                        </span>
                        {item.badge !== undefined && item.badge !== null && (
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm ${
                              isActive ? accent.bg : "bg-bg-elevated"
                            } ${accent.text} ${collapsed ? "lg:hidden" : ""}`}
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
        <div
          className={`border-t border-border-subtle p-4 flex items-center gap-3 flex-shrink-0 ${
            collapsed ? "lg:flex-col lg:p-3 lg:gap-2" : ""
          }`}
        >
          <div
            className={`group w-9 h-9 rounded-md flex items-center justify-center font-mono text-sm font-semibold ${accent.bg} ${accent.text} border border-border-main flex-shrink-0 overflow-hidden relative`}
          >
            {user.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                className={`w-full h-full ${user.photoFit === "contain" ? "object-contain p-0.5" : "object-cover object-[center_top]"}`}
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
          <div className={`flex-1 min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <div className="text-sm font-medium text-txt-primary truncate">{user.name}</div>
            {user.subtitle && (
              <div className="text-[11px] font-mono text-txt-muted truncate">{user.subtitle}</div>
            )}
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            className="group text-txt-muted hover:text-txt-primary p-1.5 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 icon-anim" strokeWidth={1.75} />
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

          {/* Right slot — pill user chip · bell · chat · avatar (topbar_component design) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {topbarRightExtra}
            <ThemeToggle />

            {/* User pill: avatar + stacked role/name + chevron → profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                aria-label="Account menu"
                aria-expanded={profileOpen}
                className="group inline-flex items-center gap-2 rounded-full border border-border-main bg-bg-surface hover:border-border-strong pl-1 pr-2 py-1 transition-colors duration-300 cursor-pointer"
              >
                {avatarBox("w-7 h-7", "rounded-full")}
                <span className="hidden md:flex flex-col items-start leading-tight text-left">
                  <span className="text-[10px] font-mono text-txt-muted uppercase tracking-wide">
                    {accent.label.toLowerCase()}
                  </span>
                  <span className="text-xs font-semibold text-txt-primary truncate max-w-[120px]">
                    {user.name}
                  </span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-txt-muted transition-transform duration-300 ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                  strokeWidth={2}
                />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 origin-top-right bg-bg-surface/95 backdrop-blur-sm border border-border-main rounded-2xl shadow-xl shadow-black/30 p-2 page-enter z-50">
                  {/* Identity header — gradient avatar ring echoing the kokonutui menu */}
                  <div className="flex items-center gap-3 px-2 py-2 mb-1">
                    <span className={`h-10 w-10 rounded-full bg-gradient-to-br ${accent.avatarRing} p-0.5 flex-shrink-0`}>
                      <span className="block h-full w-full rounded-full overflow-hidden bg-bg-base">
                        {avatarBox("w-full h-full", "rounded-full")}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-txt-primary truncate leading-tight">{user.name}</div>
                      {user.subtitle && (
                        <div className="text-[11px] font-mono text-txt-muted truncate mt-0.5 leading-tight">{user.subtitle}</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {showProfileMenu && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          navigate("/admin");
                        }}
                        className="group w-full flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm text-txt-secondary hover:text-txt-primary hover:border-border-main hover:bg-bg-elevated transition-all duration-200 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 icon-anim" strokeWidth={1.75} />
                        <span className="font-medium">Admin</span>
                      </button>
                    )}
                  </div>

                  {/* Gradient separator */}
                  <div className="my-2 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="group w-full flex items-center gap-2.5 rounded-xl border border-transparent bg-hash-red/10 px-3 py-2.5 text-sm text-hash-red hover:border-hash-red/30 hover:bg-hash-red/20 transition-all duration-200 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 icon-anim" strokeWidth={1.75} />
                    <span className="font-medium">Log out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bell with red count badge */}
            <button
              onClick={onNotificationsClick}
              aria-label="Notifications"
              className="group relative inline-flex items-center justify-center w-9 h-9 rounded-full text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated transition-colors duration-300 cursor-pointer"
            >
              <Bell className="w-[18px] h-[18px] icon-bell" strokeWidth={1.75} />
              {notificationCount !== undefined && notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center text-white bg-hash-red border-2 border-bg-base">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Chat bubble button */}
            {onMessagesClick && (
              <button
                onClick={onMessagesClick}
                aria-label="Messages"
                className="group relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-bg-elevated text-txt-secondary hover:text-txt-primary transition-colors duration-300 cursor-pointer"
              >
                <MessageCircle className="w-[18px] h-[18px] icon-anim" strokeWidth={1.75} />
                {messageCount !== undefined && messageCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center text-white bg-hash-red border-2 border-bg-base">
                    {messageCount}
                  </span>
                )}
              </button>
            )}

            {/* Standalone round avatar (far right, per design) */}
            <span className="hidden sm:block">{avatarBox("w-8 h-8", "rounded-full")}</span>
          </div>
        </header>

        {/* Page content — crossfade + rise on tab change. AnimatePresence with
            mode="wait" animates the old tab out before the new one enters. The
            global prefers-reduced-motion rule collapses these durations. */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
