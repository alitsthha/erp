import { Navigate, useParams } from "react-router-dom";

import ActivityForm from "../forms/ActivityForm";

export default function EditActivityPage() {
  const { activityId } = useParams<{
    activityId: string;
  }>();

  if (!activityId) {
    return (
      <Navigate
        to="/activities"
        replace
      />
    );
  }

  return (
    <div className="w-full">
      <ActivityForm
        activityId={activityId}
      />
    </div>
  );
}