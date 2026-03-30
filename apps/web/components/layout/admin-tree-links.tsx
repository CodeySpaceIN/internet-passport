"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";

type AdminTreeLinksProps = {
  items: readonly { href: string; label: string }[];
};

export function AdminTreeLinks({ items }: AdminTreeLinksProps) {
  const pathname = usePathname();

  return (
    <div className="ml-5 space-y-1 border-l border-blue-800/80 pl-3">
      {items.map((child) => (
        <Link
          key={child.href}
          href={child.href as Route}
          prefetch
          scroll={false}
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
            pathname === child.href ? "bg-blue-500/20 font-medium text-white" : "text-slate-300 hover:bg-blue-900/40 hover:text-white"
          }`}
        >
          <span className="text-slate-500">•</span>
          <span>{child.label}</span>
        </Link>
      ))}
    </div>
  );
}
