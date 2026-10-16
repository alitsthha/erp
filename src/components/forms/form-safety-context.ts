import { createContext } from "react";

export type FormSafetyEntry = { dirty: boolean; saving: boolean };
export const FormSafetyContext = createContext<Map<string, FormSafetyEntry> | null>(null);
