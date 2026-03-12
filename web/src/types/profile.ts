export type ProfileColor = {
  bg: string;
  text: string;
  dot: string;
  border: string;
  bgMuted: string;
};

export type ProfileInfo = {
  name: string;
  friendly_name: string;
};

export type ProfilesApiResponse = {
  profiles: ProfileInfo[];
  active_profile: string | null;
};

export type ProfileState = {
  editingProfile: Record<string, string | null>;
  allProfileNames: string[];
  profileFriendlyNames: Map<string, string>;
  onSelectProfile: (
    camera: string,
    section: string,
    profile: string | null,
  ) => void;
  onDeleteProfileSection: (
    camera: string,
    section: string,
    profile: string,
  ) => void;
};
