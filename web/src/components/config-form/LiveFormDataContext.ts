import { createContext } from "react";
import type { ConfigSectionData } from "@/types/configForm";

// Mirrors the current section's in-flight form data so widgets can react
// to changes that RJSF wouldn't otherwise re-render them for. RJSF's
// Form memoizes SchemaField via deep equality and, in some transitions
// (notably reverting a field to its saved value), can skip re-rendering
// a widget even though the form data it depends on changed. useContext
// re-runs consumers directly on every provider value update, sidestepping
// that.
export const LiveFormDataContext = createContext<ConfigSectionData | null>(
  null,
);
