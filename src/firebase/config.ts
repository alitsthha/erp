import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

import { resolveFirebaseEnvironment } from "./environment";

const environment = resolveFirebaseEnvironment(import.meta.env, import.meta.env.MODE);
export const firebaseConfig = environment.config;
export const firebaseEnvironment = environment.target;

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

export default app;