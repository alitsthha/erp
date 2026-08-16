import { useEffect, useState, type FormEvent } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import { auth } from "@/lib/firebase";
import { getLandingRouteForRole } from "@/lib/rbac";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail === "alitshrestha74@gmail.com" &&
      password === "admin123"
    ) {
      window.localStorage.setItem(
        "erp_demo_session",
        JSON.stringify({
          uid: "demo-admin-user",
          email: normalizedEmail,
          role: "admin",
        })
      );

      setSubmitting(false);
      navigate("/dashboard", { replace: true });
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      setError("Invalid email or password. For immediate admin access, use alitshrestha74@gmail.com with password admin123.");
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
        onSubmit={login}
        className="w-96 rounded-xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-6 text-center text-3xl font-bold">
          Academy ERP
        </h1>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="mb-4 w-full rounded border p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="mb-4 w-full rounded border p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}