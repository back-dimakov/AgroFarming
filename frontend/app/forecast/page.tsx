"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api } from "@/lib/api";
import type { Forecast } from "@/lib/types";

type Crop = "wheat" | "potato" | "sunflower";

const CROP_OPTIONS: { value: Crop; label: string; icon: string }[] = [
  { value: "wheat", label: "Пшеница", icon: "🌾" },
  { value: "potato", label: "Картофель", icon: "🥔" },
  { value: "sunflower", label: "Подсолнечник", icon: "🌻" },
];

const NAV_LINKS = [
  { href: "/", label: "Маркетплейс" },
  { href: "/forecast", label: "Прогноз цен" },
  { href: "/match", label: "Матчинг" },
  { href: "/backtest", label: "Бэктест" },
];

export default function ForecastPage() {
  const pathname = usePathname();
  const [crop, setCrop] = useState<Crop>("wheat");
  const [data, setData] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    api
      .forecast(crop, 60)
      .then(setData)
      .finally(() => setLoading(false));
  }, [crop]);

  const priceChange =
    data
      ? ((data.predicted_price - data.current_price) / data.current_price) * 100
      : 0;
  const priceUp = priceChange >= 0;

  // Recharts needs [low, high] as a range area — pass both values per point
  const chartData = data?.forecast.map((pt) => ({
    date: pt.date,
    price: pt.price,
    corridor: [pt.low, pt.high] as [number, number],
    low: pt.low,
    high: pt.high,
    is_forecast: pt.is_forecast,
  }));

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
        {/* Заголовок + селектор культуры */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Прогноз цен</h2>
            <p className="text-slate-500 text-sm">AI-прогноз динамики цен на 60 дней</p>
          </div>
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

        {/* Загрузка */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-24 text-slate-400">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            Загрузка прогноза…
          </div>
        )}

        {/* Основной контент */}
        {data && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* ===== Левая колонка: график ===== */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-baseline gap-3 mb-1">
                <h3 className="font-semibold text-slate-900">Динамика цены</h3>
                <span className="text-sm text-slate-400">{data.crop_name} · 60 дней</span>
              </div>
              <p className="text-xs text-slate-400 mb-5">
                Серая полоса — исторический коридор low/high, линия — цена
              </p>

              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v: string) => v.slice(5)} // MM-DD
                    interval={Math.floor((chartData?.length ?? 1) / 6)}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v: number) => `${v.toFixed(0)} ₽`}
                    domain={["auto", "auto"]}
                    width={52}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(2)} ₽/кг`,
                      name === "high"
                        ? "Макс."
                        : name === "low"
                        ? "Мин."
                        : "Цена",
                    ]}
                    labelFormatter={(label: string) => `Дата: ${label}`}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Legend
                    formatter={(value: string) =>
                      value === "high"
                        ? "Коридор (макс.)"
                        : value === "low"
                        ? "Коридор (мин.)"
                        : "Цена"
                    }
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  {/* Верхняя граница коридора */}
                  <Area
                    type="monotone"
                    dataKey="high"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    fill="#e2e8f0"
                    fillOpacity={0.5}
                    dot={false}
                    activeDot={false}
                  />
                  {/* Нижняя граница коридора — перекрывает заливку, создавая полосу */}
                  <Area
                    type="monotone"
                    dataKey="low"
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    fill="#f8fafc"
                    fillOpacity={1}
                    dot={false}
                    activeDot={false}
                  />
                  {/* Линия цены поверх */}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#059669" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ===== Правая колонка: AI-блок ===== */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Цены */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                  Сводка
                </p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Сейчас</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {data.current_price.toFixed(2)}{" "}
                      <span className="text-base font-medium text-slate-400">₽/кг</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-0.5">Через 60 дней</p>
                    <p className={`text-2xl font-bold ${
                      priceUp ? "text-emerald-600" : "text-red-500"
                    }`}>
                      {data.predicted_price.toFixed(2)}{" "}
                      <span className="text-base font-medium">
                        {priceUp ? "+" : ""}{priceChange.toFixed(1)}%
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* AI-анализ — только если есть */}
              {data.ai && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-base">🤖</span>
                    <h3 className="font-semibold text-slate-900 text-sm">AI-анализ</h3>
                    <span
                      className={`ml-auto text-xs px-2 py-0.5 rounded font-medium ${
                        data.ai.source === "claude"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {data.ai.source === "claude" ? "Claude AI" : "Fallback"}
                    </span>
                  </div>

                  {/* Две колонки факторов */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                        Факторы роста
                      </p>
                      <ul className="space-y-1.5">
                        {data.ai.factors_up.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-xs text-emerald-900"
                          >
                            <span className="text-emerald-500 shrink-0 mt-0.5">↑</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                        Факторы падения
                      </p>
                      <ul className="space-y-1.5">
                        {data.ai.factors_down.map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-1.5 text-xs text-red-900"
                          >
                            <span className="text-red-400 shrink-0 mt-0.5">↓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {data.ai.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
