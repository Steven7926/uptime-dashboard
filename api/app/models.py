from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Monitor(Base):
    __tablename__ = "monitors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    interval = Column(Integer, default=60000)  # milliseconds, matches frontend

    results = relationship("CheckResult", back_populates="monitor", cascade="all, delete-orphan")

class CheckResult(Base):
    __tablename__ = "check_results"

    id = Column(Integer, primary_key=True, index=True)
    monitor_id = Column(Integer, ForeignKey("monitors.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    ok = Column(Boolean, nullable=False)
    response_time = Column(Float, nullable=True)   # milliseconds
    http_status = Column(Integer, nullable=True)

    monitor = relationship("Monitor", back_populates="results")
