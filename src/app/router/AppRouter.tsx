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

// ================= ACCOUNTING =================
import AccountingPage from "@/features/accounting/pages/AccountingPage";
import SalaryConfigPage from "@/features/accounting/pages/SalaryConfigPage";
import AddSalaryConfigPage from "@/features/accounting/pages/AddSalaryConfigPage";
import EditSalaryConfigPage from "@/features/accounting/pages/EditSalaryConfigPage";

// ================= STAFF =================
import PaymentGrantPage from "@/features/staff/pages/PaymentGrantPage";

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
              element={<AddActivityPage />}
            />

            <Route
              path="/activities/edit/:activityId"
              element={<EditActivityPage />}
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
              element={<EditStudentPage />}
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
              element={<AddEnrollmentPage />}
            />

            <Route
              path="/enrollments/edit/:enrollmentId"
              element={<EditEnrollmentPage />}
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
              element={<StaffListPage />}
            />

            <Route
              path="/staff/add"
              element={<AddStaffPage />}
            />

            <Route
              path="/staff/edit/:staffId"
              element={<EditStaffPage />}
            />

            <Route
              path="/staff/payment/:staffId"
              element={<PaymentGrantPage />}
            />

            {/* =================================================
                FINANCE
            ================================================= */}

            <Route
              path="/finance"
              element={<FinancePage />}
            />

            <Route
              path="/finance/billing"
              element={<BillingPage />}
            />

            <Route
              path="/finance/income"
              element={<IncomePage />}
            />

            <Route
              path="/finance/expenses"
              element={<ExpensesPage />}
            />

            {/* =================================================
                ACCOUNTING
            ================================================= */}

            <Route
              path="/accounting"
              element={<AccountingPage />}
            />

            <Route
              path="/accounting/salary-config"
              element={<SalaryConfigPage />}
            />

            <Route
              path="/accounting/salary-config/add"
              element={<AddSalaryConfigPage />}
            />

            <Route
              path="/accounting/salary-config/edit/:configId"
              element={<EditSalaryConfigPage />}
            />

            <Route
              path="/accounting/payroll"
              element={<PayrollPage />}
            />

            <Route
              path="/accounting/payments/:staffId"
              element={<PaymentGrantPage />}
            />

            {/* =================================================
                REPORTS
            ================================================= */}

            <Route
              path="/reports"
              element={<ReportsPage />}
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