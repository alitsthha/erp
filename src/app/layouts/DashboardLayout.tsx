import SessionExpiryNotice from "@/components/common/SessionExpiryNotice";
import FormSafetyProvider from "@/components/forms/FormSafetyProvider";
import { useListScroll } from "@/hooks/useListScroll";
import { useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ListSortProvider from "@/components/common/ListSortProvider";

import Header from "./Header";
import Sidebar from "./Sidebar";

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  useListScroll(mainRef, pathname);
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  return (
    <FormSafetyProvider><div className="fixed inset-0 flex h-dvh min-h-0 overflow-hidden bg-slate-50">

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

        <Header
          onMenuClick={() =>
            setSidebarOpen(true)
          }
        />

        <SessionExpiryNotice />
        <main ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            <ListSortProvider key={pathname}><Outlet /></ListSortProvider>
          </div>
        </main>

      </div>
    </div></FormSafetyProvider>
  );
}
