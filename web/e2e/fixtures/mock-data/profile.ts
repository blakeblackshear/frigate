/**
 * User profile factories for E2E tests.
 */

export interface UserProfile {
  username: string;
  role: string;
  allowed_cameras: string[] | null;
}

export function adminProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    username: "admin",
    role: "admin",
    allowed_cameras: null,
    ...overrides,
  };
}

export function viewerProfile(overrides?: Partial<UserProfile>): UserProfile {
  return {
    username: "viewer",
    role: "viewer",
    allowed_cameras: null,
    ...overrides,
  };
}

export function restrictedProfile(
  cameras: string[],
  overrides?: Partial<UserProfile>,
): UserProfile {
  return {
    username: "restricted",
    role: "viewer",
    allowed_cameras: cameras,
    ...overrides,
  };
}
