import { browserTimezone } from "@/lib/datetime";

/**
 * The timezone every instant in the UI is rendered in. MobixFL reads a per-user setting from the
 * profile; Wrappzo has none, so it is this browser's zone. One hook, so a profile setting can be
 * added later in exactly one place.
 *
 * Date-only fields (date of birth, deadlines stored as dates) must NOT be formatted with this —
 * see `formatDateOnly` in @/lib/datetime.
 */
export function useUserTimezone(): string {
  return browserTimezone();
}
