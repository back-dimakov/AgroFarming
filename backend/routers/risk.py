"""
Risk Score — насколько сделка рискованна. Три оси, берём худшую.

  1. Ценовой риск: цена предложения попадает в коридор AI-прогноза на дату поставки?
  2. Риск контрагента: есть ли у закупщика история сделок?
  3. Логистический риск: один регион или разные?
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db, Offer, Demand

router = APIRouter()

LABELS = {"low": "Низкий", "medium": "Средний", "high": "Высокий"}


def calculate_risk(offer: dict, demand: dict, forecast_low: float, forecast_high: float) -> dict:
    price = offer["price_per_kg"]

    # 1. Ценовой риск: цена в коридоре прогноза -> низкий, иначе средний.
    price_risk = "low" if forecast_low <= price <= forecast_high else "medium"

    # 2. Риск контрагента по истории сделок.
    deals = demand.get("deals_count", 0) or 0
    if deals >= 5:
        counterparty_risk = "low"
    elif deals >= 1:
        counterparty_risk = "medium"
    else:
        counterparty_risk = "high"

    # 3. Логистика: один регион — низкий, разные — средний.
    logistics_risk = "low" if offer["region"] == demand["region"] else "medium"

    risks = [price_risk, counterparty_risk, logistics_risk]
    if "high" in risks:
        overall = "high"
    elif risks.count("medium") >= 2:
        overall = "medium"
    else:
        overall = "low"

    return {
        "risk_level": overall,
        "risk_label": LABELS[overall],
        "breakdown": {
            "price_risk": {"level": price_risk, "label": LABELS[price_risk],
                           "corridor": [forecast_low, forecast_high], "price": price},
            "counterparty_risk": {"level": counterparty_risk, "label": LABELS[counterparty_risk],
                                  "deals_count": deals},
            "logistics_risk": {"level": logistics_risk, "label": LABELS[logistics_risk]},
        },
    }


def _as_dict(row) -> dict:
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


@router.get("/")
def risk(offer_id: int, demand_id: int, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    demand = db.query(Demand).filter(Demand.id == demand_id).first()
    if not offer or not demand:
        raise HTTPException(status_code=404, detail="Offer или Demand не найден")

    # Коридор прогноза на дату поставки берём из модели прогноза (тот же источник правды).
    from routers.forecast import forecast_corridor
    low, high = forecast_corridor(offer.crop, offer.delivery_days)

    result = calculate_risk(_as_dict(offer), _as_dict(demand), low, high)
    result["offer_id"] = offer_id
    result["demand_id"] = demand_id
    return result
