"""
AI-прогноз цены — ядро продукта.

Два слоя AI:
  1. Prophet (Meta) строит математический прогноз временного ряда с коридором
     неопределённости (доверительный интервал 80%).
  2. Claude переводит сухие цифры в понятные бизнесу факторы роста/падения.

Это осмысленное применение AI в ядре, а не «чат-бот для галочки».
"""
import os
from functools import lru_cache

import pandas as pd
from fastapi import APIRouter
from prophet import Prophet

router = APIRouter()

# Пути к данным относительно папки backend (этот файл лежит в backend/routers/).
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

CROP_FILES = {
    "wheat": os.path.join(DATA_DIR, "wheat.csv"),
    "potato": os.path.join(DATA_DIR, "potato.csv"),
    "sunflower": os.path.join(DATA_DIR, "sunflower.csv"),
}
CROP_NAMES = {"wheat": "Пшеница", "potato": "Картофель", "sunflower": "Подсолнечник"}


@lru_cache(maxsize=16)
def train_and_forecast(crop: str, days: int):
    """
    Обучает Prophet на истории цен и возвращает (точки_прогноза, текущая_цена).
    lru_cache: модель обучается один раз на (культура, горизонт), а не на каждый запрос.
    """
    df = pd.read_csv(CROP_FILES[crop])
    df.columns = ["ds", "y"]                 # Prophet требует строго ds/y
    df["ds"] = pd.to_datetime(df["ds"])

    model = Prophet(
        interval_width=0.80,                 # коридор 80%
        yearly_seasonality=True,             # агросезонность
        weekly_seasonality=False,
        daily_seasonality=False,
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=days, freq="D")
    forecast = model.predict(future)

    last_date = df["ds"].max()
    future_points = forecast[forecast["ds"] > last_date]

    result = []
    for _, row in future_points.head(days).iterrows():
        result.append({
            "date": row["ds"].strftime("%Y-%m-%d"),
            "price": round(float(row["yhat"]), 2),
            "low": round(float(row["yhat_lower"]), 2),
            "high": round(float(row["yhat_upper"]), 2),
            "is_forecast": True,
        })
    current_price = round(float(df["y"].iloc[-1]), 2)
    return result, current_price


def forecast_corridor(crop: str, days: int):
    """Коридор (low, high) на дату поставки — используется в Risk Score."""
    if crop not in CROP_FILES:
        return 0.0, 0.0
    points, _ = train_and_forecast(crop, max(days, 1))
    last = points[-1]
    return last["low"], last["high"]


# ---------- AI-объяснение через Claude ----------

_FALLBACK = {
    "wheat": {
        "factors_up": ["Рост экспортного спроса", "Засуха в ключевых регионах"],
        "factors_down": ["Высокий урожай и переходящие запасы", "Крепкий рубль снижает экспортный паритет"],
    },
    "potato": {
        "factors_up": ["Сокращение посевных площадей", "Рост затрат на хранение к весне"],
        "factors_down": ["Массовая уборка нового урожая", "Импорт из соседних стран"],
    },
    "sunflower": {
        "factors_up": ["Спрос переработчиков на масло", "Экспортные пошлины и логистика"],
        "factors_down": ["Рекордный валовый сбор", "Снижение мировых цен на растительные масла"],
    },
}


@lru_cache(maxsize=16)
def explain_forecast(crop: str, crop_name: str, current: float, predicted: float, days: int):
    """
    Просим Claude назвать факторы роста/падения. Если ключа нет или AI вернул не-JSON —
    отдаём заранее заготовленный осмысленный текст. На демо запасной вариант лучше
    белого экрана с ошибкой.
    """
    direction = "вырастет" if predicted > current else "снизится" if predicted < current else "останется стабильной"
    fb = _FALLBACK.get(crop, _FALLBACK["wheat"])
    fallback = {
        "factors_up": fb["factors_up"],
        "factors_down": fb["factors_down"],
        "explanation": f"По прогнозу цена на «{crop_name}» {direction} с {current} до {predicted} ₽/кг за {days} дней.",
        "source": "fallback",
    }

    if not os.getenv("ANTHROPIC_API_KEY"):
        return fallback

    try:
        import json
        import anthropic

        client = anthropic.Anthropic()
        model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
        prompt = (
            f"Культура: {crop_name}. Текущая цена: {current} руб/кг. "
            f"Прогноз через {days} дней: {predicted} руб/кг.\n"
            "Назови 2 реальных фактора роста цены и 2 фактора падения для российского "
            "агрорынка. Отвечай ТОЛЬКО валидным JSON без пояснений:\n"
            '{"factors_up": ["...", "..."], "factors_down": ["...", "..."], '
            '"explanation": "одно предложение об общем прогнозе"}'
        )
        message = client.messages.create(
            model=model,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        data = json.loads(message.content[0].text)
        data["source"] = "claude"
        return data
    except Exception:
        # Любая ошибка AI (нет сети, не-JSON, лимиты) не должна ломать страницу.
        return fallback


@router.get("/")
def get_forecast(crop: str = "wheat", days: int = 60, explain: bool = True):
    if crop not in CROP_FILES:
        return {"error": "Неизвестная культура", "allowed": list(CROP_FILES.keys())}

    points, current = train_and_forecast(crop, days)
    predicted = points[-1]["price"] if points else current

    response = {
        "crop": crop,
        "crop_name": CROP_NAMES[crop],
        "current_price": current,
        "predicted_price": predicted,
        "horizon_days": days,
        "forecast": points,
    }
    if explain:
        response["ai"] = explain_forecast(crop, CROP_NAMES[crop], current, predicted, days)
    return response
