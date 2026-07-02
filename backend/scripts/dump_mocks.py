"""
Генерирует mock/*.json — примеры ответов API для фронтендера (Day-1 deliverable).

Берёт ответы прямо из реальных функций роутеров, поэтому форма мок-данных гарантированно
совпадает с живым API: на 7-й день фронтенд переключает USE_MOCK=false без правок вёрстки.

Запуск (из папки backend, после seed_db.py): python scripts/dump_mocks.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.database import SessionLocal, Offer, Demand
from routers.forecast import get_forecast
from routers.backtest import backtest
from routers.match import calculate_match, find_matches
from routers.risk import risk as risk_ep

MOCK_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mock")


def _as_dict(row) -> dict:
    d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
    d["created_at"] = str(d.get("created_at"))
    return d


def main():
    os.makedirs(MOCK_DIR, exist_ok=True)
    db = SessionLocal()
    offers = db.query(Offer).all()
    demands = db.query(Demand).all()

    out = {}
    out["offers.json"] = [_as_dict(o) for o in offers]
    out["demands.json"] = [_as_dict(d) for d in demands]

    # Прогноз без вызова Claude (explain=False) — стабильный, не зависит от сети/ключа.
    out["forecast.json"] = get_forecast(crop="wheat", days=60, explain=False)
    out["backtest.json"] = backtest(crop="wheat", horizon_days=60)

    if offers and demands:
        o, d = offers[0], demands[0]
        out["match.json"] = calculate_match(_as_dict(o), _as_dict(d))
        out["match_find.json"] = find_matches(offer_id=o.id, db=db)
        out["risk.json"] = risk_ep(offer_id=o.id, demand_id=d.id, db=db)

    db.close()

    for name, payload in out.items():
        path = os.path.join(MOCK_DIR, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2, default=str)
        print(f"-> {path}")


if __name__ == "__main__":
    main()
