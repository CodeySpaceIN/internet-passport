import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { Github, Linkedin, Twitter } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="footer-dark border-t border-white/[0.06] bg-neutral-950 text-zinc-300">
      <div className="grid w-full gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-5 lg:px-10 xl:px-14">
        <div>
          <div className="flex items-center">
            <Image
              src="/internetpass_wide.png"
              alt="Internet Passport logo"
              width={280}
              height={90}
              className="h-8 w-auto brightness-0 invert sm:h-9"
            />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
            Trust infrastructure for the AI internet. Verify users, organizations, and autonomous
            actions with cryptographic accountability.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Product
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link
              href={"/" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Overview
            </Link>
            <Link
              href={"/pricing" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href={"/docs" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Docs
            </Link>
            <Link
              href={"/#use-cases"}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Use Cases
            </Link>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Developers
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link
              href={"/docs" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Docs
            </Link>
            <Link
              href="https://github.com"
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              GitHub
            </Link>
            <Link
              href={"/docs" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Status
            </Link>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Company
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link
              href={"/about" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              About
            </Link>
            <Link
              href={"/login" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href={"/signup" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Get API Keys
            </Link>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Legal</p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link
              href={"/docs" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Privacy
            </Link>
            <Link
              href={"/docs" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Terms
            </Link>
            <Link
              href={"/docs" as Route}
              className="footer-link text-zinc-400 transition-colors duration-200 hover:text-white"
            >
              Security
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-neutral-950">
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 text-xs lg:px-10 xl:px-14">
          <p className="text-zinc-400">© {new Date().getFullYear()} Internet Passport. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com"
              aria-label="GitHub"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Github className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Link>
            <Link
              href="https://x.com"
              aria-label="X"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Twitter className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Link>
            <Link
              href="https://linkedin.com"
              aria-label="LinkedIn"
              className="text-zinc-400 transition-colors hover:text-zinc-100"
            >
              <Linkedin className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
