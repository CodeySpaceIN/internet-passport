"use client";

import type { MouseEvent } from "react";
import { Card } from "@/components/ui/card";

type SpotlightCardProps = React.ComponentProps<typeof Card>;

export function SpotlightCard({ className, ...props }: SpotlightCardProps) {
  function handleMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    event.currentTarget.style.setProperty("--mx", `${x}px`);
    event.currentTarget.style.setProperty("--my", `${y}px`);
  }

  return <Card onMouseMove={handleMove} className={`spotlight-card ${className ?? ""}`} {...props} />;
}
