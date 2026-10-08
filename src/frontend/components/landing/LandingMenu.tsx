"use client";

import { Menu } from "lucide-react";
import { useRef } from "react";

/** Phone-only menu for the landing page; closes itself after a link is tapped. */
export function LandingMenu({ links }: { links: { href: string; label: string }[] }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => menu.current?.removeAttribute("open");
  const item = "block rounded-lg px-3 py-2.5 text-sm text-blue-100/85 hover:bg-white/10 hover:text-white";
  return <details ref={menu} className="group relative lg:hidden">
    <summary aria-label="Open menu" className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg border border-white/15 text-white/85 hover:bg-white/10 [&::-webkit-details-marker]:hidden"><Menu className="h-5 w-5" /></summary>
    <div className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1733] p-2 shadow-2xl shadow-black/50">
      {links.map((link) => <a key={link.href} href={link.href} onClick={close} className={item}>{link.label}</a>)}
    </div>
  </details>;
}
