import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  GraduationCap,
  ClipboardList,
  CalendarCheck,
  Wallet,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useSidebar } from "@/app/context/SidebarContext";

const menu = [
  { id: "dashboard", title: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "activities", title: "Activities", icon: Sparkles, path: "/activities" },
  { id: "students", title: "Students", icon: Users, path: "/students" },
  { id: "add-student", title: "Add Student", icon: GraduationCap, path: "/students/add" },
  { id: "enrollments", title: "Enrollment", icon: ClipboardList, path: "/enrollments" },
  { id: "attendance", title: "Attendance", icon: CalendarCheck, path: "/attendance" },
  {
    id: "finance",
    title: "Finance",
    icon: Wallet,
    children: [
      { id: "finance-overview", title: "Overview", path: "/finance" },
      { id: "finance-billing", title: "Billing & Payments", path: "/finance/billing" },
    ],
  },
  {
    id: "accounting",
    title: "Accounting",
    icon: BarChart3,
    children: [
      { id: "accounting-overview", title: "Overview", path: "/accounting" },
      { id: "accounting-salary", title: "Salary Config", path: "/accounting/salary-config" },
      { id: "accounting-payroll", title: "Payroll", path: "/accounting/payroll" },
    ],
  },
  { id: "reports", title: "Reports", icon: BarChart3, path: "/reports" },
  { id: "settings", title: "Settings", icon: Settings, path: "/settings" },
];

export default function SidebarNew() {
  const location = useLocation();
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const { collapsed, setCollapsed } = useSidebar();

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const toggle = (id: string) => setOpenIds((s) => ({ ...s, [id]: !s[id] }));
  const activePath = location.pathname;
  const renderedMenu = useMemo(() => menu, []);

  return (
    <aside className={`fixed left-0 top-0 z-40 ${collapsed ? "w-20" : "w-72 lg:w-72 xl:w-64"} bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-lg h-screen flex flex-col`}>
      <div className="border-b border-slate-800 p-3 flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 7h18M3 12h18M3 17h18" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          {!collapsed && (
            <div>
              <div className="text-lg font-bold">Academy ERP</div>
              <div className="text-xs text-slate-300">Admin Dashboard</div>
            </div>
          )}
        </div>

        <button onClick={toggleCollapse} className="p-2 rounded-md bg-white/5 hover:bg-white/10">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className={`p-2 ${collapsed ? "space-y-1" : "p-3 lg:p-4"}`}>
        {renderedMenu.map((item) => {
          const Icon = item.icon as any;

          if (item.children) {
            const isOpen = openIds[item.id] || item.children.some((c: any) => c.path === activePath);
            return (
              <div key={item.id} className="mb-1">
                <button
                  onClick={() => toggle(item.id)}
                  title={item.title}
                  className={`w-full flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-700 transition ${isOpen && !collapsed ? "bg-slate-700" : "text-slate-200"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center bg-white/6">
                      <Icon size={16} className="text-slate-200" />
                    </div>
                    {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                  </div>
                  {!collapsed && <div className="text-slate-300">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>}
                </button>

                {!collapsed && isOpen && (
                  <div className="mt-2 ml-2 flex flex-col gap-1">
                    {item.children.map((c: any) => (
                      <NavLink
                        key={c.path}
                        to={c.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                            isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
                          }`
                        }
                      >
                        <span className="ml-2">{c.title}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.title}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-2 py-2 mb-1 transition ${
                  isActive ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-slate-200 hover:bg-slate-700 hover:text-white"
                }`
              }
            >
              <div className="w-8 h-8 rounded-md flex items-center justify-center bg-white/6">
                <Icon size={16} />
              </div>
              {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto p-3 text-xs text-slate-400">
        {!collapsed ? (
          <>
            <div>© {new Date().getFullYear()} Academy</div>
            <div className="mt-1">Version 1.0</div>
          </>
        ) : (
          <div className="text-center">© {new Date().getFullYear()}</div>
        )}
      </div>
    </aside>
  );
}
