"""CRUD спроса закупщиков (покупка). Тот же шаблон, что offers, но max_price_per_kg."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db, Demand

router = APIRouter()


class DemandCreate(BaseModel):
    user_name: str
    region: str
    crop: str
    crop_name: str
    volume_tons: float
    max_price_per_kg: float
    delivery_days: int
    requirements: str = ""
    deals_count: int = 0


@router.post("/")
def create_demand(demand: DemandCreate, db: Session = Depends(get_db)):
    db_demand = Demand(**demand.model_dump())
    db.add(db_demand)
    db.commit()
    db.refresh(db_demand)
    return db_demand


@router.get("/")
def list_demands(crop: str = None, region: str = None, db: Session = Depends(get_db)):
    query = db.query(Demand)
    if crop:
        query = query.filter(Demand.crop == crop)
    if region:
        query = query.filter(Demand.region == region)
    return query.order_by(Demand.created_at.desc()).all()


@router.get("/{demand_id}")
def get_demand(demand_id: int, db: Session = Depends(get_db)):
    demand = db.query(Demand).filter(Demand.id == demand_id).first()
    if not demand:
        raise HTTPException(status_code=404, detail="Спрос не найден")
    return demand
