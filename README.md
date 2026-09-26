# AI-COP
## Artificial Intelligence – Centralized Observation & Protection

AI-COP is a consent-based, privacy-aware, real-time night public-transport safety monitoring system designed to support the safety of women passengers during night journeys.

The system combines passenger journey monitoring, AI-assisted risk analysis, centralized backend services, police monitoring, emergency response workflows, and an IoT-enabled physical vehicle prototype.

---

## 1. Problem Statement

Women travelling through public transport during night hours may face safety risks such as unexpected route deviations, excessive vehicle speed, and other abnormal journey conditions.

Existing transport monitoring systems can provide basic tracking and journey information, but they may not provide an integrated mechanism for:

- Continuous risk analysis
- Early identification of potentially risky journeys
- Centralized police monitoring
- Structured emergency escalation
- Human-verified intervention
- Physical vehicle intervention through an IoT prototype
- Journey and emergency record management

AI-COP addresses these gaps through an integrated AI-assisted safety monitoring architecture.

---

## 2. Proposed Solution

AI-COP provides a centralized platform connecting:

1. Women Passenger Mobile Application
2. Transport / Driver System
3. AI Risk Analysis Engine
4. FastAPI Backend
5. Database
6. Police Monitoring Dashboard
7. IoT-enabled Physical Vehicle Prototype

During an authorized journey, the system analyses permitted journey signals such as vehicle speed and route behaviour.

The AI risk engine generates:

- Risk Score
- Risk Level
- Risk Factors / Reasons

The AI system functions as a decision-support mechanism. The final intervention decision remains with the authorized human operator.

---

## 3. Core Features

### Passenger Safety

- Consent-based journey monitoring
- Night Safety Mode
- Journey information
- Vehicle and driver information
- Emergency support workflow

### AI Risk Monitoring

- AI-assisted risk scoring
- Risk levels:
  - Low
  - Medium
  - High
  - Critical
- Speed-based risk analysis
- Night journey risk factor
- Route deviation risk factor
- Risk-factor explanation

### Police Dashboard

- Active journey monitoring
- Live vehicle information
- Risk level display
- Emergency Column
- Journey history
- Emergency details
- Officer action controls

### Emergency Response

Authorized officers can perform:

- STOP
- START
- DISPATCH PATROL
- RESOLVE

### IoT Vehicle Prototype

The physical prototype demonstrates the connection between the centralized system and a vehicle controller.

The prototype uses:

- ESP32
- L298N motor driver
- DC motors
- Active buzzer
- ISD1820 voice playback module

The ESP32 receives vehicle control commands and controls the physical vehicle prototype.

---

## 4. AI Risk Detection

AI-COP uses an AI-based risk analysis module to generate a journey risk score.

The system considers journey signals such as:

- Vehicle speed
- Night journey condition
- Route deviation

The resulting score is converted into a risk level.

| Risk Score | Risk Level |
|------------|------------|
| 0 – 3 | Low |
| >3 – 5 | Medium |
| >5 – 7 | High |
| >7 – 10 | Critical |

The risk information is displayed to authorized police personnel through the monitoring dashboard.

### Human-in-the-Loop

AI-COP does not give autonomous authority to the AI model.

The AI provides risk information and decision support.

The authorized officer reviews the situation and decides whether intervention is required.

---

## 5. Emergency Workflow

The emergency workflow follows this sequence:

