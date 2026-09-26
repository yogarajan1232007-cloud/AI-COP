import requests


# ==========================================
# IoT VEHICLE CONFIGURATION
# ==========================================

# For now, this is disabled because
# we are testing the backend before connecting
# the physical vehicle.

IOT_ENABLED = False

# Later, replace this with your ESP32/Arduino IP.
# Example:
# IOT_VEHICLE_URL = "http://192.168.1.100"
IOT_VEHICLE_URL = "http://192.168.1.100"


# ==========================================
# SEND STOP COMMAND
# ==========================================

def send_stop_command(vehicle_id: int):

    print(
        f"[IOT] STOP command requested for vehicle {vehicle_id}"
    )

    # --------------------------------------
    # TEST MODE
    # --------------------------------------

    if not IOT_ENABLED:

        print(
            f"[IOT TEST MODE] Vehicle {vehicle_id} "
            f"would receive STOP command"
        )

        return {
            "success": True,
            "mode": "test",
            "vehicle_id": vehicle_id,
            "command": "STOP"
        }


    # --------------------------------------
    # REAL IoT MODE
    # --------------------------------------

    try:

        response = requests.post(
            f"{IOT_VEHICLE_URL}/stop",
            json={
                "vehicle_id": vehicle_id,
                "command": "STOP"
            },
            timeout=5
        )

        response.raise_for_status()

        return {
            "success": True,
            "mode": "iot",
            "vehicle_id": vehicle_id,
            "command": "STOP",
            "device_response": response.json()
        }

    except Exception as e:

        print(
            "[IOT ERROR]:",
            e
        )

        return {
            "success": False,
            "mode": "iot",
            "vehicle_id": vehicle_id,
            "command": "STOP",
            "error": str(e)
        }
    # ==========================================
# SEND START COMMAND
# ==========================================

def send_start_command(vehicle_id: int):

    print(
        f"[IOT] START command requested for vehicle {vehicle_id}"
    )

    # --------------------------------------
    # TEST MODE
    # --------------------------------------

    if not IOT_ENABLED:

        print(
            f"[IOT TEST MODE] Vehicle {vehicle_id} "
            f"would receive START command"
        )

        return {
            "success": True,
            "mode": "test",
            "vehicle_id": vehicle_id,
            "command": "START"
        }

    # --------------------------------------
    # REAL IoT MODE
    # --------------------------------------

    try:

        response = requests.post(
            f"{IOT_VEHICLE_URL}/start",
            json={
                "vehicle_id": vehicle_id,
                "command": "START"
            },
            timeout=5
        )

        response.raise_for_status()

        return {
            "success": True,
            "mode": "iot",
            "vehicle_id": vehicle_id,
            "command": "START",
            "device_response": response.json()
        }

    except Exception as e:

        print(
            "[IOT ERROR]:",
            e
        )

        return {
            "success": False,
            "mode": "iot",
            "vehicle_id": vehicle_id,
            "command": "START",
            "error": str(e)
        }