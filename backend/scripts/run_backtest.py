"""
Офлайн-бэктест AI-стратегии «когда фиксировать» — методологический showcase.

Naive-бэктест (в routers/backtest.py) отвечает на вопрос «а стоило ли вообще
фиксировать». Этот скрипт идёт дальше: проверяет, добавляет ли ПРОГНОЗ ценность —
то есть умеет ли AI подсказать, КОГДА фиксировать, а когда подождать.

Схема (строго без lookahead — главный закон):
  для каждой точки t:
    - обучаем Prophet ТОЛЬКО на ценах до t включительно (будущее модели недоступно);
    - модель прогнозирует цену на дату поставки t+H;
    - правило: если прогноз НИЖЕ текущей цены -> советуем ЗАФИКСИРОВАТЬ (рынок упадёт),
      иначе -> подождать (продать на споте при поставке);
    - сравниваем фактический результат стратегии с фактической ценой поставки.

Считается медленно (Prophet переобучается в каждой точке), поэтому это офлайн-скрипт.
Результат пишется в data/backtest_model_<crop>_<H>.json и подмешивается эндпоинтом
/backtest как блок model_guided.

Запуск (из папки backend): python scripts/run_backtest.py
"""
from __future__ import annotations

import json
import os
from statistics import mean

import pandas as pd
from prophet import Prophet

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CROP_FILES = {
    "wheat": os.path.join(DATA_DIR, "wheat.csv"),
    "potato": os.path.join(DATA_DIR, "potato.csv"),
    "sunflower": os.path.join(DATA_DIR, "sunflower.csv"),
}

MIN_TRAIN = 24  # минимум 2 года истории, чтобы Prophet поймал годовую сезонность


def _fit_predict(train: pd.DataFrame, months_ahead: int) -> float:
    m = Prophet(interval_width=0.80, yearly_seasonality=True,
                weekly_seasonality=False, daily_seasonality=False)
    m.fit(train)
    future = m.make_future_dataframe(periods=months_ahead * 31, freq="D")
    fc = m.predict(future)
    return float(fc["yhat"].iloc[-1])


def backtest_model(crop: str, horizon_days: int) -> dict:
    df = pd.read_csv(CROP_FILES[crop])
    df.columns = ["ds", "y"]
    df["ds"] = pd.to_datetime(df["ds"])
    h = max(1, round(horizon_days / 30))

    model_adv, naive_adv = [], []
    correct_calls = 0
    n_lock_advice = 0

    for t in range(MIN_TRAIN, len(df) - h):
        train = df.iloc[: t + 1][["ds", "y"]]
        locked = float(df["y"].iloc[t])
        spot_at_delivery = float(df["y"].iloc[t + h])

        predicted = _fit_predict(train, h)
        advise_lock = predicted < locked  # модель ждёт падения -> фиксируем

        # Выгода «всегда фиксировать» (naive baseline) для этой же точки.
        naive_adv.append((locked - spot_at_delivery) / spot_at_delivery * 100.0)

        # Выгода стратегии: фиксируем -> получаем locked; ждём -> продаём на споте (0 относительно споте).
        if advise_lock:
            n_lock_advice += 1
            adv = (locked - spot_at_delivery) / spot_at_delivery * 100.0
            if adv > 0:
                correct_calls += 1
            model_adv.append(adv)
        else:
            model_adv.append(0.0)  # подождал и продал по рынку = 0 относительно споте

        print(f"  {crop} t={t} lock={advise_lock} locked={locked:.2f} spot={spot_at_delivery:.2f}")

    return {
        "n_points": len(model_adv),
        "n_lock_advice": n_lock_advice,
        "lock_precision_pct": round(correct_calls / n_lock_advice * 100, 1) if n_lock_advice else None,
        "mean_advantage_model_pct": round(mean(model_adv), 1),
        "mean_advantage_naive_pct": round(mean(naive_adv), 1),
        "note": ("AI-стратегия фиксирует только при прогнозе падения. lock_precision — доля "
                 "верных решений «зафиксировать». Без lookahead: модель обучается лишь на прошлом."),
    }


def main():
    horizon = int(os.getenv("HORIZON_DAYS", "60"))
    for crop in CROP_FILES:
        print(f"=== {crop} (горизонт {horizon} дн.) ===")
        result = backtest_model(crop, horizon)
        out = os.path.join(DATA_DIR, f"backtest_model_{crop}_{horizon}.json")
        with open(out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"  -> {out}: {result}")


if __name__ == "__main__":
    main()