```text
Passenger Journey
       ↓
Journey Monitoring
       ↓
AI Risk Analysis
       ↓
Risk Score / Risk Level
       ↓
Risk Threshold Reached
       ↓
Emergency Column
       ↓
Police Officer Review
       ↓
┌───────────────┬──────────────────┬─────────────────┐
│ STOP          │ DISPATCH PATROL  │ RESOLVE         │
└───────────────┴──────────────────┴─────────────────┘
       ↓
IoT Vehicle Command
       ↓
Physical Vehicle Prototype

6. STOP / START IoT Workflow

When an authorized police officer selects STOP:

Police Dashboard
       ↓
FastAPI Backend
       ↓
IoT Controller
       ↓
ESP32
       ↓
L298N Motor Driver
       ↓
Vehicle Motors

The physical prototype demonstrates the STOP mechanism.

The prototype can also receive a START command after a STOP event.

The current software includes an IoT controller interface that can operate in test mode while the physical prototype is being integrated.

7. Physical Prototype

The physical vehicle prototype is built using:

Component	Purpose
ESP32	Main IoT controller
L298N	Motor driver
DC Motors	Vehicle movement
Active Buzzer	Warning indication
ISD1820	Voice warning / playback
Battery	Vehicle power supply

The prototype is used to demonstrate how an authorized intervention command can be transmitted from the centralized system to a physical vehicle controller.

8. Privacy and Consent

AI-COP follows a consent-based monitoring approach.

The passenger must authorize the relevant safety monitoring functionality before the system uses journey information for safety monitoring.

The system is designed around:

User consent
Purpose-limited monitoring
Privacy-aware architecture
Authorized access
Human oversight
Controlled emergency intervention

The AI system is intended to support authorized personnel rather than replace human decision-making.

9. System Architecture
                    AI-COP SYSTEM
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
     Passenger       Driver /       Police
       App           Transport      Dashboard
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                  FastAPI Backend
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
      Database      AI Risk Engine   Emergency
                                      Management
                                          │
                                          ▼
                                    IoT Controller
                                          │
                                          ▼
                                        ESP32
                                          │
                                          ▼
                                       L298N
                                          │
                                          ▼
                                  Physical Vehicle
10. Technology Stack
Frontend
React.js
Vite
Tailwind CSS
React Router
Axios
Leaflet / React-Leaflet
Framer Motion
Backend
Python
FastAPI
SQLAlchemy
SQLite
Uvicorn
Artificial Intelligence
Python
NumPy
RNN/LSTM-style risk analysis components
IoT
ESP32
L298N Motor Driver
DC Motors
Active Buzzer
ISD1820
11. Project Structure
AI-COP/
│
├── .gitignore
├── README.md
│
├── backend/
│   ├── crud.py
│   ├── database.py
│   ├── generate_training_data.py
│   ├── iot_controller.py
│   ├── main.py
│   ├── models.py
│   ├── pyrefly.toml
│   ├── qr_generator.py
│   ├── requirements.txt
│   ├── rnn_models.py
│   ├── schemas.py
│   └── train_models.py
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── admin/
    │   ├── booking/
    │   ├── components/
    │   ├── pages/
    │   ├── store/
    │   └── utils/
    ├── package.json
    ├── package-lock.json
    ├── tailwind.config.js
    └── vite.config.js
12. Backend Setup

Navigate to the backend:

cd backend

Create a Python virtual environment:

python -m venv venv

Activate it on Windows:

venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

Start the FastAPI server:

uvicorn main:app --reload

The API documentation can then be accessed through the FastAPI Swagger interface.

13. Frontend Setup

Navigate to the frontend:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

The Vite development server will provide the local frontend URL in the terminal.

14. Backend API

The backend provides APIs for functionality including:

Dashboard statistics
Active journeys
Journey history
Vehicle information
Emergency events
Emergency actions
AI risk analysis
Booking and journey management

FastAPI provides interactive API documentation through Swagger/OpenAPI.

15. Emergency Officer Actions
STOP

Requests the vehicle to stop.

Police Dashboard
       ↓
Backend
       ↓
IoT Controller
       ↓
ESP32
       ↓
Vehicle Stop
START

Releases a previously stopped vehicle through the IoT control workflow.

DISPATCH PATROL

Records that an authorized officer has requested patrol intervention.

RESOLVE

Marks the emergency event as resolved and records the resolution time.

16. Journey Monitoring

AI-COP maintains active journey monitoring information including:

Passenger
Vehicle
Driver
Origin
Destination
Journey status
Risk score
Risk level
Location information
Journey start/end information

Completed journey information can be accessed through the journey history interface.

17. Current Implementation

The current software implementation includes:

React-based police dashboard
Admin dashboard
Booking workflow
Journey monitoring
Live map interface
Risk visualization
Emergency Column
Emergency action workflow
Journey history
FastAPI backend
SQLite database
AI risk analysis
IoT controller interface
ESP32-based physical vehicle prototype

The physical IoT integration is being demonstrated progressively using the prototype hardware.

18. Future Scope

Potential future development includes:

Advanced LSTM-based risk prediction
Additional behavioural risk signals
Improved route anomaly detection
Real-time communication using WebSockets
Production-grade cloud deployment
Secure authentication and authorization
Integration with transport and emergency-response systems
Advanced privacy-preserving analytics
Larger real-world datasets
Improved IoT vehicle control
Scalable multi-vehicle deployment
19. Project Objective

The objective of AI-COP is to provide an integrated safety monitoring and response platform that connects:

Passenger
   ↓
Journey Monitoring
   ↓
AI Risk Analysis
   ↓
Human Verification
   ↓
Emergency Response
   ↓
IoT Vehicle Intervention

The system combines artificial intelligence, web/mobile technology, backend services and IoT to support safer night-time public transportation.

20. Team

Project: AI-COP
Full Form: Artificial Intelligence – Centralized Observation & Protection

Developed as an AI-assisted public transportation safety solution for women passengers.