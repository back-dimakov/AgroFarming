"""
Наполнение базы демо-данными, чтобы витрина не была пустой.

Запуск (из папки backend): python seed_db.py
Идемпотентно: перед загрузкой чистит таблицы, чтобы повторный запуск не плодил дубли.
"""
import json
import os

from models.database import SessionLocal, Offer, Demand

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def _load(name: str):
    with open(os.path.join(DATA_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def seed():
    db = SessionLocal()
    try:
        # Чистим, чтобы повторный seed не дублировал записи.
        db.query(Offer).delete()
        db.query(Demand).delete()

        offers = _load("demo_offers.json")
        for o in offers:
            o.pop("id", None)
            db.add(Offer(**o))

        demands = _load("demo_demands.json")
        for d in demands:
            d.pop("id", None)
            db.add(Demand(**d))

        db.commit()
        print(f"Загружено предложений: {len(offers)}, спроса: {len(demands)}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
