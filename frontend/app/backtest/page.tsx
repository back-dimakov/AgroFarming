"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import type { Backtest, BacktestWindow } from "@/lib/types";

type Crop = "wheat" | "potato" | "sunflower";
type Horizon = 30 | 60 | 90 | 180;

const CROP_OPTIONS: { value: Crop; label: string; icon: string }[] = [
  { value: "wheat", label: "Пшеница", icon: "🌾" },
  { value: "potato", label: "Картофель", icon: "🥔" },
  { value: "sunflower", label: "Подсолнечник", icon: "🌻" },
];

const HORIZON_OPTIONS: { value: Horizon; label: string }[] = [
  { value: 30, label: "1 мес." },
  { value: 60, label: "2 мес." },
  { value: 90, label: "3 мес." },
  { value: 180, label: "6 мес." },
];

const NAV_LINKS = [
  { href: "/", label: "Маркетплейс" },
  { href: "/forecast", label: "Прогноз цен" },
  { href: "/match", label: "Матчинг" },
  { href: "/backtest", label: "Бэктест" },
];

export default function BacktestPage() {
  const pathname = usePathname();
  const [crop, setCrop] = useState<Crop>("wheat");
  const [horizon, setHorizon] = useState<Horizon>(90);
  const [data, setData] = useState<Backtest | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    api
      .backtest(crop, horizon)
      .then(setData)
      .finally(() => setLoading(false));
  }, [crop, horizon]);

  const winColor =
    data && data.win_rate_pct >= 70
      ? "text-emerald-600"
      : data && data.win_rate_pct >= 50
      ? "text-amber-600"
      : "text-red-500";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌾</span>
            <h1 className="text-xl font-bold text-slate-900">
              Agro<span className="text-emerald-600">Forward</span>
            </h1>
          </div>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                  pathname === link.href
                    ? "bg-emerald-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Бэктест стратегии</h2>
          <p className="text-slate-500 text-sm">
            Историческая проверка эффективности форвардных контрактов
          </p>
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap gap-6 mb-8">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Культура</p>
            <div className="flex gap-2">
              {CROP_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCrop(c.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition border ${
                    crop === c.value
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400"
                  }`}
                >
                  <span>{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
              Горизонт контракта
            </p>
            <div className="flex gap-2">
              {HORIZON_OPTIONS.map((h) => (
                <button
                  key={h.value}
                  onClick={() => setHorizon(h.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                    horizon === h.value
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 py-12 justify-center text-slate-400">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            Расчёт бэктеста…
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Сводные метрики */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard
                label="Win Rate"
                value={`${data.win_rate_pct.toFixed(1)}%`}
                sub={`из ${data.n_windows} окон`}
                valueClass={winColor}
              />
              <MetricCard
                label="Медианное преимущество"
                value={`${data.median_advantage_pct > 0 ? "+" : ""}${data.median_advantage_pct.toFixed(1)}%`}
                sub="медиана по окнам"
                valueClass={data.median_advantage_pct >= 0 ? "text-emerald-600" : "text-red-500"}
              />
              <MetricCard
                label="Лучший результат"
                value={`+${data.best_advantage_pct.toFixed(1)}%`}
                sub="максимум"
                valueClass="text-emerald-600"
              />
              <MetricCard
                label="Худший результат"
                value={`${data.worst_advantage_pct.toFixed(1)}%`}
                sub="минимум"
                valueClass={data.worst_advantage_pct >= 0 ? "text-slate-900" : "text-red-500"}
              />
            </div>

            {/* Последний сценарий */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Последний сценарий</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Дата фиксации</p>
                  <p className="font-medium text-slate-900">{data.recent_scenario.lock_date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Дата поставки</p>
                  <p className="font-medium text-slate-900">{data.recent_scenario.delivery_date}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Зафиксированная цена</p>
                  <p className="font-medium text-slate-900">{data.recent_scenario.locked.toFixed(2)} ₽/кг</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Цена при поставке</p>
                  <p className="font-medium text-slate-900">{data.recent_scenario.delivery.toFixed(2)} ₽/кг</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-sm text-slate-500">Преимущество форварда: </span>
                <span
                  className={`text-sm font-bold ${
                    data.recent_scenario.advantage_pct >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {data.recent_scenario.advantage_pct > 0 ? "+" : ""}
                  {data.recent_scenario.advantage_pct.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* История окон */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">
                  История расчётных окон ({data.windows.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      {[
                        "Фиксация",
                        "Поставка",
                        "Зафикс. цена",
                        "Цена поставки",
                        "Преимущество",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.windows.map((w: BacktestWindow, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-3 text-slate-700">{w.lock_date}</td>
                        <td className="px-5 py-3 text-slate-700">{w.delivery_date}</td>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {w.locked.toFixed(2)} ₽
                        </td>
                        <td className="px-5 py-3 text-slate-700">{w.delivery.toFixed(2)} ₽</td>
                        <td className="px-5 py-3">
                          <span
                            className={`font-semibold ${
                              w.advantage_pct >= 0 ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {w.advantage_pct > 0 ? "+" : ""}
                            {w.advantage_pct.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}
