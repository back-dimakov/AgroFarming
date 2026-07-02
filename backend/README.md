# AgroForward — Backend (FastAPI)

«Мозг» платформы: AI-прогноз цены, Match/Risk Score, генератор договора, честный бэктест.

## Запуск локально

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows  (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt  # Prophet ставится 3–5 минут — это норма
cp .env.example .env             # впишите ANTHROPIC_API_KEY (без ключа AI-объяснение
                                 # отдаёт осмысленный fallback — сервер работает)
python seed_db.py                # наполнить базу демо-данными
uvicorn main:app --reload --port 8000
```

Документация и ручное тестирование всех эндпоинтов: http://localhost:8000/docs \ http://localhost:8000/docs#/default/read_root__get

## Эндпоинты

| Метод | Путь | Что делает |
|---|---|---|
| GET | `/` | health-check |
| POST/GET | `/offers`, `/offers/{id}` | предложения фермеров (CRUD) |
| POST/GET | `/demands`, `/demands/{id}` | спрос закупщиков (CRUD) |
| GET | `/forecast?crop=wheat&days=60` | Prophet-прогноз + коридор + AI-объяснение (Claude) |
| GET | `/match?offer_id=1&demand_id=1` | Match Score пары |
| GET | `/match/find?offer_id=1` | умный подбор встречного спроса по Match Score |
| GET | `/risk?offer_id=1&demand_id=1` | Risk Score (3 оси, ценовая ось — из коридора прогноза) |
| GET | `/backtest?crop=wheat&horizon_days=60` | честный walk-forward бэктест выгоды фиксации |
| GET | `/contract/{deal_id}?offer_id=1&demand_id=1` | скачать черновик договора (.docx) |

Культуры: `wheat`, `potato`, `sunflower`.

## Данные

`data/*.csv` (формат `date,price`, ₽/кг, помесячно) генерируются скриптом
`scripts/make_data.py` — реалистичные ряды с агросезонностью для РФ. Когда аналитик
принесёт реальные CSV, кладём их в `data/` поверх (формат тот же) и удаляем
`agroforward.db` (схема пересоздастся).

## Чем выделяется (для защиты)

- **Два слоя AI в ядре:** Prophet строит математический прогноз с коридором
  неопределённости (80%), Claude переводит его в бизнес-факторы роста/падения.
- **Честный бэктест без lookahead** (`/backtest`): цифра «выгода фиксации» считается по
  **всей истории** (распределение по N окнам: win-rate, медиана), а не черри-пиком
  одного удачного окна. AI-стратегия «когда фиксировать» оценивается офлайн-скриптом
  `scripts/run_backtest.py` строго на прошлом — это дисциплина количественного
  трейдинга, перенесённая в агро.
- **Умный подбор** (`/match/find`): не доска объявлений, а ранжирование контрагентов.

## Мок-данные для фронтенда

`mock/` — примеры ответов API в JSON. Фронтендер верстает по ним с первого дня
(`USE_MOCK=true`), не дожидаясь живого бэкенда; на 7-й день переключает на реальный.
