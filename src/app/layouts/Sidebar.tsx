import { useState } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/app/providers/AuthProvider";
import { hasModuleAccess, type ModuleName } from "@/lib/rbac";

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
  moduleKey?: ModuleName;
  children?: ChildMenu[];
};

const menu: MenuItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    moduleKey: "dashboard",
  },
  {
    title: "Assign Role",
    icon: UserCog,
    path: "/admin/assign-role",
  },
  {
    title: "Activities",
    icon: Sparkles,
    path: "/activities",
    moduleKey: "activities",
  },
  {
    title: "Students",
    icon: Users,
    moduleKey: "students",
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
    moduleKey: "enrollments",
  },
  {
    title: "Staff",
    icon: UserCog,
    moduleKey: "staff",
    children: [
      {
        title: "All Staff",
        path: "/staff",
      },
      {
        title: "Add Staff",
        path: "/staff/add",
      },
    ],
  },
  {
    title: "Attendance",
    icon: CalendarCheck,
    path: "/attendance",
    moduleKey: "attendance",
  },
  {
    title: "Finance",
    icon: Wallet,
    moduleKey: "billing",
    children: [
      { title: "Overview", path: "/finance" },
      { title: "Billing & Payments", path: "/finance/billing" },
      { title: "Income", path: "/finance/income" },
      { title: "Expenses", path: "/finance/expenses" },
    ],
  },
  {
    title: "Accounting",
    icon: BarChart3,
    moduleKey: "billing",
    children: [
      { title: "Overview", path: "/accounting" },
      { title: "Payroll", path: "/accounting/payroll" },
      { title: "Salary Config", path: "/accounting/salary-config" },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    path: "/reports",
    moduleKey: "reports",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
    moduleKey: "settings",
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
  const { role, isAdmin, permissions } = useAuth();
  const [expanded, setExpanded] = useState<
    Record<string, boolean>
  >({});

  // Filter menu items based on user permissions
  const filteredMenu = menu
    .filter((item) => {
      // Admin sees everything except "Assign Role" (shown separately)
      if (isAdmin) {
        return item.path !== "/admin/assign-role";
      }

      // Teachers see only modules they have access to
      if (item.moduleKey) {
        return hasModuleAccess(role, item.moduleKey, permissions);
      }

      // Items without moduleKey are hidden for teachers
      return false;
    })
    .map((item) => {
      if (!isAdmin && item.children) {
        return {
          ...item,
          children: item.children.filter((child) => child.path !== "/students/add"),
        };
      }
      return item;
    });

  // Build visible menu with proper structure
  const visibleMenu: MenuItem[] = isAdmin
    ? [
        filteredMenu[0],
        {
          title: "Assign Role",
          icon: UserCog,
          path: "/admin/assign-role",
        },
        ...filteredMenu.slice(1),
      ]
    : filteredMenu;

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
          flex h-full w-64 shrink-0 flex-col
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
        <div className="flex h-20 shrink-0 items-center border-b border-slate-200 bg-slate-50 px-4 py-2">
          <NavLink
              to="/dashboard"
              onClick={onClose}
              className="flex h-full items-center"
          >
            <img
                src="/yea-logo.png"
                alt="Young Explorers Academy"
                className="h-12 w-auto object-contain"
            />
          </NavLink>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================== */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {isAdmin ? "Admin Panel" : "My Modules"}
          </p>

          <div className="space-y-1">
            {visibleMenu.map((item) => {
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

      </aside>
    </>
  );
}