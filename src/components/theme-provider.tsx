"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Toggles the `.dark` class shadcn's Tailwind `@custom-variant dark` relies
 * on. defaultTheme="system" keeps the previous behavior (auto-match OS
 * preference) instead of silently forcing light mode everywhere.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
