from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class CheckResultOut(BaseModel):
    id: int
    monitor_id: int
    timestamp: datetime
    ok: bool
    response_time: Optional[float] = None
    http_status: Optional[int] = None

    model_config = {"from_attributes": True}

class MonitorCreate(BaseModel):
    name: str
    url: str
    interval: int = 60000  # ms
    query_params: Optional[str] = None

class MonitorOut(BaseModel):
    id: int
    name: str
    url: str
    interval: int
    query_params: Optional[str] = None
    results: list[CheckResultOut] = []

    model_config = {"from_attributes": True}
