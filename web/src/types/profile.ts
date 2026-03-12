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
  newProfiles: string[];
  allProfileNames: string[];
  profileFriendlyNames: Map<string, string>;
  onSelectProfile: (
    camera: string,
    section: string,
    profile: string | null,
  ) => void;
  onAddProfile: (id: string, friendlyName: string) => void;
  onRemoveNewProfile: (name: string) => void;
  onDeleteProfileSection: (
    camera: string,
    section: string,
    profile: string,
  ) => void;
};
