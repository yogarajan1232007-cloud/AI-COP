from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class DashboardStats(BaseModel):
    active_journeys: int
    high_risk: int
    emergencies: int
    autos: int
    cabs: int
    bikes: int


# ============================================================
# ACTIVE MONITORED JOURNEY
# ============================================================

class Journey(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    monitoring_id: int

    booking_id: int

    vehicle_id: Optional[int] = None

    passenger_name: Optional[str] = None

    vehicle_type: Optional[str] = None

    driver_name: Optional[str] = None

    origin: Optional[str] = None

    destination: Optional[str] = None

    status: Optional[str] = None

    risk_score: int = 0

    risk_level: Optional[str] = "Low"

    latitude: Optional[str] = None

    longitude: Optional[str] = None

    started_at: Optional[datetime] = None

    ended_at: Optional[datetime] = None


class Driver(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    driver_id: int
    name: Optional[str] = None
    phone_no: Optional[str] = None
    license_no: Optional[str] = None
    address: Optional[str] = None
    owner_id: Optional[int] = None
    vehicle_id: Optional[int] = None


class Vehicle(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    vehicle_id: int
    vehicle_no: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_type: Optional[str] = None
    owner_id: Optional[int] = None

# ==============================
# EMERGENCY EVENT
# ==============================
class EmergencyEventBase(BaseModel):
    booking_id: int
    vehicle_id: Optional[int] = None
    passenger_name: Optional[str] = None

    risk_score: int
    risk_level: str
    reason: Optional[str] = None


class EmergencyEventCreate(EmergencyEventBase):
    pass


class EmergencyEvent(EmergencyEventBase):
    model_config = ConfigDict(from_attributes=True)

    emergency_id: int

    status: str
    officer_action: str

    stop_requested: int
    vehicle_stopped: int
    patrol_dispatched: int

    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None 