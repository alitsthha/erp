import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";

import DashboardLayout from "@/app/layouts/DashboardLayout";
import ProtectedRoute, { AdminRoute } from "@/app/router/ProtectedRoute";

// ================= AUTH =================
import LoginPage from "@/features/auth/pages/LoginPage";

// ================= DASHBOARD =================
import DashboardPage from "@/features/dashboard/pages/DashboardPage";

// ================= ACTIVITIES =================
import ActivityListPage from "@/features/activities/pages/ActivityListPage";
import AddActivityPage from "@/features/activities/pages/AddActivityPage";
import EditActivityPage from "@/features/activities/pages/EditActivityPage";

// ================= STUDENTS =================
import StudentListPage from "@/features/students/pages/StudentListPage";
import AddStudentPage from "@/features/students/pages/AddStudentPage";
import EditStudentPage from "@/features/students/pages/EditStudentPage";
import StudentProfilePage from "@/features/students/pages/StudentProfilePage";

// ================= ENROLLMENTS =================
import EnrollmentListPage from "@/features/enrollments/pages/EnrollmentListPage";
import AddEnrollmentPage from "@/features/enrollments/pages/AddEnrollmentPage";
import EditEnrollmentPage from "@/features/enrollments/pages/EditEnrollmentPage";

// ================= ATTENDANCE =================
import AttendancePage from "@/features/attendance/pages/AttendancePage";
import AddAttendancePage from "@/features/attendance/pages/AddAttendancePage";
import EditAttendancePage from "@/features/attendance/pages/EditAttendancePage";
import StudentAttendanceDetailPage from "@/features/attendance/pages/StudentAttendanceDetailPage";

// ================= STAFF =================
import StaffListPage from "@/features/staff/pages/StaffListPage";
import AddStaffPage from "@/features/staff/pages/AddStaffPage";
import EditStaffPage from "@/features/staff/pages/EditStaffPage";

// ================= FINANCE =================
import FinancePage from "@/features/finance/pages/FinancePage";
import BillingPage from "@/features/finance/pages/BillingPage";
import IncomePage from "@/features/finance/pages/IncomePage";
import ExpensesPage from "@/features/finance/pages/ExpensesPage";
import PayrollPage from "@/features/finance/pages/PayrollPage";
import AccountsPage from "@/features/finance/pages/AccountsPage";

// ================= ACCOUNTING =================
import AccountingPage from "@/features/accounting/pages/AccountingPage";
import SalaryConfigPage from "@/features/accounting/pages/SalaryConfigPage";
import AddSalaryConfigPage from "@/features/accounting/pages/AddSalaryConfigPage";
import EditSalaryConfigPage from "@/features/accounting/pages/EditSalaryConfigPage";

// ================= STAFF =================

// ================= REPORTS =================
import ReportsPage from "@/features/reports/pages/ReportsPage";


// ================= SETTINGS =================
import SettingsPage from "@/features/settings/pages/SettingsPage";
import RoleAssignmentPage from "@/features/auth/pages/RoleAssignmentPage";
import { getLandingRouteForRole } from "@/lib/rbac";

function RootRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading...</div>;
  }

  if (!user || !role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getLandingRouteForRole(role)} replace />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================================
            PUBLIC ROUTES
        ===================================================== */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/"
          element={<RootRedirect />}
        />

        {/* =====================================================
            PROTECTED ROUTES
        ===================================================== */}

        <Route element={<ProtectedRoute />}>

          <Route element={<DashboardLayout />}>

            <Route
              path="/admin/assign-role"
              element={
                <AdminRoute>
                  <RoleAssignmentPage />
                </AdminRoute>
              }
            />

            {/* =================================================
                DASHBOARD
            ================================================= */}

            <Route
              path="/dashboard"
              element={<DashboardPage />}
            />

            {/* =================================================
                ACTIVITIES
            ================================================= */}

            <Route
              path="/activities"
              element={<ActivityListPage />}
            />

            <Route
              path="/activities/add"
              element={<AdminRoute><AddActivityPage /></AdminRoute>}
            />

            <Route
              path="/activities/edit/:activityId"
              element={<AdminRoute><EditActivityPage /></AdminRoute>}
            />

            {/* =================================================
                STUDENTS
            ================================================= */}

            <Route
              path="/students"
              element={<StudentListPage />}
            />

            <Route
              path="/students/add"
              element={
                <AdminRoute>
                  <AddStudentPage />
                </AdminRoute>
              }
            />

            <Route
              path="/students/edit/:studentId"
              element={<AdminRoute><EditStudentPage /></AdminRoute>}
            />

            <Route
              path="/students/profile/:studentId"
              element={<StudentProfilePage />}
            />

            {/* =================================================
                ENROLLMENTS
            ================================================= */}

            <Route
              path="/enrollments"
              element={<EnrollmentListPage />}
            />

            <Route
              path="/enrollments/add"
              element={<AdminRoute><AddEnrollmentPage /></AdminRoute>}
            />

            <Route
              path="/enrollments/edit/:enrollmentId"
              element={<AdminRoute><EditEnrollmentPage /></AdminRoute>}
            />

            {/* =================================================
                ATTENDANCE
            ================================================= */}

            <Route
              path="/attendance"
              element={<AttendancePage />}
            />

            <Route
              path="/attendance/add"
              element={<AddAttendancePage />}
            />

            <Route
              path="/attendance/edit/:attendanceId"
              element={<EditAttendancePage />}
            />

            <Route
              path="/attendance/student/:studentId/:dateBS"
              element={<StudentAttendanceDetailPage />}
            />

            {/* =================================================
                STAFF
            ================================================= */}

            <Route
              path="/staff"
              element={<AdminRoute><StaffListPage /></AdminRoute>}
            />

            <Route
              path="/staff/add"
              element={<AdminRoute><AddStaffPage /></AdminRoute>}
            />

            <Route
              path="/staff/edit/:staffId"
              element={<AdminRoute><EditStaffPage /></AdminRoute>}
            />

            {/* =================================================
                FINANCE
            ================================================= */}

            <Route
              path="/finance"
              element={<AdminRoute><FinancePage /></AdminRoute>}
            />

            <Route
              path="/finance/billing"
              element={<AdminRoute><BillingPage /></AdminRoute>}
            />

            <Route
              path="/finance/income"
              element={<AdminRoute><IncomePage /></AdminRoute>}
            />

            <Route
              path="/finance/expenses"
              element={<AdminRoute><ExpensesPage /></AdminRoute>}
            />

            {/* =================================================
                ACCOUNTING
            ================================================= */}

            <Route
              path="/accounting"
              element={<AdminRoute><AccountingPage /></AdminRoute>}
            />

            <Route
              path="/accounting/accounts"
              element={<AdminRoute><AccountsPage /></AdminRoute>}
            />

            <Route
              path="/accounting/salary-config"
              element={<AdminRoute><SalaryConfigPage /></AdminRoute>}
            />

            <Route
              path="/accounting/salary-config/add"
              element={<AdminRoute><AddSalaryConfigPage /></AdminRoute>}
            />

            <Route
              path="/accounting/salary-config/edit/:configId"
              element={<AdminRoute><EditSalaryConfigPage /></AdminRoute>}
            />

            <Route
              path="/accounting/payroll"
              element={<AdminRoute><PayrollPage /></AdminRoute>}
            />

            {/* =================================================
                REPORTS
            ================================================= */}

            <Route
              path="/reports"
              element={<AdminRoute><ReportsPage /></AdminRoute>}
            />

            {/* =================================================
                SETTINGS
            ================================================= */}

            <Route
              path="/settings"
              element={<SettingsPage />}
            />

          </Route>
        </Route>

        {/* =====================================================
            FALLBACK
        ===================================================== */}

        <Route
          path="*"
          element={<RootRedirect />}
        />

      </Routes>
    </BrowserRouter>
  );
}