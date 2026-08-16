import {
  Menu,
  Search,
  Bell,
} from "lucide-react";

type HeaderProps = {
  onMenuClick: () => void;
};

export default function Header({
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-full items-center gap-3 px-4 sm:px-5 md:px-6">

        {/* Mobile Menu */}
        <button
          onClick={onMenuClick}
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
            Welcome back
          </p>
        </div>

        {/* Search */}
        <div className="hidden w-64 md:block lg:w-72">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search
              size={18}
              className="text-slate-400"
            />

            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Notification */}
        <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
          <Bell size={20} />
        </button>

        {/* Profile */}
        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          A
        </button>

      </div>
    </header>
  );
}