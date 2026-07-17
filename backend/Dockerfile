FROM python:3.10-slim

WORKDIR /app

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application and agent modules
COPY backend/ /app/backend/
COPY agent/ /app/agent/
COPY prompts/ /app/prompts/
COPY scripts/ /app/scripts/

# Expose FastAPI default port
EXPOSE 8000

ENV PYTHONPATH=/app

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
