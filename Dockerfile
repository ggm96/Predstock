# Stage 1: build the React frontend
FROM node:20-slim AS frontend
WORKDIR /frontend
COPY marketsignal/frontend/package*.json ./
RUN npm ci
COPY marketsignal/frontend/ ./
RUN npm run build

# Stage 2: Python backend + bundled frontend
FROM python:3.11-slim
WORKDIR /app
COPY marketsignal/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY marketsignal/backend/ ./
COPY --from=frontend /frontend/dist ./frontend_dist
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
