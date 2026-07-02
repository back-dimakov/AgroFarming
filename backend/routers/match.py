"""
Match Score — насколько предложение фермера и спрос закупщика подходят друг другу.

Намеренно простой прозрачный алгоритм (правила, не ML): взвешенная сумма по 4
параметрам. На MVP это плюс — результат предсказуем и объясним жюри. ML — следующий
этап, когда накопятся данные о реальных сделках.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db, Offer, Demand

router = APIRouter()

# Веса факторов (сумма = 1.0). Цена решает всё, срок — мелочь.
WEIGHTS = {"price": 0.40, "volume": 0.30, "region": 0.20, "timing": 0.10}


def score_label(score: int) -> str:
    if score >= 90:
        return "Совпадает"
    if score >= 70:
        return "Близко"
    if score >= 50:
        return "Приемлемо"
    return "Расхождение"


def calculate_match(offer: dict, demand: dict) -> dict:
    scores = {}

    # 1. Цена (40%). Фермер хочет дороже, закупщик готов до max — чем ближе, тем лучше.
    price_diff_pct = abs(offer["price_per_kg"] - demand["max_price_per_kg"]) / demand["max_price_per_kg"]
    scores["price"] = max(0, int(100 - price_diff_pct * 400))

    # 2. Объём (30%).
    vol_diff_pct = abs(offer["volume_tons"] - demand["volume_tons"]) / demand["volume_tons"]
    scores["volume"] = max(0, int(100 - vol_diff_pct * 200))

    # 3. Регион (20%): тот же регион — идеально, иначе логистика.
    scores["region"] = 100 if offer["region"] == demand["region"] else 50

    # 4. Срок поставки (10%): расхождение в днях штрафуем мягко.
    days_diff = abs(offer["delivery_days"] - demand["delivery_days"])
    scores["timing"] = max(0, 100 - days_diff * 3)

    total = int(sum(scores[k] * WEIGHTS[k] for k in WEIGHTS))
    return {
        "match_score": total,
        "label": score_label(total),
        "breakdown": {
            k: {"score": v, "label": score_label(v), "weight": WEIGHTS[k]}
            for k, v in scores.items()
        },
    }


def _as_dict(row) -> dict:
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


@router.get("/")
def match(offer_id: int, demand_id: int, db: Session = Depends(get_db)):
    """Match Score для конкретной пары offer/demand (берутся из базы по id)."""
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    demand = db.query(Demand).filter(Demand.id == demand_id).first()
    if not offer or not demand:
        raise HTTPException(status_code=404, detail="Offer или Demand не найден")
    result = calculate_match(_as_dict(offer), _as_dict(demand))
    result["offer_id"] = offer_id
    result["demand_id"] = demand_id
    return result


@router.get("/find")
def find_matches(offer_id: int, limit: int = 5, db: Session = Depends(get_db)):
    """
    Умный подбор: для предложения фермера ранжируем встречный спрос по Match Score.
    Это «фишка маркетплейса» — не доска объявлений, а подбор контрагентов.
    """
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Предложение не найдено")
    offer_d = _as_dict(offer)
    # Сравниваем только по той же культуре.
    demands = db.query(Demand).filter(Demand.crop == offer.crop).all()
    ranked = []
    for d in demands:
        m = calculate_match(offer_d, _as_dict(d))
        ranked.append({
            "demand_id": d.id,
            "user_name": d.user_name,
            "region": d.region,
            "volume_tons": d.volume_tons,
            "max_price_per_kg": d.max_price_per_kg,
            "match_score": m["match_score"],
            "label": m["label"],
        })
    ranked.sort(key=lambda x: x["match_score"], reverse=True)
    return {"offer_id": offer_id, "matches": ranked[:limit]}
