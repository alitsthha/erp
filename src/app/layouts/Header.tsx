import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  Bell,
  LogOut,
  Settings,
  Shield,
  ChevronDown,
  Mail,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

type HeaderProps = {
  onMenuClick: () => void;
};

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { user, role, isAdmin, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setDropdownOpen(false);
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Failed to logout:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Compute display details
  const email = user?.email || "admin@academy.edu";
  const displayName =
    user?.displayName ||
    (email.includes("@")
      ? email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "User");
  const initial = displayName.charAt(0).toUpperCase() || "A";

  const formattedRole = role
    ? role
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "Administrator";

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4 sm:px-5 md:px-6">
        
        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={22} />
        </button>

        {/* Page Identity */}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-slate-900">
            Academy ERP
          </h2>

          <p className="hidden text-xs text-slate-500 sm:block">
            Welcome back, <span className="font-medium text-slate-700">{displayName}</span>
          </p>
        </div>

        {/* Search Input */}
        <div className="hidden w-64 md:block lg:w-72">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <Bell size={20} />
        </button>

        {/* Profile Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm">
              {initial}
            </div>

            <div className="hidden text-left lg:block">
              <p className="max-w-[120px] truncate text-xs font-semibold text-slate-800">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-500">
                {formattedRole}
              </p>
            </div>

            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180 text-slate-700" : ""
              }`}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-12 z-50 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
              
              {/* User Profile Info Card */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-bold text-white shadow-sm">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Mail size={12} className="shrink-0 text-slate-400" />
                    <span className="truncate">{email}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        isAdmin
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      <Shield size={10} />
                      {formattedRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu Links */}
              <div className="mt-2 space-y-0.5 border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  <Settings size={15} className="text-slate-400" />
                  <span>{isAdmin ? "Organization Settings" : "My Profile & Details"}</span>
                </button>
              </div>

              {/* Logout Button */}
              <div className="mt-1 border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <LogOut size={15} className="text-rose-500" />
                  <span>{isLoggingOut ? "Signing out..." : "Log Out Session"}</span>
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </header>
  );
}