from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Enum,
    Date,
    DateTime
)

from datetime import datetime

from database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    user_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100)
    )

    dob = Column(
        Date
    )

    gender = Column(
        Enum("Male", "Female", "Other")
    )

    phone_no = Column(
        String(15)
    )

    address = Column(
        String
    )

    emergency_number = Column(
        String(15)
    )

    mail_id = Column(
        String(100)
    )


# ============================================================
# VEHICLE OWNER
# ============================================================

class VehicleOwner(Base):
    __tablename__ = "vehicle_owners"

    owner_id = Column(
        Integer,
        primary_key=True
    )

    owner_name = Column(
        String(100)
    )

    phone_no = Column(
        String(15)
    )

    address = Column(
        String
    )


# ============================================================
# VEHICLE
# ============================================================

class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id = Column(
        Integer,
        primary_key=True
    )

    owner_id = Column(
        Integer,
        ForeignKey("vehicle_owners.owner_id")
    )

    vehicle_no = Column(
        String(20)
    )

    vehicle_type = Column(
        String(30)
    )

    vehicle_model = Column(
        String(50)
    )

    rc_book_path = Column(
        String(255)
    )

    insurance_path = Column(
        String(255)
    )

    qr_code = Column(
        String(255)
    )


# ============================================================
# DRIVER
# ============================================================

class Driver(Base):
    __tablename__ = "drivers"

    driver_id = Column(
        Integer,
        primary_key=True
    )

    owner_id = Column(
        Integer,
        ForeignKey("vehicle_owners.owner_id")
    )

    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.vehicle_id")
    )

    name = Column(
        String(100)
    )

    dob = Column(
        Date,
        nullable=True
    )

    gender = Column(
        Enum("Male", "Female", "Other"),
        nullable=True
    )

    address = Column(
        String
    )

    phone_no = Column(
        String(15)
    )

    license_no = Column(
        String(50)
    )


# ============================================================
# BOOKING
# ============================================================

class Booking(Base):
    __tablename__ = "bookings"

    booking_id = Column(
        Integer,
        primary_key=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.user_id")
    )

    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.vehicle_id")
    )

    passenger_name = Column(
        String(100)
    )

    gender = Column(
        Enum("Male", "Female", "Other")
    )

    age = Column(
        Integer
    )

    phone_no = Column(
        String(15)
    )

    boarding_point = Column(
        String(255)
    )

    destination_point = Column(
        String(255)
    )

    booking_status = Column(
        Enum(
            "Pending",
            "Active",
            "Completed"
        )
    )


# ============================================================
# JOURNEY MONITORING
#
# This table represents journeys that are actually being
# monitored by the Police Dashboard.
# ============================================================

class JourneyMonitoring(Base):
    __tablename__ = "journey_monitoring"

    monitoring_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_id = Column(
        Integer,
        ForeignKey("bookings.booking_id"),
        nullable=False,
        unique=True
    )

    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.vehicle_id"),
        nullable=True
    )

    passenger_name = Column(
        String(100),
        nullable=True
    )

    vehicle_type = Column(
        String(30),
        nullable=True
    )

    driver_name = Column(
        String(100),
        nullable=True
    )

    origin = Column(
        String(255),
        nullable=True
    )

    destination = Column(
        String(255),
        nullable=True
    )

    status = Column(
        String(30),
        default="IN_TRANSIT"
    )

    risk_score = Column(
        Integer,
        default=0
    )

    risk_level = Column(
        String(30),
        default="Low"
    )

    latitude = Column(
        String(50),
        nullable=True
    )

    longitude = Column(
        String(50),
        nullable=True
    )

    started_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    ended_at = Column(
        DateTime,
        nullable=True
    )


# ============================================================
# JOURNEY HISTORY
# ============================================================

class JourneyHistory(Base):
    __tablename__ = "journey_history"

    id = Column(
        Integer,
        primary_key=True
    )

    passenger_name = Column(
        String(100)
    )

    driver_name = Column(
        String(100)
    )

    vehicle_type = Column(
        String(30)
    )

    origin = Column(
        String(255)
    )

    destination = Column(
        String(255)
    )

    start_time = Column(
        DateTime
    )

    end_time = Column(
        DateTime
    )

    duration_minutes = Column(
        Integer
    )


# ============================================================
# EMERGENCY EVENT
# ============================================================

class EmergencyEvent(Base):
    __tablename__ = "emergency_events"

    emergency_id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_id = Column(
        Integer,
        ForeignKey("bookings.booking_id"),
        nullable=False
    )

    vehicle_id = Column(
        Integer,
        ForeignKey("vehicles.vehicle_id"),
        nullable=True
    )

    passenger_name = Column(
        String(100),
        nullable=True
    )

    risk_score = Column(
        Integer,
        nullable=False
    )

    risk_level = Column(
        String(30),
        nullable=False
    )

    reason = Column(
        String(500),
        nullable=True
    )

    status = Column(
        String(30),
        default="Active"
    )

    officer_action = Column(
        String(50),
        default="None"
    )

    stop_requested = Column(
        Integer,
        default=0
    )

    vehicle_stopped = Column(
        Integer,
        default=0
    )

    patrol_dispatched = Column(
        Integer,
        default=0
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    resolved_at = Column(
        DateTime,
        nullable=True
    )