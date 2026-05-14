"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { WalletPanel } from "./wallet-panel";

const navItems = [
  ["Home", "/"],
  ["Mirror", "/create"],
  ["Genesis", "/create/genesis"],
  ["Spawn", "/create/spawn"],
  ["Gallery", "/gallery"],
  ["Docs", "/how-it-works"]
] as const;

function matchesPath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function activeHref(pathname: string) {
  const matched = navItems
    .map(([, href]) => href)
    .filter((href) => matchesPath(pathname, href))
    .sort((left, right) => right.length - left.length);

  return matched[0];
}

export function SiteHeader() {
  const pathname = usePathname();
  const currentHref = activeHref(pathname);

  return (
    <header className="relative z-20 mx-auto grid w-full max-w-[96rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-5 border-b border-white/10 px-7 py-5 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
      <Link href="/" className="flex min-w-0 items-center" aria-label="Ritual Mirror home">
        <Logo />
      </Link>
      <nav className="order-3 col-span-2 flex items-center gap-2 overflow-x-auto text-[#8a8f98] lg:order-none lg:col-span-1">
        {navItems.map(([label, href]) => {
          const active = currentHref === href;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "inline-flex h-9 shrink-0 items-center border px-3 font-mono text-[11px] uppercase tracking-[0.16em] transition-all duration-200 ease-out",
                active
                  ? "border-white/24 bg-white/[0.05] text-[#e7e9ed] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]"
                  : "border-transparent text-[#8a8f98] hover:border-white/14 hover:bg-white/[0.02] hover:text-[#e7e9ed]"
              ].join(" ")}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <WalletPanel />
    </header>
  );
}
