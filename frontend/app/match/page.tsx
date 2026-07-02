"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import type { Offer, MatchFindItem, Risk, RiskLevel } from "@/lib/types";

const NAV_LINKS = [
  { href: "/", label: "Маркетплейс" },
  { href: "/forecast", label: "Прогноз цен" },
  { href: "/match", label: "Матчинг" },
  { href: "/backtest", label: "Бэктест" },
];

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const RISK_ICONS: Record<RiskLevel, string> = {
  low: "OK",
  medium: "!",
  high: "!!",
};

export default function MatchPage() {
  const pathname = usePathname();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [matches, setMatches] = useState<MatchFindItem[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedDemandId, setSelectedDemandId] = useState<number | null>(null);
  const [risk, setRisk] = useState<Risk | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [contractUrl, setContractUrl] = useState<string | null>(null);

  useEffect(() => {
    api.offers().then(setOffers).finally(() => setLoadingOffers(false));
  }, []);

  function handleSelectOffer(offer: Offer) {
    setSelectedOffer(offer);
    setMatches([]);
    setSelectedDemandId(null);
    setRisk(null);
    setContractUrl(null);
    setLoadingMatches(true);
    api.matchFind(offer.id).then((res) => setMatches(res.matches)).finally(() => setLoadingMatches(false));
  }

  function handleSelectDemand(demandId: number) {
    if (!selectedOffer) return;
    setSelectedDemandId(demandId);
    setRisk(null);
    setContractUrl(null);
    setLoadingRisk(true);
    api.risk(selectedOffer.id, demandId).then((r) => {
      setRisk(r);
      setContractUrl(api.contractUrl("new", selectedOffer.id, demandId));
    }).finally(() => setLoadingRisk(false));
  }

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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Матчинг сделок</h2>
          <p className="text-slate-500 text-sm">
            Выберите предложение — система подберёт лучших покупателей и оценит риски
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">Предложения</h3>
            {loadingOffers ? (
              <Spinner />
            ) : (
              <div className="space-y-2">
                {offers.map((offer) => (
                  <button key={offer.id} onClick={() => handleSelectOffer(offer)}
                    className={"w-full text-left rounded-xl border p-4 transition " +
                      (selectedOffer?.id === offer.id
                        ? "bg-emerald-50 border-emerald-400 shadow-sm"
                        : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm")}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">{offer.crop_name}</span>
                      <span className="text-xs text-slate-400">{offer.region}</span>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">{offer.user_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{offer.volume_tons} т · {offer.price_per_kg} руб/кг</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!selectedOffer && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                Выберите предложение слева для поиска покупателей
              </div>
            )}

            {selectedOffer && (
              <>
                {loadingMatches && <Spinner />}

                {!loadingMatches && matches.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">
                      Подходящие покупатели ({matches.length})
                    </h3>
                    <div className="space-y-3">
                      {matches.map((m) => (
                        <div key={m.demand_id} onClick={() => handleSelectDemand(m.demand_id)}
                          className={"bg-white rounded-xl border p-4 cursor-pointer transition " +
                            (selectedDemandId === m.demand_id
                              ? "border-emerald-400 shadow-md"
                              : "border-slate-200 hover:border-emerald-300 hover:shadow-sm")}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">{m.user_name}</p>
                              <p className="text-sm text-slate-500 mt-0.5">
                                {m.region} · {m.volume_tons} т · макс. {m.max_price_per_kg} руб/кг
                              </p>
                            </div>
                            <ScoreBadge score={m.match_score} label={m.label} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!loadingMatches && matches.length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
                    Совпадений не найдено
                  </div>
                )}

                {loadingRisk && <Spinner />}

                {risk && !loadingRisk && (
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div>
                        <h3 className="font-semibold text-slate-900">Риск-оценка сделки</h3>
                        <span className={"inline-block mt-0.5 px-3 py-0.5 rounded-full text-sm font-medium border " + RISK_COLORS[risk.risk_level]}>
                          {risk.risk_label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                      <RiskItem label="Ценовой риск" level={risk.breakdown.price_risk.level}
                        text={risk.breakdown.price_risk.label}
                        detail={"Коридор: " + risk.breakdown.price_risk.corridor[0] + "-" + risk.breakdown.price_risk.corridor[1] + " руб/кг"} />
                      <RiskItem label="Контрагент" level={risk.breakdown.counterparty_risk.level}
                        text={risk.breakdown.counterparty_risk.label}
                        detail={"Сделок: " + risk.breakdown.counterparty_risk.deals_count} />
                      <RiskItem label="Логистика" level={risk.breakdown.logistics_risk.level}
                        text={risk.breakdown.logistics_risk.label} detail="" />
                    </div>

                    {contractUrl && (
                      <a href={contractUrl} target="_blank" rel="noopener noreferrer"
                        className="block w-full text-center py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition text-sm">
                        Оформить контракт
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ScoreBadge({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score > 1 ? score : score * 100);
  const color = pct >= 80 ? "bg-emerald-100 text-emerald-800" : pct >= 60 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600";
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className={"px-2.5 py-1 rounded-lg text-sm font-bold " + color}>{pct}%</span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function RiskItem({ label, level, text, detail }: { label: string; level: RiskLevel; text: string; detail: string }) {
  return (
    <div className={"rounded-lg border p-3 " + RISK_COLORS[level]}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">{label}</p>
      <p className="text-sm font-medium">{text}</p>
      {detail && <p className="text-xs mt-1 opacity-70">{detail}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center gap-3 py-6 text-slate-400">
      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      Загрузка...
    </div>
  );
}
