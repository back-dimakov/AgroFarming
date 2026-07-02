FROM python:3.11-slim

# Установка системных зависимостей для компиляции Prophet и работы с БД
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Сначала только зависимости — Docker закеширует слой
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Теперь весь код
COPY . .

# Наполняем базу демо-данными на этапе сборки
RUN python seed_db.py || true

EXPOSE 8000

# 0.0.0.0 обязателен в контейнере
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
