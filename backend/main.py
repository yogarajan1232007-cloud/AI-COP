from fastapi import FastAPI, Depends, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import requests  # type: ignore[import-untyped]
from datetime import datetime, timedelta
import models
import schemas
import crud
import database
from sqlalchemy import text
import shutil
import os
from qr_generator import generate_driver_qr
from fastapi.staticfiles import StaticFiles
from rnn_models import risk_model, anomaly_model, eta_model, demand_model


# CREATE TABLES
models.Base.metadata.create_all(bind=database.engine)


# FASTAPI APP
os.makedirs("qr_codes", exist_ok=True)
os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="AI-COP API")

# Static file serving
app.mount("/qr_codes", StaticFiles(directory="qr_codes"), name="qr_codes")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DASHBOARD STATS
@app.get("/api/stats", response_model=schemas.DashboardStats)
def read_stats(db: Session = Depends(database.get_db)):
    return crud.get_dashboard_stats(db)


# ACTIVE JOURNEYS
@app.get("/api/journeys/active", response_model=list[schemas.Journey])
def read_active_journeys(db: Session = Depends(database.get_db)):
    return crud.get_active_journeys(db)


# DRIVERS
@app.get("/api/drivers", response_model=list[schemas.Driver])
def read_drivers(db: Session = Depends(database.get_db)):
    return crud.get_drivers(db)


# VEHICLES
@app.get("/api/vehicles", response_model=list[schemas.Vehicle])
def read_vehicles(db: Session = Depends(database.get_db)):
    return crud.get_vehicles(db)


# -----------------------------
# MAP LOGIC
# -----------------------------

def geocode_place(place: str):

    try:

        url = "https://nominatim.openstreetmap.org/search"

        params = {
            "q": place,
            "format": "json",
            "limit": 1
        }

        headers = {
            "User-Agent": "ai-cop-monitoring-system"
        }

        r = requests.get(url, params=params, headers=headers, timeout=5)

        data = r.json()

        if not data:
            return None

        return [
            float(data[0]["lat"]),
            float(data[0]["lon"])
        ]

    except Exception:
        return None


def get_route(start, end):

    try:

        if not start or not end:
            return {
                "coords":[start,end],
                "eta":0,
                "distance":0
            }

        url = (
            f"https://router.project-osrm.org/route/v1/driving/"
            f"{start[1]},{start[0]};{end[1]},{end[0]}"
            "?overview=full&geometries=geojson"
        )

        r = requests.get(url, timeout=5)

        data = r.json()

        route = data["routes"][0]

        coords = [[c[1], c[0]] for c in route["geometry"]["coordinates"]]

        duration = round(route["duration"] / 60)

        distance = round(route["distance"] / 1000, 2)

        return {
            "coords": coords,
            "eta": duration,
            "distance": distance
        }

    except Exception:

        return {
            "coords":[start,end],
            "eta":0,
            "distance":0
        }


@app.get("/api/map/live")
def get_live_map_data(db: Session = Depends(database.get_db)):

    try:

        result = db.execute(text("""
    SELECT
        b.booking_id,
        b.passenger_name,
        b.gender,
        b.boarding_point,
        b.destination_point,
        b.vehicle_id,

        v.vehicle_no,
        v.vehicle_type,
        v.vehicle_model,

        d.name AS driver_name,
        d.phone_no AS driver_phone

    FROM journey_monitoring jm

    INNER JOIN bookings b
        ON jm.booking_id = b.booking_id

    LEFT JOIN vehicles v
        ON jm.vehicle_id = v.vehicle_id

    LEFT JOIN drivers d
        ON jm.vehicle_id = d.vehicle_id

    WHERE jm.status = 'IN_TRANSIT'

    ORDER BY jm.monitoring_id DESC
"""))
        rows = result.fetchall()

        vehicles = []

        for r in rows:

            origin = r.boarding_point or "Unknown"
            destination = r.destination_point or "Unknown"

            # --------------------------------
            # GEOCODE FROM / TO
            # --------------------------------

            start = geocode_place(origin)
            end = geocode_place(destination)

            # --------------------------------
            # FALLBACK LOCATION
            # --------------------------------

            if not start:
                start = [11.0168, 77.0019]

            if not end:
                end = [11.0168, 77.0019]

            # --------------------------------
            # GET ROAD ROUTE
            # --------------------------------

            route = get_route(start, end)

            # --------------------------------
            # MAP VEHICLE OBJECT
            # --------------------------------

            vehicles.append({

                # Booking
                "id": str(r.booking_id),
                "booking_id": r.booking_id,

                # Passenger
                "passenger_name": r.passenger_name or "Passenger",
                "gender": r.gender or "Unknown",

                # Vehicle
                "vehicle_id": r.vehicle_id,
                "vehicle_no": r.vehicle_no or "Not Assigned",
                "vehicle_type": r.vehicle_type or "CAB",
                "vehicle_model": r.vehicle_model or "Vehicle",

                # Driver
                "driver_name": r.driver_name or "Driver Pending",
                "driver_phone": r.driver_phone or "",

                # Route
                "origin": origin,
                "destination": destination,
                "start": start,
                "end": end,
                "route": route["coords"],

                # Route information
                "eta": route["eta"],
                "distance": route["distance"],

                # Existing risk field
                "risk_score": 2,
                "risk_level": "Low"

            })

        return vehicles

    except Exception as e:

        print("MAP ERROR:", e)

        return []
