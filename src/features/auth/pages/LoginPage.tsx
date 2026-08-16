import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/app/providers/AuthProvider";
import { getLandingRouteForRole } from "@/lib/rbac";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, role, loading, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (role) {
        navigate(getLandingRouteForRole(role), { replace: true });
        return;
      }

      setError("This account is not assigned a role yet. Please contact the admin.");
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await login(email, password);

      if (result.success && result.role) {
        navigate(getLandingRouteForRole(result.role), { replace: true });
      } else {
        setError(
          result.error ||
            "Invalid email or password. Check the password and retry or contact support."
        );
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred during login. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleLogin}
        className="w-96 rounded-xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-6 text-center text-3xl font-bold text-slate-900">
          Academy ERP
        </h1>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mb-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded border border-slate-300 p-3 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full rounded border border-slate-300 p-3 pr-10 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-3.5 text-slate-400 transition hover:text-slate-600 focus:outline-none"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-blue-600 p-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}