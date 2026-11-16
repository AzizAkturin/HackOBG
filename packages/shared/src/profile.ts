// Account rules shared by the server (validation) and the web app (sign-up form).

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
export const USERNAME_HELP = "3 to 20 letters, numbers or underscores.";
export const RESERVED_USERNAMES = ["admin", "wab", "house", "operator", "owner", "moderator", "mod", "support", "system", "null", "undefined"];

/** Bump when the sign-up terms text changes; stored with each account. */
export const TERMS_VERSION = "2026-11-15";
export const TERMS = [
  "WAB runs on Monad testnet. MON here is play money with no value.",
  "MON can't be bought or cashed out through WAB.",
  "Bets and votes are public on-chain transactions from your wallet.",
];

/** Preset fan helmets. Colours only, drawn by the web app's RobotBadge. */
export const AVATARS = [
  { id: "ember", label: "Ember", primary: "#d9482b", secondary: "#2a2b2f", glow: "#ffb14a" },
  { id: "steel", label: "Steel", primary: "#8d96a3", secondary: "#2d3138", glow: "#7fe3ff" },
  { id: "volt", label: "Volt", primary: "#f2c230", secondary: "#1d1d1f", glow: "#fffbe0" },
  { id: "toxic", label: "Toxic", primary: "#3fbf5a", secondary: "#14281a", glow: "#c8ff6a" },
  { id: "frost", label: "Frost", primary: "#bfe6ff", secondary: "#3d6c8f", glow: "#4dd2ff" },
  { id: "royal", label: "Royal", primary: "#6a3fd1", secondary: "#f0c75e", glow: "#ffe08a" },
  { id: "blood", label: "Blood", primary: "#8f1424", secondary: "#e6dcd0", glow: "#ff3b3b" },
  { id: "ghost", label: "Ghost", primary: "#ecebe6", secondary: "#9a9890", glow: "#9bffde" },
] as const;

export type AvatarId = (typeof AVATARS)[number]["id"];
export const AVATAR_IDS = AVATARS.map((a) => a.id) as AvatarId[];
export const isAvatarId = (v: unknown): v is AvatarId => typeof v === "string" && (AVATAR_IDS as string[]).includes(v);

/** Returns null when the name is acceptable, otherwise the reason it is not. Uniqueness is checked by the server. */
export function usernameProblem(name: string): string | null {
  if (!USERNAME_RE.test(name)) return USERNAME_HELP;
  if (RESERVED_USERNAMES.includes(name.toLowerCase())) return "That name is reserved.";
  return null;
}
