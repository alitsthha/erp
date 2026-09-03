import { useAuth } from "@/app/providers/AuthProvider";
import SettingsForm from "../components/SettingsForm";
import StaffSelfProfileEdit from "../components/StaffSelfProfileEdit";
import FirestoreBackupPanel from "../components/FirestoreBackupPanel";

export default function SettingsPage() {
  const { isAdmin } = useAuth();

  return (
    <div className="w-full">
      {isAdmin ? (
        <>
          <SettingsForm />
          <FirestoreBackupPanel />
        </>
      ) : <StaffSelfProfileEdit />}
    </div>
  );
}