import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ActivityFilters from "../components/ActivityFilters";
import ActivitySearch from "../components/ActivitySearch";
import ActivityTable from "../components/ActivityTable";
import { deleteActivity, getActivities } from "../services/activity.service";
import type { Activity } from "../types/activity.types";

export default function ActivityListPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadActivities = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getActivities();
      setActivities(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load activities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadActivities();
  }, []);

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

    try {
      await deleteActivity(activity.id);
      await loadActivities();
    } catch (err) {
      console.error(err);
      alert("Failed to delete activity.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">
            Activities
          </h1>
          <p className="text-sm text-gray-500 sm:text-base">
            Manage academy activities and programs.
          </p>
        </div>

        <button
          onClick={() => navigate("/activities/add")}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 sm:w-auto"
        >
          + Add Activity
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm md:flex-row">
        <ActivitySearch value={search} onChange={setSearch} />
        <ActivityFilters value={statusFilter} onChange={setStatusFilter} />
      </div>

      {loading ? (
        <div className="rounded-xl border bg-white p-6 text-center text-gray-500">
          Loading activities...
        </div>
      ) : error ? (
        <div className="rounded-xl border bg-white p-6 text-center text-red-500">
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