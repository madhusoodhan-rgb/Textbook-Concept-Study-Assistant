# Deployment Guide — Textbook Concept & Study Assistant

This guide outlines deployment steps for both the **React + Vite Frontend** and the **FastAPI Python Backend**.

---

## 1. Environment Variables

Create a `.env` file in the project root or configure these variables in your hosting dashboard:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `GOOGLE_API_KEY` | Optional | `None` | Google Gemini API key. If omitted, engine runs in offline local-grounded mode. |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | Gemini model for generative answering and study tools synthesis. |
| `GEMINI_EMBEDDING_MODEL` | Optional | `gemini-embedding-001` | Embedding model for semantic vector search. |
| `HOST` | Optional | `0.0.0.0` | Server host address. |
| `PORT` | Optional | `8000` | Server port. |
| `MAX_UPLOAD_SIZE_MB` | Optional | `50` | Maximum PDF file upload size. |
| `VITE_API_URL` | Optional | `""` (proxy) | Base URL for the FastAPI backend (e.g. `https://api.yourdomain.com`). |

---

## 2. Frontend Deployment (Vercel)

1. Push your repository to GitHub.
2. In the [Vercel Dashboard](https://vercel.com/):
   - Click **Add New Project** and select `madhusoodhan-rgb/Textbook-Concept-Study-Assistant`.
   - Set **Root Directory** to `frontend`.
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
3. Add Environment Variable:
   - `VITE_API_URL`: URL of your deployed FastAPI backend (e.g., `https://textbook-rag-backend.onrender.com`).
4. Click **Deploy**.

---

## 3. Backend Deployment (Render / Railway / Docker)

### Option A: Render
1. Create a **New Web Service** connected to your repository.
2. Set **Root Directory** to `backend`.
3. Set **Runtime** to `Python 3`.
4. Set **Build Command**: `pip install -r requirements.txt`
5. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Under Environment Variables, add `GOOGLE_API_KEY`.

### Option B: Docker
A sample `Dockerfile` for the backend:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY data/ ./data/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t textbook-assistant-backend ./backend
docker run -p 8000:8000 -e GOOGLE_API_KEY="your_api_key" textbook-assistant-backend
```

---

## 4. Local Development

Run the backend:
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

Run the frontend:
```bash
cd frontend
npm run dev
```

Access the UI at `http://127.0.0.1:5173/` and API docs at `http://127.0.0.1:8000/docs`.
