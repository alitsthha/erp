import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { resolveFirebaseEnvironment } from "./src/firebase/environment.ts";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "VITE_FIREBASE_");
  const { config } = resolveFirebaseEnvironment(env, mode);
  const otherMode = mode === "development" ? "production" : "development";
  const otherProject = loadEnv(otherMode, __dirname, "VITE_FIREBASE_").VITE_FIREBASE_PROJECT_ID?.trim();
  if (otherProject && config.projectId === otherProject) {
    throw new Error("Demo and production must use different Firebase project IDs. Check .env.development.local and .env.production.local.");
  }
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
