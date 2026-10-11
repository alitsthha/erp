import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Activity as ActivityIcon,
  BadgeDollarSign,
  CheckCircle2,
  FileText,
  Layers3,
  UserRound,
} from "lucide-react";

import {
  activitySchema,
  type ActivityFormData,
} from "../schemas/activity.schema";

import {
  addActivity,
  getActivityById,
  updateActivity,
} from "../services/activity.service";

import { ensureActivityColors, subscribeActivityColors, ActivityColorConflict } from "../services/activity-color.service";
import { nextActivityColor, normalizeActivityColor, type ActivityColors } from "../utils/activity-color";

import { formatCurrency } from "@/utils/currency";
import { getStaff } from "@/features/staff/services/staff.service";
import type { Staff } from "@/features/staff/types/staff.types";

type Props = {
  activityId?: string;
};

const defaultValues: ActivityFormData = {
  activityCode: "",
  color: "",
  activityName: "",
  category: "",
  coachStaffId: "",
  coachName: "",
  countedMonthly: false,
  feePerMonth: "",
  feePerSession: "",
  description: "",
  status: "Active",
};

export default function ActivityForm({ activityId }: Props) {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [colors, setColors] = useState<ActivityColors>({});
  const [loadingColors, setLoadingColors] = useState(true);
  const [loadError, setLoadError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    control,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),

    defaultValues,
  });

  useEffect(() => {
    void getStaff().then((items) => setStaff(items.filter((item) => item.status !== "Inactive")));
  }, []);

  const color = useWatch({ control, name: "color" });
  const colorInUse = Object.entries(colors).some(([id, item]) => id !== activityId && item.color === normalizeActivityColor(color));
  const autoSelectColor = () => setValue("color", nextActivityColor(Object.entries(colors).filter(([id]) => id !== activityId).map(([, item]) => item.color)), { shouldValidate: true, shouldDirty: true });
  const activityName = useWatch({ control, name: "activityName" });
  const category = useWatch({ control, name: "category" });
  const coachName = useWatch({ control, name: "coachName" });
  const feePerSession = useWatch({ control, name: "feePerSession" });
  const countedMonthly = useWatch({ control, name: "countedMonthly" });
  const feePerMonth = useWatch({ control, name: "feePerMonth" });
  const status = useWatch({ control, name: "status" });

  /*
  ============================================================
  LOAD ACTIVITY FOR EDIT
  ============================================================
  */

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const loadActivity = async () => {
      try {
        const assignedColors = await ensureActivityColors();
        if (cancelled) return;
        setColors(assignedColors);
        unsubscribe = subscribeActivityColors(setColors, () => setLoadError("Could not check activity colors. Reload the page to retry."));
        if (!activityId) {
          reset({ ...defaultValues, color: nextActivityColor(Object.values(assignedColors).map((item) => item.color)) });
          return;
        }
        const activity = await getActivityById(activityId);
        if (cancelled) return;

        if (!activity) {
          alert("Activity not found.");
          navigate("/activities");
          return;
        }

        const feeVal = activity.countedMonthly
            ? activity.feePerMonth
            : (activity.feePerSession ??
                activity.sessionFee ??
                activity.fee);

        reset({
          activityCode: activity.activityCode ?? "",
          color: activity.color || assignedColors[activityId]?.color || "",
          activityName: activity.activityName ?? "",
          category: activity.category ?? "",
          coachStaffId: activity.coachStaffId ?? "",
          coachName: activity.coachName ?? "",

          countedMonthly: Boolean(activity.countedMonthly),
          feePerMonth:
              activity.feePerMonth !== undefined
                  ? String(activity.feePerMonth)
                  : "",
          feePerSession:
              feeVal !== undefined
                  ? String(feeVal)
                  : "",

          description: activity.description ?? "",
          status: activity.status ?? "Active",
        });
      } catch (error) {
        console.error("Failed to load activity:", error);

        if (!cancelled) setLoadError("Could not load the activity and its colors. Reload the page to retry.");
      } finally {
        if (!cancelled) setLoadingColors(false);
      }
    };

    void loadActivity();
    return () => { cancelled = true; unsubscribe?.(); };
  }, [activityId, navigate, reset]);

  /*
  ============================================================
  SUBMIT
  ============================================================
  */

  const onSubmit = async (data: ActivityFormData) => {
    if (loadingColors || loadError) return;
    if (colorInUse) { setError("color", { message: "This color is already used. Choose another or use Auto-select." }); return; }
    try {
      if (activityId) {
        await updateActivity(activityId, data);

        alert("Activity updated successfully.");
      } else {
        await addActivity(data);

        alert("Activity created successfully.");
      }

      navigate("/activities");
    } catch (error) {
      console.error("Failed to save activity:", error);

      if (error instanceof ActivityColorConflict) setError("color", { message: error.message });
      else alert(error instanceof Error ? error.message : "Failed to save activity. Please try again.");
    }
  };

  /*
  ============================================================
  HELPERS
  ============================================================
  */

  const inputClass = (hasError = false) =>
      `ui-field w-full bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
          hasError
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
              : "border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-50"
      }`;

  const textareaClass = (hasError = false) =>
      `w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
          hasError
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
              : "border-slate-300 focus:border-brand-600 focus:ring-2 focus:ring-brand-50"
      }`;

  const numericFeePerSession = useMemo(() => {
    const value = Number(feePerSession);
    return Number.isFinite(value) ? value : 0;
  }, [feePerSession]);
  const numericFeePerMonth = useMemo(() => {
    const value = Number(feePerMonth);
    return Number.isFinite(value) ? value : 0;
  }, [feePerMonth]);

  /*
  ============================================================
  FORM
  ============================================================
  */

  return (
      <form
          onSubmit={handleSubmit(onSubmit)}
          className="ui-page mx-auto w-full space-y-6"
      >
        {/* =====================================================
          PAGE HEADER
      ====================================================== */}

        <section className="ui-surface overflow-hidden">
          <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <ActivityIcon size={24} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  Academy Management
                </p>

                <h1 className="ui-page-title mt-1">
                  {activityId
                      ? "Edit Activity"
                      : "Add Activity"}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  {activityId
                      ? (countedMonthly ? "Update activity details and per-month pricing." : "Update activity details and per-session pricing.")
                      : "Create a new academy activity or program."}
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 size={14} />

              {activityId
                  ? "Editing activity"
                  : "Ready to create"}
            </div>
          </div>
        </section>

        {loadError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
        {loadingColors && <p role="status" className="text-sm text-slate-500">Assigning available activity colors…</p>}

        {/* =====================================================
          ACTIVITY INFORMATION
      ====================================================== */}

        <section className="ui-surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Layers3 size={18} />
              </div>

              <div>
                <h2 className="ui-section-title">
                  Activity Information
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Basic information about the academy program.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
            {/* Activity Name */}

            <div className="md:col-span-2">
              <label
                  htmlFor="activityName"
                  className="mb-2 block text-sm font-medium text-slate-700"
              >
                Activity Name{" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                  id="activityName"
                  type="text"
                  placeholder="Example: Dance, Music, Art"
                  {...register("activityName")}
                  className={inputClass(
                      Boolean(errors.activityName)
                  )}
              />

              {errors.activityName && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.activityName.message}
                  </p>
              )}
            </div>

            {/* Category */}

            <div>
              <label
                  htmlFor="category"
                  className="mb-2 block text-sm font-medium text-slate-700"
              >
                Category{" "}
                <span className="text-red-500">*</span>
              </label>

              <input
                  id="category"
                  type="text"
                  placeholder="Example: Arts, Music, Sports"
                  {...register("category")}
                  className={inputClass(
                      Boolean(errors.category)
                  )}
              />

              {errors.category && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.category.message}
                  </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="activity-color-hex" className="mb-2 block text-sm font-medium text-slate-700">Activity color <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap items-center gap-3">
                <input type="color" aria-label="Choose activity color" value={normalizeActivityColor(color) || "#2563EB"} disabled={loadingColors || Boolean(loadError)} onChange={(event) => setValue("color", event.target.value.toUpperCase(), { shouldValidate: true, shouldDirty: true })} className="h-11 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
                <div className="w-40"><input id="activity-color-hex" required maxLength={7} placeholder="#2563EB" spellCheck={false} aria-describedby="activity-color-help" aria-invalid={Boolean(errors.color) || colorInUse} {...register("color")} className={inputClass(Boolean(errors.color) || colorInUse)} /></div>
                <button type="button" disabled={loadingColors || Boolean(loadError)} onClick={autoSelectColor} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50">Auto-select</button>
              </div>
              <p id="activity-color-help" className="mt-2 text-xs text-slate-500">An unused color is selected automatically. Every activity has its own color on the calendar.</p>
              {(errors.color || colorInUse) && <p role="alert" className="mt-1 text-xs font-medium text-red-600">{colorInUse ? "This color is already used by another activity." : errors.color?.message}</p>}
            </div>

            {/* Coach */}

            <div>
              <label
                  htmlFor="coachName"
                  className="mb-2 block text-sm font-medium text-slate-700"
              >
                Coach / Instructor
              </label>

              <div className="relative">
                <UserRound
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                    id="coachStaffId"
                    {...register("coachStaffId", { onChange: (event) => {
                        const selected = staff.find((item) => item.id === event.target.value);
                        setValue("coachName", selected?.fullName ?? "");
                      } })}
                    className="ui-field w-full pl-10 pr-4 text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-50"
                >
                  <option value="">Select instructor</option>
                  {staff.map((member) => <option key={member.id} value={member.id}>{member.fullName} ({member.staffCode})</option>)}
                </select>
              </div>
            </div>

            {/* Description */}

            <div className="md:col-span-2">
              <label
                  htmlFor="description"
                  className="mb-2 block text-sm font-medium text-slate-700"
              >
                Description
              </label>

              <div className="relative">
                <FileText
                    size={17}
                    className="pointer-events-none absolute left-3 top-3.5 text-slate-400"
                />

                <textarea
                    id="description"
                    rows={4}
                    placeholder="Briefly describe this activity..."
                    {...register("description")}
                    className={`pl-10 ${textareaClass(
                        Boolean(errors.description)
                    )}`}
                />
              </div>

              {errors.description && (
                  <p className="mt-1.5 text-xs font-medium text-red-500">
                    {errors.description.message}
                  </p>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
          PRICING (SINGLE ACTIVITY FEE PER SESSION)
      ====================================================== */}

        <section className="ui-surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <BadgeDollarSign size={18} />
              </div>

              <div>
                <h2 className="ui-section-title">
                  Activity Pricing
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {countedMonthly ? "Set the fee charged monthly for this activity." : "Set the single per‑session fee for this activity."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="w-full sm:max-w-md">
              {/* =============================================
                CHECKBOX – now placed ABOVE the fee label
            ============================================== */}

              <div className="mb-3 flex items-center gap-2">
                <input
                    id="countedMonthly"
                    type="checkbox"
                    {...register("countedMonthly")}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label
                    htmlFor="countedMonthly"
                    className="text-sm font-medium text-slate-700"
                >
                  Counted monthly
                </label>
              </div>

              {/* Fee label – now sits below the checkbox */}

              <label
                  htmlFor={countedMonthly ? "feePerMonth" : "feePerSession"}
                  className="mb-2 block text-sm font-medium text-slate-700"
              >
                {countedMonthly
                    ? "Activity Fee per Month (Rs.)"
                    : "Activity Fee per Session (Rs.)"}
              </label>

              {/* Fee input */}

              <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                Rs.
              </span>

                {!countedMonthly ? (
                    <input
                        id="feePerSession"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...register("feePerSession")}
                        className="ui-field w-full pl-12 pr-4 font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-50"
                    />
                ) : (
                    <input
                        id="feePerMonth"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...register("feePerMonth")}
                        className="ui-field w-full pl-12 pr-4 font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-50"
                    />
                )}
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                {countedMonthly
                    ? "Fee charged monthly for this activity regardless of attendance."
                    : "Fee charged per session for students attending this activity."}
              </p>

              {!countedMonthly && numericFeePerSession > 0 && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    Current rate: {formatCurrency(numericFeePerSession)} / session
                  </p>
              )}
              {countedMonthly && numericFeePerMonth > 0 && (
                  <p className="mt-2 text-xs font-medium text-emerald-600">
                    Current rate: {formatCurrency(numericFeePerMonth)} / month
                  </p>
              )}
            </div>
          </div>
        </section>

        {/* =====================================================
          ACTIVITY SUMMARY
      ====================================================== */}

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Activity */}

          <div className="ui-surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <ActivityIcon size={17} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Activity
                </p>

                <p className="mt-0.5 truncate font-semibold text-slate-900">
                  {activityName || "Not entered"}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              {category || "No category selected"}
            </div>
          </div>

          {/* Instructor */}

          <div className="ui-surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <UserRound size={17} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Instructor
                </p>

                <p className="mt-0.5 truncate font-semibold text-slate-900">
                  {coachName || "Not assigned"}
                </p>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Coach / Instructor
            </div>
          </div>

          {/* Fee */}

          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
                <BadgeDollarSign size={17} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                  {countedMonthly ? "Fee per Month" : "Fee per Session"}
                </p>

                <p className="mt-0.5 truncate text-xl font-bold text-slate-900">
                  {formatCurrency(countedMonthly ? numericFeePerMonth : numericFeePerSession)} {countedMonthly ? "/ month" : "/ session"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
          STATUS
      ====================================================== */}

        <section className="ui-surface overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      status === "Active"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                  }`}
              >
                <CheckCircle2 size={18} />
              </div>

              <div>
                <h2 className="ui-section-title">
                  Activity Status
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Control whether this activity is currently available.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="w-full sm:max-w-md">
              <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                  id="status"
                  {...register("status")}
                  className="ui-field w-full px-4 font-medium text-slate-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-50"
              >
                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>
              </select>

              <p className="mt-1.5 text-xs text-slate-400">
                Inactive activities remain in your records.
              </p>
            </div>
          </div>
        </section>

        {/* =====================================================
          ACTION BAR
      ====================================================== */}

        <div className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200 bg-slate-50/95 px-3 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="ui-page mx-auto flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
                type="button"
                onClick={() => navigate("/activities")}
                disabled={isSubmitting}
                className="ui-button inline-flex w-full items-center justify-center border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>

            <button
                type="submit"
                disabled={isSubmitting || loadingColors || Boolean(loadError) || colorInUse}
                className="ui-button inline-flex w-full items-center justify-center bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting
                  ? "Saving..."
                  : activityId
                      ? "Update Activity"
                      : "Create Activity"}
            </button>
          </div>
        </div>
      </form>
  );
}