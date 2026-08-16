import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyCPy_fSz1TfZazP7If1JYfhdHaBHjS4Y3c",
  authDomain: "academy-erp-451f2.firebaseapp.com",
  projectId: "academy-erp-451f2",
  storageBucket: "academy-erp-451f2.firebasestorage.app",
  messagingSenderId: "421398081894",
  appId: "1:421398081894:web:0ae495180f3d8264e8d8a7",
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

export default app;