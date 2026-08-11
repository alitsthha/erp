import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
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

import { formatCurrency } from "@/utils/currency";

type Props = {
  activityId?: string;
};

const defaultValues: ActivityFormData = {
  activityCode: "",
  activityName: "",
  category: "",
  coachName: "",
  fee: "",
  sessionFee: "",
  description: "",
  status: "Active",
};

export default function ActivityForm({ activityId }: Props) {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema) as any,

    defaultValues,
  });

  const activityName = watch("activityName");
  const category = watch("category");
  const coachName = watch("coachName");
  const fee = watch("fee");
  const sessionFee = watch("sessionFee");
  const status = watch("status");

  /*
  ============================================================
  LOAD ACTIVITY FOR EDIT
  ============================================================
  */

  useEffect(() => {
    if (!activityId) {
      reset(defaultValues);
      return;
    }

    const loadActivity = async () => {
      try {
        const activity = await getActivityById(activityId);

        if (!activity) {
          alert("Activity not found.");
          navigate("/activities");
          return;
        }

        reset({
          activityCode: activity.activityCode ?? "",
          activityName: activity.activityName ?? "",
          category: activity.category ?? "",
          coachName: activity.coachName ?? "",

          fee:
            activity.fee !== undefined
              ? String(activity.fee)
              : "",

          sessionFee:
            activity.sessionFee !== undefined
              ? String(activity.sessionFee)
              : "",

          description: activity.description ?? "",
          status: activity.status ?? "Active",
        });
      } catch (error) {
        console.error("Failed to load activity:", error);

        alert("Failed to load activity.");

        navigate("/activities");
      }
    };

    void loadActivity();
  }, [activityId, navigate, reset]);

  /*
  ============================================================
  SUBMIT
  ============================================================
  */

  const onSubmit = async (data: ActivityFormData) => {
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

      alert(
        "Failed to save activity. Please try again."
      );
    }
  };

  /*
  ============================================================
  HELPERS
  ============================================================
  */

  const inputClass = (hasError = false) =>
    `h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
        : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
    }`;

  const textareaClass = (hasError = false) =>
    `w-full resize-none rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50"
        : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
    }`;

  const numericFee = useMemo(() => {
    const value = Number(fee);
    return Number.isFinite(value) ? value : 0;
  }, [fee]);

  const numericSessionFee = useMemo(() => {
    const value = Number(sessionFee);
    return Number.isFinite(value) ? value : 0;
  }, [sessionFee]);

  /*
  ============================================================
  FORM
  ============================================================
  */

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto w-full max-w-5xl space-y-6"
    >
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ActivityIcon size={24} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Academy Management
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {activityId
                  ? "Edit Activity"
                  : "Add Activity"}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {activityId
                  ? "Update activity information and pricing."
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

      {/* =====================================================
          ACTIVITY INFORMATION
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Layers3 size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
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

              <input
                id="coachName"
                type="text"
                placeholder="Enter instructor name"
                {...register("coachName")}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
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
          PRICING
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <BadgeDollarSign size={18} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Pricing
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Set the activity and per-session fees.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
          {/* Activity Fee */}

          <div>
            <label
              htmlFor="fee"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Activity Fee
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                Rs.
              </span>

              <input
                id="fee"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                {...register("fee")}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              Main activity or monthly fee.
            </p>

            {numericFee > 0 && (
              <p className="mt-2 text-xs font-medium text-emerald-600">
                Current fee: {formatCurrency(numericFee)}
              </p>
            )}
          </div>

          {/* Session Fee */}

          <div>
            <label
              htmlFor="sessionFee"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Per Session Fee
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                Rs.
              </span>

              <input
                id="sessionFee"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                {...register("sessionFee")}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              />
            </div>

            <p className="mt-1.5 text-xs text-slate-400">
              Used when calculating session-based billing.
            </p>

            {numericSessionFee > 0 && (
              <p className="mt-2 text-xs font-medium text-emerald-600">
                Per session:{" "}
                {formatCurrency(numericSessionFee)}
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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
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

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
              <BadgeDollarSign size={17} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                Session Fee
              </p>

              <p className="mt-0.5 truncate text-xl font-bold text-slate-900">
                {formatCurrency(numericSessionFee)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          STATUS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
              <h2 className="text-base font-semibold text-slate-900">
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
              className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
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
        <div className="mx-auto flex w-full max-w-5xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/activities")}
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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