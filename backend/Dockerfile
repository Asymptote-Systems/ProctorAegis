# Lightweight Python base
FROM python:3.11-slim AS base

# Security-friendly, minimal OS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Create non-root user
RUN useradd -m -u 10001 appuser

# Create app directories
WORKDIR /app

# Copy only requirements first for better caching
COPY requirements.txt /app/requirements.txt

# Install Python deps
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend source
COPY backend /app/backend

# Ensure runtime user ownership
RUN chown -R appuser:appuser /app

# Drop privileges
USER appuser

# Expose FastAPI port
EXPOSE 8000

# Use tini as a minimal init to handle PID 1 signals properly
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--access-log"]
