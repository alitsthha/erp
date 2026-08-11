import AppRouter from "@/app/router/AppRouter";
import { AuthProvider } from "@/app/providers/AuthProvider";

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;