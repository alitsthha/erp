import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Coins,
  Clock,
  Sliders,
  Bell,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Save,
  AlertCircle,
} from "lucide-react";

import {
  settingsSchema,
  type SettingsSchemaType,
} from "../schemas/settings.schema";
import {
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
} from "../services/settings.service";

type TabType = "organization" | "system" | "notifications";

export default function SettingsForm() {
  const [activeTab, setActiveTab] = useState<TabType>("organization");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsSchemaType>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: DEFAULT_SETTINGS,
  });

  const watchInstitutionName = watch("institutionName");
  const watchAcademicYear = watch("academicYear");
  const watchCurrency = watch("currency");
  const watchMaintenanceMode = watch("maintenanceMode");

  useEffect(() => {
    async function loadInitialSettings() {
      setIsLoading(true);
      try {
        const data = await getSettings();
        reset(data);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    }

    void loadInitialSettings();
  }, [reset]);

  const onSubmit = async (data: SettingsSchemaType) => {
    setSaveSuccess(null);
    setSaveError(null);

    try {
      await updateSettings(data);
      reset(data); // Re-set initial state so form is not dirty
      setSaveSuccess("Settings saved successfully!");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      console.error("Failed to update settings:", err);
      setSaveError(
        err?.message || "Failed to save settings. Please try again."
      );
    }
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all fields to standard system defaults?"
      )
    ) {
      reset(DEFAULT_SETTINGS);
      setSaveSuccess("Reset to default settings.");
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const inputClass = (hasError = false) =>
    `h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
        : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
    } disabled:bg-slate-50 disabled:cursor-not-allowed`;

  const selectClass = (hasError = false) =>
    `h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
        : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
    } disabled:bg-slate-50 disabled:cursor-not-allowed`;

  if (isLoading) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">
            Loading system settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto w-full max-w-5xl space-y-6"
    >
      {/* SUCCESS / ERROR ALERTS */}
      {saveSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800 shadow-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-medium">{saveSuccess}</p>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800 shadow-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium">{saveError}</p>
        </div>
      )}

      {/* HEADER CARD & PREVIEW SUMMARY */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Building2 size={24} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  System Configuration
                </span>
                {watchMaintenanceMode && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    <ShieldAlert size={12} />
                    Maintenance Mode Active
                  </span>
                )}
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Organization Settings
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage global academy details, fiscal preferences, and system alerts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs">
              <span className="block text-slate-400">Institution</span>
              <span className="font-semibold text-slate-800">
                {watchInstitutionName || "Academy"}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs">
              <span className="block text-slate-400">Fiscal Year</span>
              <span className="font-semibold text-slate-800">
                {watchAcademicYear}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs">
              <span className="block text-slate-400">Currency</span>
              <span className="font-semibold text-slate-800">
                {watchCurrency}
              </span>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex border-t border-slate-100 bg-slate-50/50 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("organization")}
            className={`flex items-center gap-2 border-b-2 py-4 px-4 text-sm font-medium transition ${
              activeTab === "organization"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 size={16} />
            Organization Profile
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`flex items-center gap-2 border-b-2 py-4 px-4 text-sm font-medium transition ${
              activeTab === "system"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders size={16} />
            System & Fiscal
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 border-b-2 py-4 px-4 text-sm font-medium transition ${
              activeTab === "notifications"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell size={16} />
            Notifications & Security
          </button>
        </div>
      </section>

      {/* TAB 1: ORGANIZATION PROFILE */}
      {activeTab === "organization" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Building2 size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Institution Identity & Contact Info
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  This information appears on invoices, certificates, and student reports.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
            {/* Institution Name */}
            <div className="md:col-span-2">
              <label
                htmlFor="institutionName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Institution Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="institutionName"
                  type="text"
                  placeholder="e.g. Acme Academy ERP"
                  {...register("institutionName")}
                  className={`pl-10 ${inputClass(Boolean(errors.institutionName))}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.institutionName && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.institutionName.message}
                </p>
              )}
            </div>

            {/* Code */}
            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Organization Code <span className="text-red-500">*</span>
              </label>
              <input
                id="code"
                type="text"
                placeholder="e.g. ERP-2026"
                {...register("code")}
                className={inputClass(Boolean(errors.code))}
                disabled={isSubmitting}
              />
              {errors.code && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.code.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Primary Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  type="email"
                  placeholder="admin@academy.edu"
                  {...register("email")}
                  className={`pl-10 ${inputClass(Boolean(errors.email))}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Contact Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="phone"
                  type="text"
                  placeholder="+977-1-4412345"
                  {...register("phone")}
                  className={`pl-10 ${inputClass(Boolean(errors.phone))}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.phone && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Website */}
            <div>
              <label
                htmlFor="website"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Website URL
              </label>
              <div className="relative">
                <Globe
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="website"
                  type="url"
                  placeholder="https://academy.edu"
                  {...register("website")}
                  className={`pl-10 ${inputClass(Boolean(errors.website))}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.website && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.website.message}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Physical Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
                />
                <textarea
                  id="address"
                  rows={2}
                  placeholder="Street Address, City, Country"
                  {...register("address")}
                  className={`pl-10 min-h-20 w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
                    errors.address
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
                      : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                  }`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.address && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* Tax ID / PAN */}
            <div>
              <label
                htmlFor="taxId"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Tax Registration ID / PAN
              </label>
              <div className="relative">
                <FileText
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="taxId"
                  type="text"
                  placeholder="PAN-302910482"
                  {...register("taxId")}
                  className={`pl-10 ${inputClass(Boolean(errors.taxId))}`}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: SYSTEM & FISCAL PREFERENCES */}
      {activeTab === "system" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Sliders size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Fiscal & Regional Preferences
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Configure active academic year, base currency, and time zone.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
            {/* Academic Year */}
            <div>
              <label
                htmlFor="academicYear"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Active Academic Year <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="academicYear"
                  type="text"
                  placeholder="e.g. 2081/2082 or 2025-2026"
                  {...register("academicYear")}
                  className={`pl-10 ${inputClass(Boolean(errors.academicYear))}`}
                  disabled={isSubmitting}
                />
              </div>
              {errors.academicYear && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.academicYear.message}
                </p>
              )}
            </div>

            {/* Currency */}
            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Base Currency <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Coins
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10"
                />
                <select
                  id="currency"
                  {...register("currency")}
                  className={`pl-10 ${selectClass(Boolean(errors.currency))}`}
                  disabled={isSubmitting}
                >
                  <option value="NPR (Rs.)">NPR (Nepalese Rupee - Rs.)</option>
                  <option value="USD ($)">USD (US Dollar - $)</option>
                  <option value="INR (₹)">INR (Indian Rupee - ₹)</option>
                  <option value="EUR (€)">EUR (Euro - €)</option>
                  <option value="GBP (£)">GBP (British Pound - £)</option>
                </select>
              </div>
              {errors.currency && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.currency.message}
                </p>
              )}
            </div>

            {/* TimeZone */}
            <div>
              <label
                htmlFor="timeZone"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                System Timezone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Clock
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10"
                />
                <select
                  id="timeZone"
                  {...register("timeZone")}
                  className={`pl-10 ${selectClass(Boolean(errors.timeZone))}`}
                  disabled={isSubmitting}
                >
                  <option value="Asia/Kathmandu (+05:45)">
                    Asia/Kathmandu (NPT +05:45)
                  </option>
                  <option value="Asia/Kolkata (+05:30)">
                    Asia/Kolkata (IST +05:30)
                  </option>
                  <option value="UTC (+00:00)">UTC (+00:00)</option>
                  <option value="America/New_York (-05:00)">
                    America/New_York (EST -05:00)
                  </option>
                  <option value="Europe/London (+00:00)">
                    Europe/London (GMT +00:00)
                  </option>
                </select>
              </div>
            </div>

            {/* Language */}
            <div>
              <label
                htmlFor="defaultLanguage"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Default System Language
              </label>
              <select
                id="defaultLanguage"
                {...register("defaultLanguage")}
                className={selectClass(Boolean(errors.defaultLanguage))}
                disabled={isSubmitting}
              >
                <option value="English">English</option>
                <option value="Nepali">Nepali (नेपाली)</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <label
                htmlFor="theme"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Application Theme
              </label>
              <select
                id="theme"
                {...register("theme")}
                className={selectClass(Boolean(errors.theme))}
                disabled={isSubmitting}
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode (Coming Soon)</option>
                <option value="system">System Default</option>
              </select>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: NOTIFICATIONS & SECURITY */}
      {activeTab === "notifications" && (
        <section className="space-y-6">
          {/* NOTIFICATION PREFERENCES */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Bell size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    System Alerts & Notifications
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Configure automated notifications sent to parents, staff, and admins.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {/* Email Notifications */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <input
                  type="checkbox"
                  {...register("enableEmailNotifications")}
                  disabled={isSubmitting}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-800">
                    Enable Email Alerts
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Send fee receipts, attendance summaries, and official announcements via email.
                  </span>
                </div>
              </label>

              {/* SMS Notifications */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <input
                  type="checkbox"
                  {...register("enableSmsNotifications")}
                  disabled={isSubmitting}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-800">
                    Enable SMS Notifications
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Send urgent SMS text messages for emergency closures and fee reminders.
                  </span>
                </div>
              </label>

              {/* Audit Logs */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <input
                  type="checkbox"
                  {...register("enableAuditLogs")}
                  disabled={isSubmitting}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-800">
                    Enable System Audit Logging
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Log administrative actions, login attempts, and data modifications for security tracking.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* SECURITY & CONTROLS */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    System Control & Maintenance
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Restrict public access or put the portal into maintenance mode.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {/* Maintenance Mode */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 transition hover:bg-amber-50">
                <input
                  type="checkbox"
                  {...register("maintenanceMode")}
                  disabled={isSubmitting}
                  className="mt-1 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="block text-sm font-semibold text-amber-900">
                    System Maintenance Mode
                  </span>
                  <span className="mt-1 block text-xs text-amber-700">
                    When enabled, non-admin users will see a maintenance notice and will not be able to perform edits.
                  </span>
                </div>
              </label>

              {/* Public Registration */}
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <input
                  type="checkbox"
                  {...register("allowPublicRegistration")}
                  disabled={isSubmitting}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-sm font-medium text-slate-800">
                    Allow Public Registration
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Allow new students or staff to register online via public registration link.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </section>
      )}

      {/* ACTION BAR */}
      <div className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200 bg-slate-50/95 px-3 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <RotateCcw size={16} />
            Reset Defaults
          </button>

          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="hidden text-xs font-medium text-amber-600 sm:inline">
                Unsaved changes
              </span>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
