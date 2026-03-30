"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/", label: "Products" },
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#use-cases", label: "Use Cases" },
];

export function MarketingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between px-6 lg:px-10 xl:px-14">
        <Link href="/" className="flex items-center">
          <Image src="/internetpass_black.png" alt="Internet Passport logo" width={260} height={84} className="h-8 w-auto sm:h-9" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href as Route} className="nav-link-glow text-sm text-slate-600 transition hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href={"/login" as Route} className="nav-link-glow text-sm text-slate-600 transition hover:text-slate-900">
            Sign In
          </Link>
          <Link href={"/signup" as Route}>
            <Button
              size="sm"
              className="bg-black text-white hover:bg-zinc-800"
            >
              Get API Keys
            </Button>
          </Link>
        </div>

        <button
          onClick={() => setOpen((state) => !state)}
          aria-label="Toggle menu"
          className="rounded-md border border-card-border p-2 md:hidden"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-card-border px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href as Route}
                className="text-sm text-zinc-300"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center gap-2">
              <Link href={"/login" as Route} onClick={() => setOpen(false)}>
                <Button size="sm" variant="outline">
                  Sign In
                </Button>
              </Link>
              <Link href={"/signup" as Route} onClick={() => setOpen(false)}>
                <Button size="sm">Get API Keys</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
