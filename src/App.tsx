import { Toaster } from "react-hot-toast";
import AppRouter from "@/app/router/AppRouter";
import { AuthProvider } from "@/app/providers/AuthProvider";

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppRouter />
    </AuthProvider>
  );
}

export default App;