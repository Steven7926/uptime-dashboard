import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import Base, SessionLocal, engine, get_db
from . import models, schemas

Base.metadata.create_all(bind=engine)

async def _ping(url: str) -> tuple[bool, float | None, int | None]:
    """Return (ok, response_time_ms, http_status). Never raises."""
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            t0 = time.monotonic()
            r = await client.get(url)
            return r.status_code < 400, round((time.monotonic() - t0) * 1000, 2), r.status_code
    except Exception:
        return False, None, None

async def _do_check(monitor_id: int, url: str) -> None:
    ok, response_time, http_status = await _ping(url)

    def _save() -> None:
        db = SessionLocal()
        try:
            db.add(models.CheckResult(
                monitor_id=monitor_id,
                timestamp=datetime.now(timezone.utc),
                ok=ok,
                response_time=response_time,
                http_status=http_status,
            ))
            db.commit()
        finally:
            db.close()

    await asyncio.to_thread(_save)

async def _scheduler() -> None:
    """Tick every 10 s, ping any monitor whose interval has elapsed."""
    last_checked: dict[int, float] = {}
    while True:
        def _get_monitors() -> list[tuple[int, str, int]]:
            db = SessionLocal()
            try:
                return [(m.id, m.url, m.interval) for m in db.query(models.Monitor).all()]
            finally:
                db.close()

        monitors = await asyncio.to_thread(_get_monitors)
        now = time.monotonic()

        due = [
            _do_check(mid, url)
            for mid, url, interval_ms in monitors
            if (now - last_checked.get(mid, 0)) * 1000 >= interval_ms
        ]
        for mid, _, interval_ms in monitors:
            if (now - last_checked.get(mid, 0)) * 1000 >= interval_ms:
                last_checked[mid] = now

        if due:
            await asyncio.gather(*due, return_exceptions=True)

        await asyncio.sleep(10)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_scheduler())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(title="Uptime Monitor API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/monitors", response_model=list[schemas.MonitorOut])
def list_monitors(db: Session = Depends(get_db)):
    monitors = db.query(models.Monitor).all()
    for m in monitors:
        m.results = (
            db.query(models.CheckResult)
            .filter(models.CheckResult.monitor_id == m.id)
            .order_by(models.CheckResult.timestamp.desc())
            .limit(50)
            .all()
        )
    return monitors

@app.post("/monitors", response_model=schemas.MonitorOut, status_code=201)
def create_monitor(body: schemas.MonitorCreate, db: Session = Depends(get_db)):
    monitor = models.Monitor(**body.model_dump())
    db.add(monitor)
    db.commit()
    db.refresh(monitor)
    return monitor

@app.delete("/monitors/{monitor_id}", status_code=204)
def delete_monitor(monitor_id: int, db: Session = Depends(get_db)):
    monitor = db.query(models.Monitor).filter(models.Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")
    db.delete(monitor)
    db.commit()

@app.post("/monitors/{monitor_id}/check", response_model=schemas.CheckResultOut)
async def check_monitor(monitor_id: int, db: Session = Depends(get_db)):
    """Trigger an immediate check outside the scheduler's normal cycle."""
    monitor = db.query(models.Monitor).filter(models.Monitor.id == monitor_id).first()
    if not monitor:
        raise HTTPException(status_code=404, detail="Monitor not found")

    ok, response_time, http_status = await _ping(monitor.url)

    result = models.CheckResult(
        monitor_id=monitor_id,
        timestamp=datetime.now(timezone.utc),
        ok=ok,
        response_time=response_time,
        http_status=http_status,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return result
