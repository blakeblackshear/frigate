export type ProfileColor = {
  bg: string;
  text: string;
  dot: string;
  border: string;
  bgMuted: string;
};

export type ProfileState = {
  editingProfile: Record<string, string | null>;
  newProfiles: string[];
  allProfileNames: string[];
  onSelectProfile: (
    camera: string,
    section: string,
    profile: string | null,
  ) => void;
  onAddProfile: (name: string) => void;
  onRemoveNewProfile: (name: string) => void;
  onDeleteProfileSection: (
    camera: string,
    section: string,
    profile: string,
  ) => void;
};
