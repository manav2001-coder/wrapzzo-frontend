/**
 * There's one shared login for platform staff and company users today -- no per-request
 * "which surface" signal beyond the user's own email. This hardcoded check decides which
 * nav/routes a logged-in user sees. It is a UX-routing convenience only, never the
 * security boundary -- every backend endpoint is still gated by its own
 * @PreAuthorize/access-control-key check regardless of what this says.
 */
const SUPERADMIN_EMAILS = ['superadmin@wrapzzo.com']

export function isSuperAdmin(email?: string | null): boolean {
  return !!email && SUPERADMIN_EMAILS.includes(email.toLowerCase())
}