# ============================================================
# START JOURNEY
# ============================================================

@app.post("/api/journey/start")
def start_journey(
    data: dict,
    db: Session = Depends(database.get_db)
):

    try:

        booking_id = data.get("booking_id")

        # ----------------------------------------------------
        # VALIDATE BOOKING ID
        # ----------------------------------------------------

        if not booking_id:

            return {
                "status": "error",
                "message": "booking_id is required"
            }

        # ----------------------------------------------------
        # FIND BOOKING
        # ----------------------------------------------------

        booking = (
            db.query(models.Booking)
            .filter(
                models.Booking.booking_id == booking_id
            )
            .first()
        )

        if not booking:

            return {
                "status": "error",
                "message": "Booking not found"
            }

        # ----------------------------------------------------
        # ALREADY COMPLETED
        # ----------------------------------------------------

        if booking.booking_status == "Completed":

            return {
                "status": "error",
                "message": "Journey is already completed"
            }

        # ----------------------------------------------------
        # ALREADY ACTIVE
        # ----------------------------------------------------

        if booking.booking_status == "Active":

            monitoring = (
                db.query(models.JourneyMonitoring)
                .filter(
                    models.JourneyMonitoring.booking_id
                    == booking.booking_id,
                    models.JourneyMonitoring.status
                    == "IN_TRANSIT"
                )
                .first()
            )

            # If booking is Active but monitoring record
            # doesn't exist, repair the monitoring state.
            if not monitoring:

                monitoring = crud.create_journey_monitoring(
                    db,
                    booking
                )

            return {
                "status": "success",
                "message": "Journey is already active",
                "booking_id": booking.booking_id,
                "booking_status": "Active",
                "monitoring_id": monitoring.monitoring_id
            }

        # ----------------------------------------------------
        # START JOURNEY
        # ----------------------------------------------------

        booking.booking_status = "Active"

        db.commit()
        db.refresh(booking)

        # ----------------------------------------------------
        # CREATE POLICE DASHBOARD MONITORING RECORD
        # ----------------------------------------------------

        monitoring = crud.create_journey_monitoring(
            db,
            booking
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {
            "status": "success",
            "message": "Journey started",
            "booking_id": booking.booking_id,
            "booking_status": booking.booking_status,
            "monitoring_id": monitoring.monitoring_id
        }

    except Exception as e:

        db.rollback()

        print(
            "START JOURNEY ERROR:",
            e
        )

        return {
            "status": "error",
            "message": "Failed to start journey"
        }
# ============================================================
# COMPLETE JOURNEY
# ============================================================

@app.post("/api/journey/complete")
def complete_journey(
    data: dict,
    db: Session = Depends(database.get_db)
):

    try:

        # ----------------------------------------------------
        # GET START TIME
        # ----------------------------------------------------

        start_time_str = data["start_time"].replace(
            "Z",
            "+00:00"
        )

        start = datetime.fromisoformat(
            start_time_str
        )

        # ----------------------------------------------------
        # END TIME
        # ----------------------------------------------------

        end = datetime.now(
            start.tzinfo
        )

        # ----------------------------------------------------
        # DURATION
        # ----------------------------------------------------

        duration = int(
            (end - start).total_seconds() / 60
        )

        # ----------------------------------------------------
        # GET BOOKING ID
        # ----------------------------------------------------

        booking_id = data.get(
            "booking_id"
        )

        # ----------------------------------------------------
        # COMPLETE MONITORING RECORD
        # ----------------------------------------------------

        if booking_id:

            monitoring = crud.complete_journey_monitoring(
                db,
                booking_id
            )

            # If no monitoring record exists,
            # don't silently create one.
            if not monitoring:

                print(
                    "MONITORING RECORD NOT FOUND:",
                    booking_id
                )

        # ----------------------------------------------------
        # SAVE JOURNEY HISTORY
        # ----------------------------------------------------

        query = text("""
            INSERT INTO journey_history
            (
                passenger_name,
                driver_name,
                vehicle_type,
                origin,
                destination,
                start_time,
                end_time,
                duration_minutes
            )
            VALUES
            (
                :passenger_name,
                :driver_name,
                :vehicle_type,
                :origin,
                :destination,
                :start_time,
                :end_time,
                :duration
            )
        """)

        db.execute(
            query,
            {
                "passenger_name": data.get(
                    "passenger_name",
                    "Passenger"
                ),

                "driver_name": data.get(
                    "driver_name",
                    "Driver Pending"
                ),

                "vehicle_type": data.get(
                    "vehicle_type",
                    "CAB"
                ),

                "origin": data.get(
                    "origin",
                    "Unknown"
                ),

                "destination": data.get(
                    "destination",
                    "Unknown"
                ),

                "start_time": start,

                "end_time": end,

                "duration": duration
            }
        )

        # ----------------------------------------------------
        # COMPLETE SPECIFIC BOOKING
        # ----------------------------------------------------

        if booking_id:

            db.execute(
                text("""
                    UPDATE bookings
                    SET booking_status = 'Completed'
                    WHERE booking_id = :booking_id
                """),
                {
                    "booking_id": booking_id
                }
            )

        else:

            # ------------------------------------------------
            # FALLBACK
            # ------------------------------------------------

            db.execute(
                text("""
                    UPDATE bookings
                    SET booking_status = 'Completed'
                    WHERE booking_id = (
                        SELECT booking_id
                        FROM bookings
                        WHERE passenger_name = :passenger_name
                        AND booking_status = 'Pending'
                        ORDER BY booking_id DESC
                        LIMIT 1
                    )
                """),
                {
                    "passenger_name": data.get(
                        "passenger_name"
                    )
                }
            )

        # ----------------------------------------------------
        # COMMIT EVERYTHING
        # ----------------------------------------------------

        db.commit()

        return {
            "status": "saved",
            "booking_id": booking_id,
            "monitoring_completed": bool(booking_id)
        }

    except Exception as e:

        db.rollback()

        print(
            "COMPLETE JOURNEY ERROR:",
            e
        )

        return {
            "status": "error",
            "message": "Failed to complete journey"
        }
# -----------------------------
# CREATE BOOKING
# -----------------------------

@app.post("/bookings/create")
def create_booking(
    data: dict,
    db: Session = Depends(database.get_db)
):
    try:

        # ---------------------------------------------------------
        # 1. Validate vehicle
        # ---------------------------------------------------------

        vehicle_id = data.get("vehicle_id")

        if not vehicle_id:
            return {
                "status": "error",
                "message": "Vehicle is required"
            }

        vehicle = (
            db.query(models.Vehicle)
            .filter(
                models.Vehicle.vehicle_id == vehicle_id
            )
            .first()
        )

        if not vehicle:
            return {
                "status": "error",
                "message": "Selected vehicle not found"
            }

        # ---------------------------------------------------------
        # 2. Validate driver assigned to this vehicle
        # ---------------------------------------------------------

        driver = (
            db.query(models.Driver)
            .filter(
                models.Driver.vehicle_id == vehicle_id
            )
            .first()
        )

        if not driver:
            return {
                "status": "error",
                "message": "No driver is assigned to this vehicle"
            }

        # ---------------------------------------------------------
        # 3. Create booking
        #
        # IMPORTANT:
        # A confirmed booking immediately becomes Active.
        # ---------------------------------------------------------

        booking = models.Booking(
            passenger_name=data.get("passenger_name"),
            gender=data.get("gender"),
            age=data.get("age"),
            phone_no=data.get("phone_no"),
            boarding_point=data.get("boarding_point"),
            destination_point=data.get("destination_point"),
            vehicle_id=vehicle_id,
            booking_status="Active"
        )

        db.add(booking)

        # Get booking_id before creating monitoring record
        db.flush()

        # ---------------------------------------------------------
        # 4. Create Police Dashboard monitoring record
        # ---------------------------------------------------------

        monitoring = crud.create_journey_monitoring(
            db,
            booking
        )

        # ---------------------------------------------------------
        # 5. Final response
        # ---------------------------------------------------------

        return {
            "status": "success",
            "message": "Ride booked and journey monitoring started",
            "booking_id": booking.booking_id,
            "booking_status": "Active",
            "monitoring_id": monitoring.monitoring_id,
            "vehicle_id": vehicle.vehicle_id,
            "vehicle_no": vehicle.vehicle_no,
            "vehicle_type": vehicle.vehicle_type,
            "vehicle_model": vehicle.vehicle_model,
            "driver_id": driver.driver_id,
            "driver_name": driver.name,
            "driver_phone": driver.phone_no
        }

    except Exception as e:

        db.rollback()

        print("BOOKING ERROR:", e)

        return {
            "status": "error",
            "message": "Booking failed"
        }
# -----------------------------
# GET BOOKINGS (ACTIVE)
# -----------------------------

@app.get("/bookings")
def get_bookings(db: Session = Depends(database.get_db)):

    try:

        query = text("""
        SELECT
        b.booking_id,
        b.passenger_name,
        b.boarding_point,
        b.destination_point,
        b.phone_no,
        b.gender,
        b.age,
        b.vehicle_id,
        v.vehicle_model,
        d.name AS driver_name,
        d.phone_no AS driver_phone
    FROM bookings b
    LEFT JOIN vehicles v
        ON b.vehicle_id = v.vehicle_id
    LEFT JOIN drivers d
        ON b.vehicle_id = d.vehicle_id
    WHERE b.booking_status = 'Pending'
    ORDER BY b.booking_id DESC
    """)
        result = db.execute(query)

        rows = result.fetchall()

        bookings = []

        for r in rows:
            bookings.append({
               "id": r.vehicle_id or r.booking_id,
                "booking_id": r.booking_id,
                "passenger_name": r.passenger_name,
                "origin": r.boarding_point,
                "destination": r.destination_point,
                "vehicle_type": r.vehicle_model or "CAB",
                "driver_name": r.driver_name or "Driver Pending",
                "driver_phone": r.driver_phone or "",
                "phone_no": r.phone_no or ""
            })

        return bookings

    except Exception as e:

        print("BOOKING FETCH ERROR:", e)

        return []
    
# -----------------------------
# Add vehicle
# -----------------------------
@app.post("/api/admin/add-vehicle")
async def add_vehicle(
    vehicle_no: str = Form(...),
    vehicle_type: str = Form(...),
    vehicle_model: str = Form(...),
    owner_name: str = Form(...),
    owner_phone: str = Form(...),
    owner_address: str = Form(...),
    rc_book: UploadFile = File(...),
    insurance: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    try:
        db.execute(text("""
        INSERT INTO vehicle_owners
        (owner_name, phone_no, address)
        VALUES (:name, :phone, :address)
        """), {
            "name": owner_name,
            "phone": owner_phone,
            "address": owner_address
        })
        db.commit()

        owner = db.execute(text("""
        SELECT owner_id
        FROM vehicle_owners
        ORDER BY owner_id DESC
        LIMIT 1
        """)).fetchone()

        if not owner:
            return {"status": "error", "message": "Failed to retrieve owner after insert"}

        owner_id = owner.owner_id
        folder = f"uploads/owners/owner_{owner_id}"
        os.makedirs(folder, exist_ok=True)
        rc_path = f"{folder}/{rc_book.filename}"
        ins_path = f"{folder}/{insurance.filename}"
        
        with open(rc_path, "wb") as f:
            shutil.copyfileobj(rc_book.file, f)
            
        with open(ins_path, "wb") as f:
            shutil.copyfileobj(insurance.file, f)
            
        qr_path = generate_driver_qr(
            vehicle_no,
            vehicle_model,
            owner_name,
            owner_phone,
            owner_address
        )
        
        db.execute(text("""
        INSERT INTO vehicles
        (
            owner_id,
            vehicle_no,
            vehicle_type,
            vehicle_model,
            rc_book_path,
            insurance_path,
            qr_code
        )
        VALUES
        (
            :owner_id,
            :vehicle_no,
            :vehicle_type,
            :vehicle_model,
            :rc,
            :ins,
            :qr
        )
        """), {
            "owner_id": owner_id,
            "vehicle_no": vehicle_no,
            "vehicle_type": vehicle_type,
            "vehicle_model": vehicle_model,
            "rc": rc_path,
            "ins": ins_path,
            "qr": qr_path
        })
        db.commit()
        return {"status": "vehicle added"}
    except Exception as e:
        print("ADD VEHICLE ERROR:", e)
        return {"status": "error"}
# -----------------------------
# Admin Login
# -----------------------------

@app.post("/api/admin/login")
def admin_login(data:dict):

    if data["username"]=="admin" and data["password"]=="123456":
        return {"status":"success"}

    return {"status":"invalid"}

# -----------------------------
# GET DRIVERS (ADMIN)
# -----------------------------
@app.get("/api/admin/drivers")
def admin_get_drivers(db: Session = Depends(database.get_db)):

    try:

        result = db.execute(text("""
        SELECT
        d.driver_id,
        d.name,
        d.phone_no,
        d.address,
        d.license_no,
        v.vehicle_no
        FROM drivers d
        LEFT JOIN vehicles v
        ON d.vehicle_id = v.vehicle_id
        ORDER BY d.driver_id DESC
        """))

        rows = result.fetchall()

        drivers = [dict(r._mapping) for r in rows]

        return drivers

    except Exception as e:

        print("DRIVERS FETCH ERROR:", e)

        return []

# -----------------------------
# GET VEHICLES (ADMIN)
# -----------------------------

@app.get("/api/admin/vehicles")
def admin_get_vehicles(db: Session = Depends(database.get_db)):

    try:

        result = db.execute(text("""
SELECT
v.vehicle_id,
v.vehicle_no,
v.vehicle_type,
v.vehicle_model,
o.owner_name,
o.phone_no,
o.address
FROM vehicles v
LEFT JOIN vehicle_owners o
ON v.owner_id = o.owner_id
ORDER BY v.vehicle_id DESC
"""))

        rows = result.fetchall()

        vehicles = [dict(r._mapping) for r in rows]

        return vehicles

    except Exception as e:

        print("VEHICLE FETCH ERROR:", e)

        return []
    
# -----------------------------
# DELETE VEHICLE
# -----------------------------
@app.delete("/api/admin/delete-vehicle/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(database.get_db)):

    try:

        # -----------------------------
        # GET VEHICLE DATA (including owner_id)
        # -----------------------------
        vehicle = db.execute(text("""
        SELECT vehicle_id, vehicle_no, owner_id
        FROM vehicles
        WHERE vehicle_id = :id
        """), {"id": vehicle_id}).fetchone()

        if not vehicle:
            return {"status": "vehicle not found"}

        vehicle_no = vehicle.vehicle_no
        owner_id = vehicle.owner_id

        # -----------------------------
        # DELETE DRIVERS USING VEHICLE
        # -----------------------------
        db.execute(text("""
        DELETE FROM drivers
        WHERE vehicle_id = :id
        """), {"id": vehicle_id})

        # -----------------------------
        # DELETE VEHICLE OWNER (using correct owner_id)
        # -----------------------------
        if owner_id:
            db.execute(text("""
            DELETE FROM vehicle_owners
            WHERE owner_id = :owner_id
            """), {"owner_id": owner_id})

        # -----------------------------
        # DELETE QR FILE
        # -----------------------------
        qr = db.execute(text("""
        SELECT qr_code
        FROM vehicles
        WHERE vehicle_id=:id
        """),{"id":vehicle_id}).fetchone()

        if qr and os.path.exists(qr.qr_code):
            os.remove(qr.qr_code)

        # -----------------------------
        # DELETE VEHICLE
        # -----------------------------
        db.execute(text("""
        DELETE FROM vehicles
        WHERE vehicle_id = :id
        """), {"id": vehicle_id})

        db.commit()

        return {"status": "deleted"}

    except Exception as e:

        print("DELETE VEHICLE ERROR:", e)

        return {"status": "error"}
# -----------------------------
# UPDATE Driver 
# -----------------------------

@app.put("/api/admin/update-driver/{driver_id}")
async def update_driver(
    driver_id: int,
    name: str = Form(...),
    phone: str = Form(...),
    address: str = Form(...),
    license_no: str = Form(...),
    vehicle_no: str = Form(...),
    db: Session = Depends(database.get_db)
):

    try:

        # get vehicle id
        vehicle = db.execute(text("""
        SELECT vehicle_id
        FROM vehicles
        WHERE vehicle_no=:vehicle_no
        """), {"vehicle_no": vehicle_no}).fetchone()

        if not vehicle:
            return {"status": "vehicle not found"}

        vehicle_id = vehicle.vehicle_id

        db.execute(text("""
        UPDATE drivers
        SET name=:name,
            phone_no=:phone,
            address=:address,
            license_no=:license_no,
            vehicle_id=:vehicle_id
        WHERE driver_id=:driver_id
        """),{
            "name": name,
            "phone": phone,
            "address": address,
            "license_no": license_no,
            "vehicle_id": vehicle_id,
            "driver_id": driver_id
        })

        db.commit()

        return {"status":"updated"}

    except Exception as e:

        print("UPDATE DRIVER ERROR:",e)

        return {"status":"error"}
# -----------------------------
# UPDATE VEHICLE
# -----------------------------
@app.put("/api/admin/update-vehicle/{vehicle_id}")
def update_vehicle(
    vehicle_id: int,
    vehicle_no: str = Form(...),
    vehicle_type: str = Form(...),
    vehicle_model: str = Form(...),
    owner_name: str = Form(...),
    owner_phone: str = Form(...),
    owner_address: str = Form(...),
    db: Session = Depends(database.get_db)
):

    try:

        # Update vehicle table
        db.execute(text("""
        UPDATE vehicles
        SET vehicle_no=:vehicle_no,
            vehicle_type=:vehicle_type,
            vehicle_model=:vehicle_model
        WHERE vehicle_id=:vehicle_id
        """),{
            "vehicle_no":vehicle_no,
            "vehicle_type":vehicle_type,
            "vehicle_model":vehicle_model,
            "vehicle_id":vehicle_id
        })


        # Get actual owner_id for this vehicle
        vehicle_row = db.execute(text("""
        SELECT owner_id FROM vehicles WHERE vehicle_id=:vehicle_id
        """), {"vehicle_id": vehicle_id}).fetchone()

        actual_owner_id = vehicle_row.owner_id if vehicle_row else vehicle_id

        # Update owner table (using correct owner_id)
        db.execute(text("""
        UPDATE vehicle_owners
        SET owner_name=:owner_name,
            phone_no=:owner_phone,
            address=:owner_address
        WHERE owner_id=:owner_id
        """),{
            "owner_name":owner_name,
            "owner_phone":owner_phone,
            "owner_address":owner_address,
            "owner_id":actual_owner_id
        })

        db.commit()

        return {"status":"updated"}

    except Exception as e:

        print("UPDATE VEHICLE ERROR:",e)

        return {"status":"error"}
    
# -----------------------------
# DELETE DRIVER
# -----------------------------
@app.delete("/api/admin/delete-driver/{driver_id}")
def delete_driver(driver_id: int, db: Session = Depends(database.get_db)):

    try:

        db.execute(text("""
        DELETE FROM drivers
        WHERE driver_id=:id
        """), {"id": driver_id})

        db.commit()

        return {"status": "deleted"}

    except Exception as e:

        print("DELETE DRIVER ERROR:", e)

        return {"status": "error"}
    
# -----------------------------
# GET QR CODES
# -----------------------------
@app.get("/api/admin/qrcodes")
def get_qr_codes():

    try:

        folder = "qr_codes"
        qr_list = []

        if not os.path.exists(folder):
            return []

        files = os.listdir(folder)

        for f in files:

            if f.endswith(".png"):

                vehicle_no = f.replace(".png","")

                qr_list.append({
                    "vehicle_no": vehicle_no,
                    "vehicle_model": "Auto",
                    "driver_name": "Driver",
                    "qr": f"qr_codes/{f}"
                })

        return qr_list

    except Exception as e:

        print("QR FETCH ERROR:", e)

        return []
# -----------------------------
# Add Driver
# -----------------------------
@app.post("/api/admin/add-driver")
async def add_driver(
    name: str = Form(...),
    phone: str = Form(...),
    address: str = Form(...),
    license_no: str = Form(...),
    vehicle_no: str = Form(...),
    db: Session = Depends(database.get_db)
):

    try:

        # find vehicle
        vehicle = db.execute(text("""
        SELECT vehicle_id
        FROM vehicles
        WHERE vehicle_no = :vehicle_no
        """), {"vehicle_no": vehicle_no}).fetchone()

        if not vehicle:
            return {"status": "vehicle not found"}

        vehicle_id = vehicle.vehicle_id

        # find owner from the vehicle's owner_id (not the latest owner)
        owner = db.execute(text("""
        SELECT owner_id
        FROM vehicles
        WHERE vehicle_id = :vehicle_id
        """), {"vehicle_id": vehicle_id}).fetchone()

        owner_id = owner.owner_id if owner else None

        # insert driver
        db.execute(text("""
        INSERT INTO drivers
        (owner_id, vehicle_id, name, phone_no, address, license_no)
        VALUES
        (:owner_id, :vehicle_id, :name, :phone, :address, :license_no)
        """), {
            "owner_id": owner_id,
            "vehicle_id": vehicle_id,
            "name": name,
            "phone": phone,
            "address": address,
            "license_no": license_no
        })

        db.commit()

        return {"status": "driver added"}

    except Exception as e:

        print("ADD DRIVER ERROR:", e)

        return {"status": "error"}
# -----------------------------
# Admin Analytics
# -----------------------------


@app.get("/api/admin/analytics")
def admin_analytics(db: Session = Depends(database.get_db)):

    try:

        # -----------------------------
        # VEHICLE TYPES
        # -----------------------------
        vehicles = db.execute(text("""
        SELECT vehicle_type, COUNT(*) as total
        FROM vehicles
        GROUP BY vehicle_type
        """)).fetchall()
        vehicle_types = {}
        for v in vehicles:
            vehicle_types[v.vehicle_type] = v.total


        # -----------------------------
        # DRIVER RATINGS (dummy logic)
        # -----------------------------
        drivers = db.execute(text("""
        SELECT COUNT(*) as total
        FROM drivers
        """)).fetchone()

        total_drivers = drivers.total if drivers else 0

        driver_ratings = {
            "5": int(total_drivers * 0.6),
            "4": int(total_drivers * 0.3),
            "3": int(total_drivers * 0.1),
            "below": 0
        }


        # -----------------------------
        # PASSENGER GENDER
        # (FROM journey_history)
        # -----------------------------
        # Use actual gender from bookings table instead of hardcoded name list
        gender_rows = db.execute(text("""
        SELECT gender, COUNT(*) as total
        FROM bookings
        WHERE gender IS NOT NULL
        GROUP BY gender
        """)).fetchall()

        gender_stats = {"Male":0,"Female":0}

        for g in gender_rows:
            if g.gender in gender_stats:
                gender_stats[g.gender] = g.total
            else:
                gender_stats[g.gender] = g.total



        # -----------------------------
        # JOURNEY TREND (LAST 7 DAYS)
        # -----------------------------
        trend_rows = db.execute(text("""
        SELECT DATE(start_time) as day, COUNT(*) as total
        FROM journey_history
        WHERE start_time >= date('now', '-6 days')
        GROUP BY DATE(start_time)
        ORDER BY day
        """)).fetchall()

        journey_trend = {}

        today = datetime.today().date()

        # create last 7 days
        for i in range(7):
            d = today - timedelta(days=6-i)
            journey_trend[str(d)] = 0

        # fill database results
        for r in trend_rows:
            journey_trend[str(r.day)] = r.total


        # -----------------------------
        # ORIGIN SECURITY HEAT DATA
        # -----------------------------
        origin_rows = db.execute(text("""
        SELECT origin, COUNT(*) as total
        FROM journey_history
        GROUP BY origin
        ORDER BY total DESC
        """)).fetchall()

        origin_stats = {o.origin:o.total for o in origin_rows}


        # -----------------------------
        # TODAY STATS
        # -----------------------------
        journeys = db.execute(text("""
        SELECT COUNT(*) as total
        FROM journey_history
        WHERE DATE(start_time)=date('now')
        """)).fetchone()

        today_stats = {
            "journeys": journeys.total if journeys else 0,
            "alerts": 0
        }


        return {

            "vehicle_types": vehicle_types,
            "driver_ratings": driver_ratings,
            "today_stats": today_stats,
            "gender_stats": gender_stats,
            "journey_trend": journey_trend,
            "origin_stats": origin_stats

        }

    except Exception as e:

        print("ANALYTICS ERROR:", e)
        return {}
# -----------------------------
# Completed history
# -----------------------------
@app.get("/api/journey/history")
def get_history(db: Session = Depends(database.get_db)):

    try:

        result = db.execute(text("""
        SELECT 
        id,
        passenger_name,
        driver_name,
        vehicle_type,
        origin,
        destination,
        start_time,
        end_time,
        duration_minutes
        FROM journey_history
        ORDER BY end_time DESC
        """))

        rows = result.fetchall()

        history = [dict(r._mapping) for r in rows]

        return history

    except Exception as e:

        print("HISTORY ERROR:", e)

        return []

# =============================
# RNN MODEL ENDPOINTS
# =============================

# -----------------------------
# 1. Risk Score Prediction
# -----------------------------
@app.post("/api/rnn/risk")
def predict_risk(data: dict):
    try:
        result = risk_model.predict(
            hour=data.get("hour", datetime.now().hour),
            day_of_week=data.get("day_of_week", datetime.now().weekday()),
            gender=data.get("gender", "Male"),
            zone=data.get("zone", "unknown"),
            speed=data.get("speed", 30),
            is_night=data.get("is_night", False)
        )
        return result
    except Exception as e:
        print("RISK PREDICTION ERROR:", e)
        return {"risk_score": 3, "risk_level": "Low"}


# -----------------------------
# 2. Route Anomaly Detection
# -----------------------------
@app.post("/api/rnn/anomaly")
def detect_anomaly(data: dict):
    try:
        result = anomaly_model.predict(
            route_points=data.get("route_points", []),
            expected_route=data.get("expected_route", [])
        )
        return result
    except Exception as e:
        print("ANOMALY DETECTION ERROR:", e)
        return {
            "is_anomaly": False,
            "deviation_score": 0,
            "alert_message": "Detection unavailable"
        }


# -----------------------------
# 3. ETA Prediction
# -----------------------------
@app.post("/api/rnn/eta")
def predict_eta(data: dict):
    try:
        result = eta_model.predict(
            distance_km=data.get("distance_km", 10),
            hour=data.get("hour", datetime.now().hour),
            day_of_week=data.get("day_of_week", datetime.now().weekday()),
            zone=data.get("zone", "unknown")
        )
        return result
    except Exception as e:
        print("ETA PREDICTION ERROR:", e)
        return {"predicted_eta_minutes": 15, "confidence": 0.5}


# -----------------------------
# 4. Demand Forecast
# -----------------------------
@app.get("/api/rnn/demand")
def forecast_demand():
    try:
        result = demand_model.predict()
        return result
    except Exception as e:
        print("DEMAND FORECAST ERROR:", e)
        return {"zones": {}, "timestamp": datetime.now().isoformat()}


# =============================
# EMERGENCY EVENTS
# =============================

@app.post(
    "/api/emergencies",
    response_model=schemas.EmergencyEvent
)
def create_emergency(
    data: schemas.EmergencyEventCreate,
    db: Session = Depends(database.get_db)
):
    try:
        return crud.create_emergency_event(db, data)

    except Exception as e:
        print("CREATE EMERGENCY ERROR:", e)

        return {
            "booking_id": data.booking_id,
            "vehicle_id": data.vehicle_id,
            "passenger_name": data.passenger_name,
            "risk_score": data.risk_score,
            "risk_level": data.risk_level,
            "reason": data.reason,
            "status": "Error",
            "officer_action": "None",
            "stop_requested": 0,
            "vehicle_stopped": 0,
            "patrol_dispatched": 0,
            "emergency_id": 0
        }


@app.get(
    "/api/emergencies/active",
    response_model=list[schemas.EmergencyEvent]
)
def get_active_emergencies(
    db: Session = Depends(database.get_db)
):
    return crud.get_active_emergencies(db)


@app.get(
    "/api/emergencies/{emergency_id}",
    response_model=schemas.EmergencyEvent
)
def get_emergency(
    emergency_id: int,
    db: Session = Depends(database.get_db)
):

    emergency = crud.get_emergency(
        db,
        emergency_id
    )

    if not emergency:
        return {
            "emergency_id": emergency_id,
            "booking_id": 0,
            "risk_score": 0,
            "risk_level": "Unknown",
            "status": "Not Found",
            "officer_action": "None",
            "stop_requested": 0,
            "vehicle_stopped": 0,
            "patrol_dispatched": 0
        }

    return emergency


@app.put(
    "/api/emergencies/{emergency_id}/action",
    response_model=schemas.EmergencyEvent
)
def emergency_action(
    emergency_id: int,
    data: dict,
    db: Session = Depends(database.get_db)
):

    officer_action = data.get("officer_action")

    allowed_actions = [
    "STOP",
    "START",
    "DISPATCH_PATROL",
    "RESOLVE"
]

    if officer_action not in allowed_actions:
        return {
            "error": "Invalid officer action"
        }

    emergency = crud.update_emergency_action(
        db,
        emergency_id,
        officer_action
    )

    if not emergency:
        return {
            "error": "Emergency not found"
        }

    return emergency
@app.delete("/api/reset/journeys")
def reset_journeys(db: Session = Depends(database.get_db)):
    try:
        # 1. Remove old emergency records
        db.query(models.EmergencyEvent).delete(
            synchronize_session=False
        )

        # 2. Remove journey history
        db.query(models.JourneyHistory).delete(
            synchronize_session=False
        )

        # 3. Reset all Active/Completed bookings to Pending
        db.query(models.Booking).filter(
            models.Booking.booking_status.in_(["Active", "Completed"])
        ).update(
            {"booking_status": "Pending"},
            synchronize_session=False
        )

        db.commit()

        return {
            "status": "success",
            "message": "Journey system reset successfully",
            "active_journeys": 0,
            "history_deleted": True,
            "emergencies_deleted": True
        }

    except Exception as e:
        db.rollback()

        print("RESET JOURNEYS ERROR:", e)

        return {
            "status": "error",
            "message": "Failed to reset journey system"
        }