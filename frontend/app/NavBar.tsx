"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Предложения" },
  { href: "/forecast", label: "Прогноз" },
  { href: "/backtest", label: "Бэктест" },
  { href: "/create", label: "Создать оффер" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center gap-6">
        <a href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <span className="text-xl">AF</span>
          Agro<span className="text-emerald-600">Forward</span>
        </a>
        <div className="flex gap-1 ml-4">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            const cls = active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-100";
            return (
              <a key={l.href} href={l.href} className={"px-3 py-1.5 rounded-lg text-sm font-medium transition " + cls}>
                {l.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
