"""
Модели данных и подключение к SQLite.

SQLite — база в одном файле (agroforward.db), создаётся автоматически при первом
запуске. Управляем через SQLAlchemy: работаем с записями как с Python-объектами,
SQL руками не пишем.
"""
import os
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# На Vercel файловая система только для чтения, кроме /tmp — пишем туда.
# Локально и в Docker остаётся прежний путь рядом со скриптом.
DB_PATH = "/tmp/agroforward.db" if os.environ.get("VERCEL") else "./agroforward.db"

# check_same_thread=False — FastAPI ходит в базу из разных потоков.
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Offer(Base):
    """Предложение фермера (продажа)."""
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String)
    region = Column(String)
    crop = Column(String)          # wheat / potato / sunflower
    crop_name = Column(String)     # Пшеница / Картофель / Подсолнечник
    volume_tons = Column(Float)
    price_per_kg = Column(Float)
    delivery_days = Column(Integer)
    quality = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Demand(Base):
    """Спрос закупщика (покупка)."""
    __tablename__ = "demands"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String)
    region = Column(String)
    crop = Column(String)
    crop_name = Column(String)
    volume_tons = Column(Float)
    max_price_per_kg = Column(Float)
    delivery_days = Column(Integer)
    requirements = Column(String)
    deals_count = Column(Integer, default=0)  # история сделок -> риск контрагента
    created_at = Column(DateTime, default=datetime.utcnow)


# Создаём таблицы при импорте модуля (идемпотентно).
Base.metadata.create_all(bind=engine)


def _autoseed():
    """На Vercel /tmp пересоздаётся при каждом холодном старте, поэтому
    таблицы дозаполняются демо-данными сразу — иначе после cold start
    витрина будет пустой, пока кто-то вручную не запустит seed_db.py."""
    import json

    session = SessionLocal()
    try:
        if session.query(Offer).count() > 0:
            return
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

        def _load(name):
            with open(os.path.join(data_dir, name), encoding="utf-8") as f:
                return json.load(f)

        for o in _load("demo_offers.json"):
            o.pop("id", None)
            session.add(Offer(**o))
        for d in _load("demo_demands.json"):
            d.pop("id", None)
            session.add(Demand(**d))
        session.commit()
    finally:
        session.close()


_autoseed()


def get_db():
    """Выдаёт сессию на один запрос и закрывает её после."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()