import { useState } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import {
  LayoutDashboard,
  Sparkles,
  Users,
  ClipboardList,
  CalendarCheck,
  Wallet,
  BarChart3,
  Settings,
  UserCog,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type ChildMenu = {
  title: string;
  path: string;
};

type MenuItem = {
  title: string;
  icon: LucideIcon;
  path?: string;
  children?: ChildMenu[];
};

const menu: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    title: "Activities",
    icon: Sparkles,
    path: "/activities",
  },
  {
    title: "Students",
    icon: Users,
    children: [
      {
        title: "Student List",
        path: "/students",
      },
      {
        title: "Add Student",
        path: "/students/add",
      },
    ],
  },
  {
    title: "Enrollment",
    icon: ClipboardList,
    path: "/enrollments",
  },
  {
    title: "Staff",
    icon: UserCog,
    children: [
      {
        title: "All Staff",
        path: "/staff",
      },
      {
        title: "Add Staff",
        path: "/staff/add",
      },
      {
        title: "Departments",
        path: "/staff/departments",
      },
      {
        title: "Roles",
        path: "/staff/roles",
      },
      {
        title: "Salary Configuration",
        path: "/staff/salary-config",
      },
    ],
  },
  {
    title: "Attendance",
    icon: CalendarCheck,
    path: "/attendance",
  },
    

  {
    title: "Finance",
    icon: Wallet,
    path: "/finance",
  },
  {
    title: "Reports",
    icon: BarChart3,
    path: "/reports",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<
    Record<string, boolean>
  >({
    Students: true,
    Staff: true,
    Expenses: false,
    Billing: false,
  });

  function toggleMenu(title: string) {
    setExpanded((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  }

  return (
    <>
      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
      ====================================================== */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          border-r border-slate-200
          bg-white
          shadow-sm
          transition-transform duration-200 ease-in-out
          lg:static
          lg:z-auto
          lg:translate-x-0
          lg:shadow-none
          ${
            open
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* =================================================
            LOGO / BRAND
        ================================================== */}
        <div className="flex h-20 shrink-0 items-center border-b border-slate-200 px-5">
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className="flex min-w-0 items-center gap-3"
          >
            {/* Logo */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
              <img
                src="/yea-logo.png"
                alt="Young Explorers Academy"
                className="h-full w-full object-contain"
              />
            </div>

            {/* Brand name */}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                Young Explorers
              </p>

              <p className="truncate text-xs font-medium text-slate-500">
                Academy ERP
              </p>
            </div>
          </NavLink>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================== */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Main Menu
          </p>

          <div className="space-y-1">
            {menu.map((item) => {
              const Icon = item.icon;

              {/* ===========================================
                  MENU WITH CHILDREN
              ============================================ */}
              if (item.children) {
                const isExpanded =
                  expanded[item.title];

                return (
                  <div key={item.title}>
                    {/* Parent menu button */}
                    <button
                      type="button"
                      onClick={() =>
                        toggleMenu(item.title)
                      }
                      className="
                        flex w-full items-center justify-between
                        rounded-xl px-3 py-2.5
                        text-sm font-medium
                        text-slate-600
                        transition
                        hover:bg-slate-50
                        hover:text-slate-900
                      "
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                          className="shrink-0"
                        />

                        <span>
                          {item.title}
                        </span>
                      </span>

                      {isExpanded ? (
                        <ChevronDown
                          size={16}
                          strokeWidth={1.8}
                          className="text-slate-400"
                        />
                      ) : (
                        <ChevronRight
                          size={16}
                          strokeWidth={1.8}
                          className="text-slate-400"
                        />
                      )}
                    </button>

                    {/* Child menu */}
                    {isExpanded && (
                      <div className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3">
                        {item.children.map(
                          (child) => (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              onClick={onClose}
                              className={({
                                isActive,
                              }) =>
                                `
                                block rounded-lg
                                px-3 py-2
                                text-sm
                                transition
                                ${
                                  isActive
                                    ? "bg-blue-50 font-semibold text-blue-600"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                }
                              `
                              }
                            >
                              {child.title}
                            </NavLink>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              {/* ===========================================
                  NORMAL MENU ITEM
              ============================================ */}

              return (
                <NavLink
                  key={item.path}
                  to={item.path!}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `
                    flex items-center gap-3
                    rounded-xl px-3 py-2.5
                    text-sm font-medium
                    transition
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `
                  }
                >
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className="shrink-0"
                  />

                  <span>{item.title}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* =================================================
            SIDEBAR FOOTER
        ================================================== */}
        <div className="shrink-0 border-t border-slate-200 p-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex items-center gap-3">
              {/* Small logo */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <img
                  src="/yea-logo.png"
                  alt="YEA"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-700">
                  Young Explorers Academy
                </p>

                <p className="mt-0.5 text-[10px] text-slate-400">
                  Management System
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}