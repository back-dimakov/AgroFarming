"""
Точка входа AgroForward API.

Запуск (из папки backend, с активированным venv):
    uvicorn main:app --reload --port 8000

Документация: http://localhost:8000/docs
"""
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()  # читает backend/.env (ключ Claude) до импорта роутеров

from routers import offers, demands, forecast, match, risk, contract, backtest  # noqa: E402

app = FastAPI(title="AgroForward API", version="1.0.0")

# CORS: разрешаем фронтенду (порт 3000) обращаться к бэкенду (порт 8000).
# Без этого браузер заблокирует запросы из соображений безопасности.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    """Health-check: проверка, что сервер жив."""
    return {"status": "ok", "service": "AgroForward API", "docs": "/docs"}


app.include_router(offers.router, prefix="/offers", tags=["offers"])
app.include_router(demands.router, prefix="/demands", tags=["demands"])
app.include_router(forecast.router, prefix="/forecast", tags=["forecast"])
app.include_router(match.router, prefix="/match", tags=["match"])
app.include_router(risk.router, prefix="/risk", tags=["risk"])
app.include_router(contract.router, prefix="/contract", tags=["contract"])
app.include_router(backtest.router, prefix="/backtest", tags=["backtest"])
