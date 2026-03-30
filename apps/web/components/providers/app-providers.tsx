"use client";

import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
