/**
 * Hands a server-side validation refusal to the form that sent it, so the field the API named is
 * marked inline and listed under its own step in the "Can't save yet" summary — not left as a toast
 * the user has to map back to a control by hand.
 *
 * Why a registry and not a prop: every screen submits through its own `handleSubmit`, which catches
 * the failure and passes it to `useApiErrorToast`. The form never sees the error. Routing it from the
 * one place every failure already goes through means no screen has to wire anything — the form
 * component owns this, which is the point.
 *
 * Each mounted `FormGenerator` registers a sink. The most recently mounted one that actually HAS one
 * of the named fields takes the errors (a drawer opened over a page's filter bar is the newer of the
 * two, and a filter bar never registers). A refusal that names no field of any open form is left to
 * the toast alone.
 */

/** zod's `flatten()` shape, which the API's `validation_error` responses carry as `details`. */
interface ServerValidationDetails {
  formErrors?: unknown;
  fieldErrors?: Record<string, unknown>;
}

/** Returns true when it took the errors (it owns at least one of the named fields). */
type FormServerErrorSink = (fieldErrors: Record<string, string>) => boolean;

const sinks: FormServerErrorSink[] = [];

export function registerFormServerErrorSink(sink: FormServerErrorSink): () => void {
  sinks.push(sink);
  return () => {
    const index = sinks.lastIndexOf(sink);
    if (index >= 0) sinks.splice(index, 1);
  };
}

/** The first message per field from a `validation_error`'s `details`; `{}` when it names none. */
function serverFieldErrors(details: unknown): Record<string, string> {
  if (!details || typeof details !== "object") return {};
  const { fieldErrors } = details as ServerValidationDetails;
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
    const first = Array.isArray(messages)
      ? messages.find((m): m is string => typeof m === "string" && m.length > 0)
      : undefined;
    if (first) out[field] = first;
  }
  return out;
}

/** Offers a refusal's field errors to the open forms, newest first. True when one took them. */
export function routeServerValidationErrors(details: unknown): boolean {
  const fieldErrors = serverFieldErrors(details);
  if (Object.keys(fieldErrors).length === 0) return false;
  for (let i = sinks.length - 1; i >= 0; i--) {
    if (sinks[i]!(fieldErrors)) return true;
  }
  return false;
}
