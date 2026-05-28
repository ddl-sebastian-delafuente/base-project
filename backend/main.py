import asyncio
import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

DOMINO_API_HOST = os.environ.get("DOMINO_API_HOST", "")
DOMINO_API_PROXY = os.environ.get("DOMINO_API_PROXY", "http://localhost:8899")
PROJECT_ID = os.environ.get("DOMINO_PROJECT_ID", "")
PROJECT_NAME = os.environ.get("DOMINO_PROJECT_NAME", "")
PROJECT_OWNER = os.environ.get("DOMINO_PROJECT_OWNER", "")

app = FastAPI()


def _access_token() -> str:
    r = httpx.get(f"{DOMINO_API_PROXY}/access-token", timeout=5.0)
    r.raise_for_status()
    return r.text.strip()


def _require_context() -> None:
    if not (DOMINO_API_HOST and PROJECT_ID):
        raise HTTPException(
            status_code=503,
            detail="Domino context not available (DOMINO_API_HOST / DOMINO_PROJECT_ID missing)",
        )


@app.get("/api/project")
def get_project() -> dict[str, Any]:
    _require_context()
    headers = {"Authorization": f"Bearer {_access_token()}"}
    r = httpx.get(
        f"{DOMINO_API_HOST}/v4/projects/{PROJECT_ID}",
        headers=headers,
        timeout=10.0,
    )
    r.raise_for_status()
    return {
        "id": PROJECT_ID,
        "name": PROJECT_NAME,
        "owner": PROJECT_OWNER,
        **r.json(),
    }


@app.get("/api/entities")
async def get_entities() -> dict[str, list[Any]]:
    _require_context()

    headers = {"Authorization": f"Bearer {_access_token()}"}
    pid = PROJECT_ID

    paths = {
        "jobs": f"/v4/jobs?projectId={pid}",
        "apps": f"/v4/modelProducts?projectId={pid}",
        "workspaces": f"/v4/workspaces?projectId={pid}",
        "datasets": f"/v4/datasetrw/datasets-v2?projectId={pid}",
        "modelApis": f"/v4/modelManager/getModels?projectId={pid}",
        "registeredModels": f"/api/registeredmodels/v1?projectId={pid}",
        "scheduledJobs": f"/v4/projects/{pid}/scheduledjobs",
        "collaborators": f"/v4/projects/{pid}/collaborators",
        "goals": f"/v4/projectManagement/{pid}/goals",
    }

    async def fetch(client: httpx.AsyncClient, path: str) -> Any:
        try:
            r = await client.get(
                f"{DOMINO_API_HOST}{path}", headers=headers, timeout=10.0
            )
            r.raise_for_status()
            return r.json()
        except Exception:
            return None

    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*(fetch(client, p) for p in paths.values()))

    by_key = dict(zip(paths.keys(), results))

    def as_list(value: Any, wrapper_key: str | None = None) -> list[Any]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            if wrapper_key and isinstance(value.get(wrapper_key), list):
                return value[wrapper_key]
            for k in ("items", "data", "jobs"):
                if isinstance(value.get(k), list):
                    return value[k]
        return []

    return {
        "jobs": as_list(by_key["jobs"], "jobs"),
        "apps": as_list(by_key["apps"]),
        "workspaces": as_list(by_key["workspaces"]),
        # datasets-v2 wraps each row in {"datasetRwDto": {...}} — unwrap.
        "datasets": [d.get("datasetRwDto", d) for d in as_list(by_key["datasets"])],
        "modelApis": as_list(by_key["modelApis"]),
        "registeredModels": as_list(by_key["registeredModels"], "items"),
        "scheduledJobs": as_list(by_key["scheduledJobs"]),
        "collaborators": as_list(by_key["collaborators"]),
        "goals": as_list(by_key["goals"]),
    }


# Static SPA mount must come AFTER /api routes so they don't get swallowed.
app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8888)
