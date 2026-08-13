import {
  Activity as ActivityIcon,
  UserRound,
} from "lucide-react";

import type { Activity } from "../types/activity.types";
import ActivityActions from "./ActivityActions";

type Props = {
  activities: Activity[];
  onViewActivity: (activity: Activity) => void;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity: (activity: Activity) => void;
};

export default function ActivityTable({
  activities,
  onViewActivity,
  onEditActivity,
  onDeleteActivity,
}: Props) {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          <ActivityIcon size={22} />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-900">
          No activities found
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Try changing your search or status filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Desktop / Tablet Table */}

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Code
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Activity
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Coach
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Fee / Session
              </th>

              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {activities.map((activity) => {
              const feeVal =
                activity.feePerSession ??
                activity.sessionFee ??
                activity.fee;

              return (
                <tr
                  key={activity.id}
                  className="transition hover:bg-slate-50/70"
                >
                  <td className="whitespace-nowrap px-5 py-4">
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {activity.activityCode || "-"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">
                      {activity.activityName}
                    </div>

                    {activity.description && (
                      <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                        {activity.description}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {activity.category}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <UserRound
                        size={15}
                        className="text-slate-400"
                      />

                      {activity.coachName || "-"}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">
                    {typeof feeVal === "number"
                      ? `Rs. ${feeVal.toLocaleString()}`
                      : "-"}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={activity.status} />
                  </td>

                  <td className="px-5 py-4">
                    <ActivityActions
                      onView={() => onViewActivity(activity)}
                      onEdit={() => onEditActivity(activity)}
                      onDelete={() => onDeleteActivity(activity)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}

      <div className="divide-y divide-slate-100 md:hidden">
        {activities.map((activity) => {
          const feeVal =
            activity.feePerSession ??
            activity.sessionFee ??
            activity.fee;

          return (
            <div
              key={activity.id}
              className="p-4 transition hover:bg-slate-50/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ActivityIcon size={18} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {activity.activityName}
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      {activity.activityCode}
                    </p>
                  </div>
                </div>

                <StatusBadge status={activity.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoItem
                  label="Category"
                  value={activity.category}
                />

                <InfoItem
                  label="Coach"
                  value={activity.coachName || "-"}
                />

                <InfoItem
                  label="Fee / Session"
                  value={
                    typeof feeVal === "number"
                      ? `Rs. ${feeVal.toLocaleString()}`
                      : "-"
                  }
                />
              </div>

              {activity.description && (
                <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-500">
                  {activity.description}
                </p>
              )}

              <div className="mt-4 border-t border-slate-100 pt-3">
                <ActivityActions
                  onView={() => onViewActivity(activity)}
                  onEdit={() => onEditActivity(activity)}
                  onDelete={() => onDeleteActivity(activity)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: Activity["status"];
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        status === "Active"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}