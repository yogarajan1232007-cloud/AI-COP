from sqlalchemy.orm import Session
import models
from datetime import datetime
from qr_generator import generate_qr
from iot_controller import (
    send_stop_command,
    send_start_command
)

# ============================================================
# CREATE VEHICLE
# ============================================================

def create_vehicle(db: Session, vehicle):

    qr_path = generate_qr(vehicle.vehicle_no)

    db_vehicle = models.Vehicle(
        owner_id=vehicle.owner_id,
        vehicle_no=vehicle.vehicle_no,
        vehicle_model=vehicle.vehicle_model,
        rc_book_path=vehicle.rc_book_path,
        insurance_path=vehicle.insurance_path
    )

    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)

    return db_vehicle


# ============================================================
# DASHBOARD STATS
#
# IMPORTANT:
# These cards are based on journeys actually being monitored
# by the Police Dashboard.
# ============================================================

def get_dashboard_stats(db: Session):

    # --------------------------------------------------------
    # ACTIVE MONITORED JOURNEYS
    # --------------------------------------------------------

    active_journeys = (
        db.query(models.JourneyMonitoring)
        .filter(
            models.JourneyMonitoring.status == "IN_TRANSIT"
        )
        .count()
    )

    # --------------------------------------------------------
    # ACTIVE VEHICLE TYPE COUNTS
    #
    # Only vehicles currently participating in monitored
    # journeys are counted.
    # --------------------------------------------------------

    active_monitoring = (
        db.query(models.JourneyMonitoring)
        .filter(
            models.JourneyMonitoring.status == "IN_TRANSIT"
        )
        .all()
    )

    autos = 0
    cabs = 0
    bikes = 0

    for journey in active_monitoring:

        vehicle_type = (
            journey.vehicle_type or ""
        ).strip().lower()

        if "auto" in vehicle_type:

            autos += 1

        elif "bike" in vehicle_type:

            bikes += 1

        else:

            cabs += 1

    # --------------------------------------------------------
    # HIGH RISK
    #
    # High/Critical active emergency events.
    # --------------------------------------------------------

    high_risk = (
        db.query(models.EmergencyEvent)
        .filter(
            models.EmergencyEvent.status == "Active",
            models.EmergencyEvent.risk_level.in_(
                ["High", "Critical"]
            )
        )
        .count()
    )

    # --------------------------------------------------------
    # ACTIVE EMERGENCIES
    # --------------------------------------------------------

    emergencies = (
        db.query(models.EmergencyEvent)
        .filter(
            models.EmergencyEvent.status == "Active"
        )
        .count()
    )

    return {
        "active_journeys": active_journeys,
        "autos": autos,
        "cabs": cabs,
        "bikes": bikes,
        "high_risk": high_risk,
        "emergencies": emergencies
    }


# ============================================================
# ACTIVE JOURNEYS
#
# Returns only journeys currently being monitored.
# ============================================================

def get_active_journeys(db: Session):

    journeys = (
        db.query(models.JourneyMonitoring)
        .filter(
            models.JourneyMonitoring.status == "IN_TRANSIT"
        )
        .order_by(
            models.JourneyMonitoring.started_at.desc()
        )
        .all()
    )

    return journeys


# ============================================================
# CREATE JOURNEY MONITORING
#
# Creates the Police Dashboard monitoring record when a
# booking actually starts its journey.
# ============================================================

def create_journey_monitoring(
    db: Session,
    booking
):

    # --------------------------------------------------------
    # CHECK FOR EXISTING MONITORING RECORD
    # --------------------------------------------------------

    existing = (
        db.query(models.JourneyMonitoring)
        .filter(
            models.JourneyMonitoring.booking_id
            == booking.booking_id
        )
        .first()
    )

    # --------------------------------------------------------
    # IF ALREADY IN TRANSIT, DON'T CREATE DUPLICATE
    # --------------------------------------------------------

    if existing:

        if existing.status == "IN_TRANSIT":

            return existing

        # ----------------------------------------------------
        # If an old record is completed, remove it so this
        # booking can be monitored again.
        # ----------------------------------------------------

        db.delete(existing)
        db.commit()

    # --------------------------------------------------------
    # DEFAULT VALUES
    # --------------------------------------------------------

    vehicle_type = "CAB"
    driver_name = "Driver Pending"

    # --------------------------------------------------------
    # GET VEHICLE INFORMATION
    # --------------------------------------------------------

    if booking.vehicle_id:

        vehicle = (
            db.query(models.Vehicle)
            .filter(
                models.Vehicle.vehicle_id
                == booking.vehicle_id
            )
            .first()
        )

        if vehicle:

            vehicle_type = (
                vehicle.vehicle_type
                or "CAB"
            )

        # ----------------------------------------------------
        # GET DRIVER
        # ----------------------------------------------------

        driver = (
            db.query(models.Driver)
            .filter(
                models.Driver.vehicle_id
                == booking.vehicle_id
            )
            .first()
        )

        if driver:

            driver_name = (
                driver.name
                or "Driver Pending"
            )

    # --------------------------------------------------------
    # CREATE MONITORING RECORD
    # --------------------------------------------------------

    monitoring = models.JourneyMonitoring(

        booking_id=booking.booking_id,

        vehicle_id=booking.vehicle_id,

        passenger_name=booking.passenger_name,

        vehicle_type=vehicle_type,

        driver_name=driver_name,

        origin=booking.boarding_point,

        destination=booking.destination_point,

        status="IN_TRANSIT",

        risk_score=0,

        risk_level="Low",

        started_at=datetime.utcnow()
    )

    db.add(monitoring)
    db.commit()
    db.refresh(monitoring)

    return monitoring


