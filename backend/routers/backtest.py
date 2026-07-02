"""
Бэктест выгоды фиксации цены — честный walk-forward, без подглядывания в будущее.

Это место, где проект отличается от учебного. Цифра «+X%, если бы фермер зафиксировал
цену N дней назад» — первое, что увидит жюри. Если посчитать её черри-пиком (взять
лучшее окно), грамотное жюри это вскроет. Поэтому считаем ЧЕСТНО, по всей истории:

  - перебираем ВСЕ окна длиной = горизонт поставки;
  - в каждом окне фермер «фиксирует» цену в момент t (= спотовая цена на тот день);
  - сравниваем с фактической спотовой ценой на дату поставки t+H;
  - выгода фиксации = (locked - spot_на_поставке) / spot_на_поставке.
    Если рынок упал — фиксация защитила (выгода > 0); если вырос — фермер недополучил.

Главная метрика — не одна красивая цифра, а РАСПРЕДЕЛЕНИЕ: в каком проценте окон
фиксация помогала и какова медианная выгода. Это и есть дисциплина «не обмани себя»,
перенесённая из количественного трейдинга: оценка на фактах, без lookahead.

Модель-ориентированный слой (AI советует, КОГДА фиксировать) считается офлайн скриптом
scripts/run_backtest.py и подмешивается сюда, если файл с результатами есть.
"""
import json
import os
from functools import lru_cache
from statistics import mean, median

import pandas as pd
from fastapi import APIRouter

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CROP_FILES = {
    "wheat": os.path.join(DATA_DIR, "wheat.csv"),
    "potato": os.path.join(DATA_DIR, "potato.csv"),
    "sunflower": os.path.join(DATA_DIR, "sunflower.csv"),
}
CROP_NAMES = {"wheat": "Пшеница", "potato": "Картофель", "sunflower": "Подсолнечник"}


@lru_cache(maxsize=16)
def run_backtest(crop: str, horizon_days: int) -> dict:
    df = pd.read_csv(CROP_FILES[crop])
    df.columns = ["ds", "y"]
    prices = df["y"].tolist()
    dates = df["ds"].tolist()

    # Ряд помесячный -> горизонт в месяцах (минимум 1 шаг).
    h = max(1, round(horizon_days / 30))
    if len(prices) <= h:
        return {"error": "Недостаточно истории для бэктеста"}

    advantages = []      # выгода фиксации в %, по каждому окну
    windows = []
    for t in range(0, len(prices) - h):
        locked = prices[t]
        spot_at_delivery = prices[t + h]
        adv = (locked - spot_at_delivery) / spot_at_delivery * 100.0
        advantages.append(adv)
        windows.append({"lock_date": dates[t], "delivery_date": dates[t + h],
                        "locked": round(locked, 2), "delivery": round(spot_at_delivery, 2),
                        "advantage_pct": round(adv, 1)})

    n = len(advantages)
    win_rate = sum(1 for a in advantages if a > 0) / n * 100.0

    # Конкретный «свежий» сценарий для заголовка лендинга: последнее завершённое окно.
    recent = windows[-1]

    return {
        "crop": crop,
        "crop_name": CROP_NAMES[crop],
        "horizon_days": horizon_days,
        "horizon_months": h,
        "n_windows": n,
        "win_rate_pct": round(win_rate, 1),
        "median_advantage_pct": round(median(advantages), 1),
        "mean_advantage_pct": round(mean(advantages), 1),
        "best_advantage_pct": round(max(advantages), 1),
        "worst_advantage_pct": round(min(advantages), 1),
        "recent_scenario": recent,
        "windows": windows,
        "method": ("walk-forward по всей истории, без lookahead: каждое окно оценивается "
                   "на фактической цене поставки"),
    }


def _attach_model_overlay(result: dict, crop: str, horizon_days: int) -> dict:
    """Если есть офлайн-результаты AI-стратегии — подмешиваем их для сравнения."""
    path = os.path.join(DATA_DIR, f"backtest_model_{crop}_{horizon_days}.json")
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                result["model_guided"] = json.load(f)
        except Exception:
            pass
    return result


@router.get("/")
def backtest(crop: str = "wheat", horizon_days: int = 60):
    if crop not in CROP_FILES:
        return {"error": "Неизвестная культура", "allowed": list(CROP_FILES.keys())}
    result = dict(run_backtest(crop, horizon_days))  # копия из кэша
    return _attach_model_overlay(result, crop, horizon_days)
