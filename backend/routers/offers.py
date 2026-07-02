"""CRUD предложений фермеров (продажа)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db, Offer

router = APIRouter()


class OfferCreate(BaseModel):
    """Контракт входных данных: что присылает фронтенд при создании."""
    user_name: str
    region: str
    crop: str
    crop_name: str
    volume_tons: float
    price_per_kg: float
    delivery_days: int
    quality: str = "ГОСТ"


@router.post("/")
def create_offer(offer: OfferCreate, db: Session = Depends(get_db)):
    db_offer = Offer(**offer.model_dump())
    db.add(db_offer)
    db.commit()
    db.refresh(db_offer)
    return db_offer


@router.get("/")
def list_offers(crop: str = None, region: str = None, db: Session = Depends(get_db)):
    query = db.query(Offer)
    if crop:
        query = query.filter(Offer.crop == crop)
    if region:
        query = query.filter(Offer.region == region)
    return query.order_by(Offer.created_at.desc()).all()


@router.get("/{offer_id}")
def get_offer(offer_id: int, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Предложение не найдено")
    return offer
