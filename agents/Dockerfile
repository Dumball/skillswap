FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Use shell form to support environment variable substitution
# Railway injects PORT env var dynamically
# Use --reload is disabled for production
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --log-level info
