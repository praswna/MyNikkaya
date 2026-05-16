export type Theme = "dark" | "light";

export const THEMES = {
  dark: {
    bg: "#2E2B28",
    bgSecondary: "#3C3828",
    border: "#3C3828",
    text: "#F5F0E8",
    textMuted: "#C4A882",
    textEmphasis: "#D4B896",
    categorySelected: "#9B8B7E",
    categorySelectedText: "#FFD700",
    categoryBorder: "#5C4A32",
    categoryText: "#C4A882",
    buttonPrimary: "#3C3828",
    buttonIcon: "#C4A882",
    rubyText: "#C4A882",
    scrollThumb: "#5C4A32",
  },
  light: {
    bg: "#E5DED4",
    bgSecondary: "#D8D0C4",
    border: "#C8BEB0",
    text: "#2C2416",
    textMuted: "#7A6248",
    textEmphasis: "#6B4E32",
    categorySelected: "#9B8B7E",
    categorySelectedText: "#FFD700",
    categoryBorder: "#C4A882",
    categoryText: "#7A6248",
    buttonPrimary: "#D8D0C4",
    buttonIcon: "#5C4A32",
    rubyText: "#7A6248",
    scrollThumb: "#C4A882",
  },
} as const;

export type ThemeColors = {
  bg: string;
  bgSecondary: string;
  border: string;
  text: string;
  textMuted: string;
  textEmphasis: string;
  categorySelected: string;
  categorySelectedText: string;
  categoryBorder: string;
  categoryText: string;
  buttonPrimary: string;
  buttonIcon: string;
  rubyText: string;
  scrollThumb: string;
};
