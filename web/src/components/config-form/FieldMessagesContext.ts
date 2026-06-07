import { createContext } from "react";
import type { FieldConditionalMessage } from "./section-configs/types";

// Provides currently-active field messages to FieldTemplate without going
// through RJSF's per-field uiSchema. RJSF caches state.uiSchema across renders
// in a way that can leave stale ui:messages attached to a field when the
// triggering condition flips back to false (see processPendingChange in
// @rjsf/core Form.js — formData is updated immediately, uiSchema is not).
// useContext re-runs consumers directly on provider value change, sidestepping
// that staleness.
export const FieldMessagesContext = createContext<FieldConditionalMessage[]>(
  [],
);
