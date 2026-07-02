"""
Генератор исторических рядов цен для AgroForward (₽/кг, помесячно).

Зачем синтетика: открытые источники (World Bank Pink Sheet / datahub commodity-prices)
дают цены в USD-индексах и обрываются на 2017, картофеля там нет вовсе. Для демо нужен
ряд в рублях за килограмм, с правдоподобными для рынка РФ уровнями и агросезонностью,
доведённый до свежих дат. Когда аналитик принесёт реальные CSV — просто кладём их в
backend/data/ поверх этих (формат тот же: date,price).

Сезонная логика (помесячные множители к базовой цене):
  - пшеница: дешевле всего на уборке (авг–сен), дороже к весне (фев–апр). Амплитуда мягкая.
  - картофель: сильная сезонность — осенью урожай дешёвый, к весне дефицит и дорогой.
  - подсолнечник (семечка): провал на уборке (сен–окт), рост к лету.
Плюс пологий многолетний тренд и небольшой случайный шум. Сид фиксирован — ряд
воспроизводим (важно, чтобы бэктест и прогноз были стабильны между запусками).
"""
from __future__ import annotations

import csv
import math
import os
import random
from datetime import date

random.seed(42)  # воспроизводимость

# Период истории: помесячно. Хватает Prophet на годовую сезонность (нужно >= 2 года).
START = date(2019, 1, 1)
END = date(2025, 6, 1)

# Базовая цена (₽/кг) на старте, годовой тренд (доля в год) и сезонные множители по месяцам.
CROPS = {
    "wheat": {
        "base": 13.5,
        "trend_per_year": 0.06,   # ~6% в год — инфляция + спрос
        "noise": 0.02,
        # индекс 1..12: уборка авг(8)–сен(9) дешевле, весна фев(2)–апр(4) дороже
        "season": [1.05, 1.07, 1.08, 1.06, 1.02, 0.98, 0.95, 0.92, 0.93, 0.97, 1.01, 1.04],
    },
    "potato": {
        "base": 18.0,
        "trend_per_year": 0.05,
        "noise": 0.04,
        # яркая сезонность: осень (урожай) — дёшево, весна — дорого
        "season": [1.25, 1.35, 1.45, 1.50, 1.40, 1.15, 0.90, 0.75, 0.70, 0.80, 0.95, 1.10],
    },
    "sunflower": {
        "base": 24.0,
        "trend_per_year": 0.07,
        "noise": 0.03,
        # семечка: провал на уборке сен(9)–окт(10), рост к лету
        "season": [1.06, 1.08, 1.10, 1.11, 1.10, 1.07, 1.02, 0.99, 0.93, 0.92, 0.97, 1.02],
    },
}


def month_iter(start: date, end: date):
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        yield date(y, m, 1)
        m += 1
        if m > 12:
            m = 1
            y += 1


def generate(crop: str, cfg: dict) -> list[tuple[str, float]]:
    rows = []
    months = list(month_iter(START, END))
    for i, d in enumerate(months):
        years_elapsed = i / 12.0
        trend = (1 + cfg["trend_per_year"]) ** years_elapsed
        season = cfg["season"][d.month - 1]
        # мягкий рыночный шок раз в ~2 года, чтобы Prophet видел не идеальную синусоиду
        shock = 1.0
        if d.month == 3 and (d.year - START.year) % 2 == 1:
            shock = 1.0 + random.uniform(-0.05, 0.08)
        noise = 1.0 + random.gauss(0, cfg["noise"])
        price = cfg["base"] * trend * season * shock * noise
        rows.append((d.isoformat(), round(price, 2)))
    return rows


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    out_dir = os.path.abspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)
    for crop, cfg in CROPS.items():
        rows = generate(crop, cfg)
        path = os.path.join(out_dir, f"{crop}.csv")
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["date", "price"])
            w.writerows(rows)
        print(f"{crop}: {len(rows)} points -> {path}  (last price {rows[-1][1]} RUB/kg)")


if __name__ == "__main__":
    main()
