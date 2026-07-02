// ---- Offer (фермер продаёт) ----
export interface Offer {
  id: number;
  user_name: string;
  crop: "wheat" | "potato" | "sunflower";
  crop_name: string;
  region: string;
  volume_tons: number;
  price_per_kg: number;
  delivery_days: number;
  quality?: string;
  created_at?: string;
}
export type OfferCreate = Omit<Offer, "id" | "created_at">;

// ---- Demand (закупщик покупает) ----
export interface Demand {
  id: number;
  user_name: string;
  crop: "wheat" | "potato" | "sunflower";
  crop_name: string;
  region: string;
  volume_tons: number;
  max_price_per_kg: number;
  delivery_days: number;
  requirements?: string;
  deals_count?: number;
  created_at?: string;
}
export type DemandCreate = Omit<Demand, "id" | "created_at">;

// ---- Forecast ----
export interface ForecastPoint {
  date: string;
  price: number;
  low: number;
  high: number;
  is_forecast: boolean;
}
export interface ForecastAI {
  factors_up: string[];
  factors_down: string[];
  explanation: string;
  source: "claude" | "fallback";
}
export interface Forecast {
  crop: string;
  crop_name: string;
  current_price: number;
  predicted_price: number;
  horizon_days: number;
  forecast: ForecastPoint[];
  ai?: ForecastAI;
}

// ---- Match ----
export interface MatchAxis {
  score: number;
  label: string;
  weight: number;
}
export interface Match {
  match_score: number;
  label: string;
  breakdown: {
    price: MatchAxis;
    volume: MatchAxis;
    region: MatchAxis;
    timing: MatchAxis;
  };
}
export interface MatchFindItem {
  demand_id: number;
  user_name: string;
  region: string;
  volume_tons: number;
  max_price_per_kg: number;
  match_score: number;
  label: string;
}
export interface MatchFind {
  offer_id: number;
  matches: MatchFindItem[];
}

// ---- Risk ----
export type RiskLevel = "low" | "medium" | "high";
export interface Risk {
  risk_level: RiskLevel;
  risk_label: string;
  offer_id: number;
  demand_id: number;
  breakdown: {
    price_risk: { level: RiskLevel; label: string; corridor: [number, number]; price: number };
    counterparty_risk: { level: RiskLevel; label: string; deals_count: number };
    logistics_risk: { level: RiskLevel; label: string };
  };
}

// ---- Backtest ----
export interface BacktestWindow {
  lock_date: string;
  delivery_date: string;
  locked: number;
  delivery: number;
  advantage_pct: number;
}
export interface Backtest {
  crop: string;
  crop_name: string;
  horizon_days: number;
  horizon_months: number;
  n_windows: number;
  win_rate_pct: number;
  median_advantage_pct: number;
  mean_advantage_pct: number;
  best_advantage_pct: number;
  worst_advantage_pct: number;
  recent_scenario: {
    lock_date: string;
    delivery_date: string;
    locked: number;
    delivery: number;
    advantage_pct: number;
  };
  windows: BacktestWindow[];
}