# ============================================================
# COMPLETE JOURNEY MONITORING
#
# Moves the monitoring record from IN_TRANSIT to COMPLETED.
# ============================================================

def complete_journey_monitoring(
    db: Session,
    booking_id: int
):

    monitoring = (
        db.query(models.JourneyMonitoring)
        .filter(
            models.JourneyMonitoring.booking_id
            == booking_id,
            models.JourneyMonitoring.status
            == "IN_TRANSIT"
        )
        .first()
    )

    if not monitoring:

        return None

    monitoring.status = "COMPLETED"

    monitoring.ended_at = datetime.utcnow()

    db.commit()
    db.refresh(monitoring)

    return monitoring


# ============================================================
# GET DRIVERS
# ============================================================

def get_drivers(db: Session):

    drivers = (
        db.query(models.Driver)
        .all()
    )

    return drivers


# ============================================================
# GET VEHICLES
# ============================================================

def get_vehicles(db: Session):

    vehicles = (
        db.query(models.Vehicle)
        .all()
    )

    return vehicles


# ============================================================
# EMERGENCY EVENTS
# ============================================================

def create_emergency_event(
    db: Session,
    emergency_data
):

    emergency = models.EmergencyEvent(

        booking_id=emergency_data.booking_id,

        vehicle_id=emergency_data.vehicle_id,

        passenger_name=emergency_data.passenger_name,

        risk_score=emergency_data.risk_score,

        risk_level=emergency_data.risk_level,

        reason=emergency_data.reason,

        status="Active",

        officer_action="None",

        stop_requested=0,

        vehicle_stopped=0,

        patrol_dispatched=0
    )

    db.add(emergency)

    db.commit()

    db.refresh(emergency)

    return emergency


# ============================================================
# GET ACTIVE EMERGENCIES
# ============================================================

def get_active_emergencies(db: Session):

    emergencies = (
        db.query(models.EmergencyEvent)
        .filter(
            models.EmergencyEvent.status
            == "Active"
        )
        .order_by(
            models.EmergencyEvent.created_at.desc()
        )
        .all()
    )

    return emergencies


# ============================================================
# GET SINGLE EMERGENCY
# ============================================================

def get_emergency(
    db: Session,
    emergency_id: int
):

    return (
        db.query(models.EmergencyEvent)
        .filter(
            models.EmergencyEvent.emergency_id
            == emergency_id
        )
        .first()
    )


# ============================================================
# UPDATE EMERGENCY ACTION
#
# Officer actions:
#   STOP
#   START
#   DISPATCH_PATROL
#   RESOLVE
# ============================================================

def update_emergency_action(
    db: Session,
    emergency_id: int,
    officer_action: str
):

    emergency = get_emergency(
        db,
        emergency_id
    )

    if not emergency:

        return None

    # ========================================================
    # STOP VEHICLE
    # ========================================================

    if officer_action == "STOP":

        emergency.officer_action = "STOP"

        emergency.stop_requested = 1

        # ----------------------------------------------------
        # Send STOP command to IoT layer
        # ----------------------------------------------------

        if emergency.vehicle_id is not None:

            iot_result = send_stop_command(
                emergency.vehicle_id
            )

            print(
                "[IOT STOP RESULT]:",
                iot_result
            )

    # ========================================================
    # START / RELEASE VEHICLE
    # ========================================================

    elif officer_action == "START":

        emergency.officer_action = "START"

        emergency.stop_requested = 0

        emergency.vehicle_stopped = 0

        # ----------------------------------------------------
        # Send START command to IoT layer
        # ----------------------------------------------------

        if emergency.vehicle_id is not None:

            iot_result = send_start_command(
                emergency.vehicle_id
            )

            print(
                "[IOT START RESULT]:",
                iot_result
            )

    # ========================================================
    # DISPATCH PATROL
    # ========================================================

    elif officer_action == "DISPATCH_PATROL":

        emergency.officer_action = (
            "DISPATCH_PATROL"
        )

        emergency.patrol_dispatched = 1

    # ========================================================
    # RESOLVE
    # ========================================================

    elif officer_action == "RESOLVE":

        emergency.officer_action = "RESOLVE"

        emergency.status = "Resolved"

        emergency.resolved_at = datetime.utcnow()

    # ========================================================
    # SAVE
    # ========================================================

    db.commit()

    db.refresh(emergency)

    return emergency