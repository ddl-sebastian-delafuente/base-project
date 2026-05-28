from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

app = FastAPI()

app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=app)
