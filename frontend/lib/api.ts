import type { Offer, Demand, Forecast, Match, MatchFind, Risk, Backtest } from "./types";

const USE_MOCK = true;
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function get<T>(path: string, mock: () => Promise<T>): Promise<T> {
  if (USE_MOCK) return mock();
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}

export const api = {
  offers: () =>
    get<Offer[]>("/offers", () => import("@/mock/offers.json").then((m) => m.default as Offer[])),
  demands: () =>
    get<Demand[]>("/demands", () => import("@/mock/demands.json").then((m) => m.default as Demand[])),
  forecast: (crop = "wheat", days = 60) =>
    get<Forecast>(`/forecast?crop=${crop}&days=${days}`, () =>
      import("@/mock/forecast.json").then((m) => m.default as unknown as Forecast)),
  match: (offerId: number, demandId: number) =>
    get<Match>(`/match?offer_id=${offerId}&demand_id=${demandId}`, () =>
      import("@/mock/match.json").then((m) => m.default as unknown as Match)),
  matchFind: (offerId: number) =>
    get<MatchFind>(`/match/find?offer_id=${offerId}`, () =>
      import("@/mock/match_find.json").then((m) => m.default as unknown as MatchFind)),
  risk: (offerId: number, demandId: number) =>
    get<Risk>(`/risk?offer_id=${offerId}&demand_id=${demandId}`, () =>
      import("@/mock/risk.json").then((m) => m.default as unknown as Risk)),
  backtest: (crop = "wheat", horizon = 60) =>
    get<Backtest>(`/backtest?crop=${crop}&horizon_days=${horizon}`, () =>
      import("@/mock/backtest.json").then((m) => m.default as unknown as Backtest)),
  contractUrl: (dealId: string, offerId: number, demandId: number) =>
    `${BASE}/contract/${dealId}?offer_id=${offerId}&demand_id=${demandId}`,
};