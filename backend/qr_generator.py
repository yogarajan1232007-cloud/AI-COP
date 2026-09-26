import qrcode
import os

QR_FOLDER = "qr_codes"


def generate_qr(vehicle_no):
    """
    Simple QR generator used by crud.py
    """

    if not os.path.exists(QR_FOLDER):
        os.makedirs(QR_FOLDER)

    filename = f"{QR_FOLDER}/{vehicle_no}.png"

    qr = qrcode.QRCode(
        version=1,
        box_size=10,
        border=4
    )

    qr.add_data(vehicle_no)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save(filename)

    return filename


def generate_driver_qr(
    vehicle_no,
    vehicle_model,
    driver_name,
    phone,
    address
):
    """
    Detailed driver QR
    """

    data = f"""
VEHICLE DETAILS

Vehicle Number: {vehicle_no}
Vehicle Model: {vehicle_model}

DRIVER DETAILS

Name: {driver_name}
Phone: {phone}
Address: {address}

Verified by AI-COP Transport Safety System
"""

    if not os.path.exists(QR_FOLDER):
        os.makedirs(QR_FOLDER)

    filename = f"{QR_FOLDER}/{vehicle_no}.png"

    qr = qrcode.QRCode(
        version=1,
        box_size=10,
        border=4
    )

    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    img.save(filename)

    return filename