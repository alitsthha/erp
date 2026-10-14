export type FirebaseEnvironment = "demo" | "production";

const configFields = {
  apiKey: "VITE_FIREBASE_API_KEY",
  authDomain: "VITE_FIREBASE_AUTH_DOMAIN",
  projectId: "VITE_FIREBASE_PROJECT_ID",
  storageBucket: "VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId: "VITE_FIREBASE_APP_ID",
} as const;

export function resolveFirebaseEnvironment(
  env: Record<string, unknown>,
  mode: string,
) {
  if (mode !== "development" && mode !== "production") {
    throw new Error(`Unsupported Firebase mode "${mode}". Use npm run dev for demo or npm run build for production.`);
  }
  const target: FirebaseEnvironment = mode === "development" ? "demo" : "production";
  const filename = `.env.${mode}.local`;
  if (env.VITE_FIREBASE_ENVIRONMENT !== target) {
    throw new Error(`Set VITE_FIREBASE_ENVIRONMENT=${target} in ${filename}. Firebase will not fall back to another environment.`);
  }
  const config = {} as Record<keyof typeof configFields, string>;
  for (const [field, variable] of Object.entries(configFields)) {
    const value = typeof env[variable] === "string" ? env[variable].trim() : "";
    if (!value || value.startsWith("YOUR_")) {
      throw new Error(`Missing ${variable} for ${target} Firebase. Fill in ${filename} using the Firebase web app configuration.`);
    }
    config[field as keyof typeof configFields] = value;
  }
  return { config, target };
}
