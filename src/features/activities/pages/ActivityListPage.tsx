import { useSessionState } from "@/hooks/useSessionState";
import ListSortControl from "@/components/common/ListSortControl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ActivityFilters from "../components/ActivityFilters";
import ActivitySearch from "../components/ActivitySearch";
import ActivityTable from "../components/ActivityTable";
import { deleteActivity, getActivities } from "../services/activity.service";
import type { Activity } from "../types/activity.types";
import { ensureActivityColors } from "../services/activity-color.service";
import { useAuth } from "@/app/providers/AuthProvider";

export default function ActivityListPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useSessionState("activities:search", "");
  const [statusFilter, setStatusFilter] = useSessionState("activities:statusFilter", "all");

  const fetchActivities = useCallback(async () => {
    if (isAdmin) await ensureActivityColors();
    return getActivities();
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    void fetchActivities().then((data) => {
      if (!cancelled) { setActivities(data); setError(null); }
    }).catch((err) => {
      console.error(err);
      if (!cancelled) setError("Failed to load activities.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchActivities]);

  const filteredActivities = useMemo(() => {
    const term = search.trim().toLowerCase();

    return activities.filter((activity) => {
      const matchesSearch =
        !term ||
        activity.activityName.toLowerCase().includes(term) ||
        activity.activityCode.toLowerCase().includes(term) ||
        (activity.coachName ?? "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        activity.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [activities, search, statusFilter]);

  const handleDeleteActivity = async (activity: Activity) => {
    if (!activity.id) {
      return;
    }

    const confirmed = window.confirm(`Delete ${activity.activityName}?`);

    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      await deleteActivity(activity.id);
      setActivities(await fetchActivities());
      setError(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete activity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="ui-page-title">
            Activities
          </h1>
          <p className="text-sm text-slate-500">
            Manage academy activities and programs.
          </p>
        </div>

        <button
          onClick={() => navigate("/activities/add")}
          className="ui-button w-full bg-brand-600 py-3 text-white transition hover:bg-brand-700 sm:w-auto"
        >
          + Add Activity
        </button>
      </div>

      <div className="ui-surface flex flex-col gap-3 p-4 md:flex-row">
        <ActivitySearch value={search} onChange={setSearch} />
        <ListSortControl />
        <ActivityFilters value={statusFilter} onChange={setStatusFilter} />
      </div>

      {loading ? (
        <div className="sm:p-5 p-4 ui-surface text-center text-slate-500">
          Loading activities...
        </div>
      ) : error ? (
        <div className="sm:p-5 p-4 ui-surface text-center text-red-500">
          {error}
        </div>
      ) : (
        <ActivityTable
          activities={filteredActivities}
          onViewActivity={(activity) =>
            navigate(`/activities/edit/${activity.id}`)
          }
          onEditActivity={(activity) =>
            navigate(`/activities/edit/${activity.id}`)
          }
          onDeleteActivity={handleDeleteActivity}
        />
      )}
    </div>
  );
}
