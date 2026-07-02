"""
Модели данных и подключение к SQLite.

SQLite — база в одном файле (agroforward.db), создаётся автоматически при первом
запуске. Управляем через SQLAlchemy: работаем с записями как с Python-объектами,
SQL руками не пишем.
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

# check_same_thread=False — FastAPI ходит в базу из разных потоков.
engine = create_engine(
    "sqlite:///./agroforward.db",
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


def get_db():
    """Выдаёт сессию на один запрос и закрывает её после."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
