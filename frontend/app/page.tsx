"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import type { Offer, Demand } from "@/lib/types";

type Tab = "offers" | "demands";
type CropFilter = "all" | "wheat" | "potato" | "sunflower";

const CROP_LABELS: Record<string, string> = {
  all: "Все культуры",
  wheat: "Пшеница",
  potato: "Картофель",
  sunflower: "Подсолнечник",
};

const NAV_LINKS = [
  { href: "/", label: "Маркетплейс" },
  { href: "/forecast", label: "Прогноз цен" },
  { href: "/match", label: "Матчинг" },
  { href: "/backtest", label: "Бэктест" },
  { href: "/create", label: "Разместить" },
];

export default function Home() {
  const pathname = usePathname();
  const [tab, setTab] = useState<Tab>("offers");
  const [crop, setCrop] = useState<CropFilter>("all");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.offers(), api.demands()])
      .then(([o, d]) => {
        setOffers(o);
        setDemands(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const items = tab === "offers" ? offers : demands;
  const filtered = crop === "all" ? items : items.filter((i) => i.crop === crop);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-emerald-600">AF</span>
            <h1 className="text-xl font-bold text-slate-900">
              Agro<span className="text-emerald-600">Forward</span>
            </h1>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}
                className={"px-4 py-1.5 rounded-lg text-sm font-medium transition " +
                  (pathname === link.href ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100")}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex gap-2 mb-6">
          <TabButton active={tab === "offers"} onClick={() => setTab("offers")}>
            Предложения ({offers.length})
          </TabButton>
          <TabButton active={tab === "demands"} onClick={() => setTab("demands")}>
            Спрос ({demands.length})
          </TabButton>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "wheat", "potato", "sunflower"] as CropFilter[]).map((c) => (
            <button key={c} onClick={() => setCrop(c)}
              className={"px-4 py-1.5 rounded-full text-sm font-medium transition " +
                (crop === c
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-400")}>
              {CROP_LABELS[c]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400">Загрузка...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-400">Ничего не найдено по этому фильтру.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <Card key={item.id} item={item} tab={tab} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={"px-5 py-2 rounded-lg font-medium transition " +
        (active ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100")}>
      {children}
    </button>
  );
}

function Card({ item, tab }: { item: Offer | Demand; tab: Tab }) {
  const isOffer = tab === "offers";
  const price = isOffer ? (item as Offer).price_per_kg : (item as Demand).max_price_per_kg;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-emerald-300 transition">
      <div className="flex items-start justify-between mb-3">
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
          {item.crop_name}
        </span>
        <span className={"text-xs font-medium px-2 py-0.5 rounded " + (isOffer ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700")}>
          {isOffer ? "Продажа" : "Закупка"}
        </span>
      </div>

      <h3 className="font-semibold text-slate-900 mb-1">{item.user_name}</h3>
      <p className="text-sm text-slate-500 mb-4">{item.region}</p>

      <div className="space-y-1.5 text-sm">
        <Row label="Объём" value={item.volume_tons + " т"} />
        <Row label={isOffer ? "Цена" : "Макс. цена"} value={price + " руб/кг"} />
        <Row label="Срок поставки" value={item.delivery_days + " дн."} />
      </div>

      {isOffer ? (
        <Link href="/match"
          className="mt-4 block text-center w-full py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition">
          Найти покупателей
        </Link>
      ) : (
        <Link href="/match"
          className="mt-4 block text-center w-full py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition">
          Найти поставщиков
        </Link>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
