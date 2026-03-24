export const Colors = {
  background: "#000000",
  surface: "#111111",
  border: "#222222",
  textPrimary: "#FFFFFF",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  accent: "#60A5FA",
  upvote: "#60A5FA",
  downvote: "#EF4444",
  white: "#FFFFFF",
} as const;

export const FontSizes = {
  xs: 11,
  sm: 13,
  base: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
} as const;

export const FontWeights = {
  regular: "Inter_400Regular" as const,
  medium: "Inter_500Medium" as const,
  semiBold: "Inter_600SemiBold" as const,
  bold: "Inter_700Bold" as const,
  mono: "JetBrainsMono_700Bold" as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
