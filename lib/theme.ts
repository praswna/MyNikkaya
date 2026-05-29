export type Theme = "dark" | "light";

export const THEMES = {
  dark: {
    bg: "#2E2B28",
    bgSecondary: "#3A3630",
    border: "#3A3630",
    text: "#F5F0E8",
    textMuted: "#B8A898",
    textEmphasis: "#D4B896",
    textBold: "#E5C88A",
    categorySelected: "#7A6E62",
    categorySelectedText: "#F0D080",
    categoryBorder: "#4A4438",
    categoryText: "#B8A898",
    buttonPrimary: "#3A3630",
    buttonIcon: "#B8A898",
    rubyText: "#B8A898",
    scrollThumb: "#4A4438",
  },
  light: {
    bg: "#E5DED4",
    bgSecondary: "#D8D0C4",
    border: "#C8BEB0",
    text: "#2C2416",
    textMuted: "#7A6248",
    textEmphasis: "#7B5B3A",
    textBold: "#8B6914",
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
  textBold: string;
  categorySelected: string;
  categorySelectedText: string;
  categoryBorder: string;
  categoryText: string;
  buttonPrimary: string;
  buttonIcon: string;
  rubyText: string;
  scrollThumb: string;
};
