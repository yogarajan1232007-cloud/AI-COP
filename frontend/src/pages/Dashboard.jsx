import { useState, useEffect, useRef } from "react";
import LiveMap from "../components/LiveMap";
import AlertPanel from "../components/AlertPanel";
import API, {
  getDashboardStats,
  getJourneys,
  getActiveEmergencies,
  takeEmergencyAction
} from "../api";
import { getVehicles } from "../store/vehicleStore";

import {
  Shield,
  Bell,
  Radio,
  Car,
  Truck,
  Bike,
  AlertTriangle,
  Siren,
  User,
  MapPin,
  Target,
  Eye,
  Phone,
  Clock,
  Calendar,
  X,
  Activity
} from "lucide-react";

export default function Dashboard() {
  

const [tab,setTab] = useState("active");
const [stats,setStats] = useState({});
const [journeys,setJourneys] = useState([]);
const [history,setHistory] = useState([]);
const [selectedJourney,setSelectedJourney] = useState(null);
const [popup,setPopup] = useState(null);
const [alerts,setAlerts] = useState([]);
const [emergencies, setEmergencies] = useState([]);
const [actionLoading, setActionLoading] = useState(null);

const completedJourneys = useRef(new Set());

/* -----------------------------------
   LIVE DASHBOARD DATA REFRESH
   -----------------------------------

   Active journeys come ONLY from:
   /api/journeys/active

   Pending bookings are NOT converted into
   Police Dashboard journeys.
----------------------------------- */

useEffect(() => {

  let isMounted = true;

  const refreshDashboard = async () => {

    try {

      // --------------------------------
      // ACTIVE MONITORED JOURNEYS
      // --------------------------------

      const journeyRes =
        await getJourneys();

      if (isMounted) {

        const activeJourneys =
          (journeyRes.data || []).map((j) => ({

            id: `journey-${j.booking_id}`,

            monitoring_id:
              j.monitoring_id,

            booking_id:
              j.booking_id,

            vehicle_id:
              j.vehicle_id,

            passenger_name:
              j.passenger_name ||
              `Passenger ${j.booking_id}`,

            origin:
              j.origin || "Unknown",

            destination:
              j.destination || "Unknown",

            vehicle_type:
              j.vehicle_type || "CAB",

            driver_name:
              j.driver_name ||
              "Driver Pending",

            driver_phone:
              j.driver_phone || "",

            gender:
              j.gender || "Unknown",

            age:
              j.age,

            phone_no:
              j.phone_no || "",

            risk_score:
              j.risk_score || 0,

            risk_level:
              j.risk_level || "Low",

            status:
              j.status || "IN_TRANSIT",

            progress: (() => {
      const vehicles = getVehicles();

      const vehicle = vehicles.find(
        v => String(v.id) === String(j.booking_id)
     );

  return Number(vehicle?.journeyProgress ?? 0);
})(),

            start_time:
              j.started_at ||
              new Date().toISOString()

          }));

        setJourneys(activeJourneys);
      }

      // --------------------------------
      // EMERGENCIES
      // --------------------------------

      const emergencyRes =
        await getActiveEmergencies();

      if (isMounted) {

        setEmergencies(
          emergencyRes.data || []
        );
      }

      // --------------------------------
// DASHBOARD STATS
// --------------------------------

const statsRes =
  await getDashboardStats();

if (isMounted) {

  setStats(
    statsRes.data || {}
  );
}

// --------------------------------
// JOURNEY HISTORY
// --------------------------------

const historyRes =
  await API.get("/api/journey/history");

if (isMounted) {

  setHistory(
    historyRes.data || []
  );
}

    }
    catch (err) {

      console.error(
        "Dashboard refresh error:",
        err
      );

    }

  };

  // Initial load
  refreshDashboard();

  // Refresh every 5 seconds
  const timer =
    setInterval(
      refreshDashboard,
      5000
    );

  return () => {

    isMounted = false;

    clearInterval(timer);

  };

}, []);

/* -----------------------------------
AUTO REFRESH BOOKINGS
----------------------------------- */

useEffect(()=>{

  const timer=setInterval(async()=>{

    try{

      // Refresh bookings
      const bookingRes=await API.get("/bookings");

      const bookingJourneys = bookingRes.data.map(b => ({
        id: `booking-${b.booking_id || b.id}`,
        booking_id: b.booking_id || b.id,
        vehicle_id: b.id,
        passenger_name: b.passenger_name,

        origin: b.boarding_point,
        destination: b.destination_point,

        vehicle_type: "CAB",
        driver_name: "Driver Pending",
        driver_phone: b.phone_no || "",
        progress: 0,
        start_time: new Date().toISOString()
      }));

      // Refresh emergencies
      const emergencyRes =
        await getActiveEmergencies();

      setEmergencies(
        emergencyRes.data
      );

      // Refresh dashboard statistics
      const statsRes =
        await getDashboardStats();

      setStats(
        statsRes.data
      );

    }catch(err){

      console.log(
        "Dashboard refresh error:",
        err
      );

    }

  },5000);


  return()=>{
    clearInterval(timer);
  };

},[]);

/* -----------------------------------
SYNC VEHICLE MOVEMENT
----------------------------------- */

/* -----------------------------------
   SYNC VEHICLE PROGRESS
   ----------------------------------- */

useEffect(() => {

  const timer = setInterval(() => {

    const vehicles = [...getVehicles()];

    if (!vehicles || vehicles.length === 0) return;

    setJourneys(prevJourneys => {

      return prevJourneys.map(j => {

        const vehicle = vehicles.find(
          v => String(v.id) === String(j.booking_id)
        );

        if (!vehicle) {
          return j;
        }

        const progress = Number(
          vehicle.journeyProgress ?? j.progress ?? 0
        );

        return {
          ...j,
          progress: Math.min(100, Math.max(0, progress))
        };

      });

    });

  }, 1000);

  return () => clearInterval(timer);

}, []);


/* -----------------------------------
UI FUNCTIONS
----------------------------------- */

function openMap(j){

setSelectedJourney(j);
setTab("map");

}

function openDriver(j){

setPopup(j);

}

function closePopup(){

setPopup(null);

}
async function handleEmergencyAction(emergencyId, action){

  try{

    setActionLoading(`${emergencyId}-${action}`);

    await takeEmergencyAction(
      emergencyId,
      action
    );

    const emergencyRes =
      await getActiveEmergencies();

    setEmergencies(emergencyRes.data);

    const statsRes =
      await getDashboardStats();

    setStats(statsRes.data);

  }
  catch(err){

    console.error(
      "Emergency action error:",
      err
    );

    alert(
      "Failed to perform emergency action."
    );

  }
  finally{

    setActionLoading(null);

  }

}


/* -----------------------------------
RENDER
----------------------------------- */

return (

<div style={styles.container}>

<style>{keyframes}</style>

<header style={styles.header}>

<div style={styles.headerLeft}>

<div style={styles.logoContainer}>
<Shield size={28} strokeWidth={2.5} color="#0ea5e9"/>
</div>

<div>
<h2 style={styles.headerTitle}>AI-COP</h2>
<p style={styles.headerSubtitle}>
Real-Time Police Monitoring System
</p>
</div>

</div>

<div style={styles.headerRight}>

<div style={styles.notificationBell}>
<Bell size={20} color="#64748b"/>
</div>

<div style={styles.liveIndicator}>
<div style={styles.liveDot}/>
<span style={styles.liveText}>LIVE</span>
</div>

</div>

</header>

<div style={styles.content}>

{/* ---------------- STATS ---------------- */}

<div style={styles.statsGrid}>

<StatCard
icon={<Radio size={24}/>}
title="Active Journeys"
value={stats.active_journeys || 0}
color="#0ea5e9"
/>

<StatCard
icon={<Truck size={24}/>}
title="Autos"
value={stats.autos || 0}
color="#06b6d4"
/>

<StatCard
icon={<Car size={24}/>}
title="Cabs"
value={stats.cabs || 0}
color="#14b8a6"
/>

<StatCard
icon={<Bike size={24}/>}
title="Bikes"
value={stats.bikes || 0}
color="#10b981"
/>

<StatCard
icon={<AlertTriangle size={24}/>}
title="High Risk"
value={stats.high_risk || 0}
color="#f59e0b"
alert
/>

<StatCard
icon={<Siren size={24}/>}
title="Emergencies"
value={stats.emergencies || 0}
color="#ef4444"
alert
/>

</div>

{/* ---------------- TABS ---------------- */}

<div style={styles.tabsContainer}>

<TabButton
label="Active Journeys"
active={tab==="active"}
onClick={()=>setTab("active")}
icon={<Activity size={16}/>}
/>

<TabButton
label="Live Map"
active={tab==="map"}
onClick={()=>setTab("map")}
icon={<MapPin size={16}/>}
/>

<TabButton
label="Emergencies"
active={tab==="alerts"}
onClick={()=>setTab("alerts")}
icon={<AlertTriangle size={16}/>}
/>

<TabButton
label="History"
active={tab==="history"}
onClick={()=>setTab("history")}
icon={<Clock size={16}/>}
/>

</div>


{/* ---------------- ACTIVE JOURNEYS ---------------- */}

{tab==="active" && (

<div style={styles.panel}>

<h3 style={styles.panelTitle}>
Real-Time Journey Monitoring
</h3>

{journeys.map((j,index)=>(
<JourneyCard
key={j.id}
journey={j}
onViewMap={()=>openMap(j)}
onContactDriver={()=>openDriver(j)}
delay={index*0.1}
/>
))}

</div>

)}

{/* ---------------- MAP ---------------- */}

<div
  style={{
    position: tab === "map" ? "relative" : "absolute",
    left: tab === "map" ? "0" : "-10000px",
    top: tab === "map" ? "0" : "0",
    width: "100%",
    height: "520px",
    visibility: tab === "map" ? "visible" : "hidden",
    pointerEvents: tab === "map" ? "auto" : "none"
  }}
>
  <LiveMap journey={selectedJourney} />
</div>

{/* ---------------- EMERGENCIES ---------------- */}

{tab==="alerts" && (
  <EmergencyPanel
    emergencies={emergencies}
    actionLoading={actionLoading}
    onAction={handleEmergencyAction}
  />
)}
{tab==="history" && (

<div style={styles.panel}>

<h3 style={styles.panelTitle}>
Completed Journeys
</h3>

{history.length === 0 && (

<div style={styles.emptyState}>
<Calendar size={48}/>
<p style={styles.emptyText}>
No completed journeys yet
</p>
</div>

)}

{history.map((h,index)=>(

<HistoryCard
key={index}
history={h}
delay={index*0.1}
/>

))}

</div>

)}

</div>


{/* ---------------- DRIVER POPUP ---------------- */}

{popup && (

<>
<div style={styles.overlay} onClick={closePopup}/>

<div style={styles.popup}>

<div style={styles.popupHeader}>

<h4 style={styles.popupTitle}>
Driver Contact
</h4>

<button style={styles.closeButton} onClick={closePopup}>
<X size={20}/>
</button>

</div>

<div style={styles.popupContent}>

<div style={styles.popupAvatar}>
<User size={32} color="#fff"/>
</div>

<div style={styles.popupInfo}>
<p style={styles.popupLabel}>Passenger</p>
<p style={styles.popupValue}>{popup.passenger_name}</p>
</div>

<div style={styles.popupInfo}>
<p style={styles.popupLabel}>Driver</p>
<p style={styles.popupValue}>{popup.driver_name}</p>
</div>

<div style={styles.popupInfo}>
<p style={styles.popupLabel}>Phone</p>
<p style={styles.popupValue}>{popup.driver_phone}</p>
</div>

<div style={styles.popupRoute}>
<MapPin size={16}/>
<span>{popup.origin}</span>
<span>→</span>
<Target size={16}/>
<span>{popup.destination}</span>
</div>

<a href={`tel:${popup.driver_phone}`} style={styles.callButton}>
<Phone size={18}/>
<span>Call Driver</span>
</a>

</div>

</div>

</>

)}

</div>

);

}
function StatCard({ icon, title, value, color, alert, delay }) {

return (

<div
style={{
...styles.statCard,
borderLeft:`4px solid ${color}`,
animation:`fadeInUp 0.6s ease-out ${delay || 0}s both`
}}
>

<div style={styles.statIconContainer}>

<div
style={{
...styles.statIcon,
background:`${color}15`,
color
}}
>

{icon}

</div>

</div>

<div style={styles.statContent}>

<p style={styles.statTitle}>{title}</p>

<h2 style={styles.statValue}>{value}</h2>

</div>

{alert && value > 0 && <div style={styles.alertPulse}/>}

</div>

);

}



function TabButton({ label, active, onClick, icon }) {

return (

<button
onClick={onClick}
style={{
...styles.tabButton,
...(active ? styles.tabButtonActive : {})
}}
>

{icon}

<span>{label}</span>

</button>

);

}



function JourneyCard({ journey, onViewMap, onContactDriver, delay }) {

const progress = journey.progress || 0;

return (

<div
style={{
...styles.journeyCard,
animation:`fadeInUp 0.6s ease-out ${delay}s both`
}}
>

<div style={styles.journeyHeader}>

<div style={styles.journeyUser}>

<div style={styles.avatarCircle}>
<User size={20} color="#0ea5e9"/>
</div>

<div>

<p style={styles.passengerName}>
{journey.passenger_name}
</p>

<p style={styles.vehicleType}>
<Car size={14}/>
{journey.vehicle_type}
</p>

</div>

</div>

<div
  style={{
    ...styles.riskBadge,
    background:
      journey.risk_level === "Critical"
        ? "#fee2e2"
        : journey.risk_level === "High"
        ? "#fee2e2"
        : journey.risk_level === "Medium"
        ? "#fef3c7"
        : "#d1fae5",
    color:
      journey.risk_level === "Critical"
        ? "#991b1b"
        : journey.risk_level === "High"
        ? "#b91c1c"
        : journey.risk_level === "Medium"
        ? "#92400e"
        : "#065f46"
  }}
>

  <div
    style={{
      ...styles.riskDot,
      background:
        journey.risk_level === "Critical"
          ? "#dc2626"
          : journey.risk_level === "High"
          ? "#ef4444"
          : journey.risk_level === "Medium"
          ? "#f59e0b"
          : "#10b981"
    }}
  />

  {journey.risk_level || "Low"} Risk

</div>

</div>



<div style={styles.progressContainer}>

<div style={styles.progressBar}>

<div
style={{
...styles.progressFill,
width:`${progress}%`
}}
/>

</div>

<p style={styles.progressText}>
  {Math.round(progress)}% Complete
</p>

</div>



<div style={styles.journeyDetails}>

<div style={styles.detailItem}>

<MapPin size={16}/>

<div>

<p style={styles.detailLabel}>From</p>

<p style={styles.detailValue}>
{journey.origin}
</p>

</div>

</div>



<div style={styles.detailItem}>

<Target size={16}/>

<div>

<p style={styles.detailLabel}>To</p>

<p style={styles.detailValue}>
{journey.destination}
</p>

</div>

</div>



<div style={styles.detailItem}>

<User size={16}/>

<div>

<p style={styles.detailLabel}>Driver</p>

<p style={styles.detailValue}>
{journey.driver_name}
</p>

</div>

</div>

</div>



<div style={styles.journeyActions}>

<button
style={styles.actionButton}
onClick={onViewMap}
>

<Eye size={18}/>
<span>View on Map</span>

</button>

<button
style={styles.actionButton}
onClick={onContactDriver}
>

<Phone size={18}/>
<span>Contact Driver</span>

</button>

</div>

</div>

);

}


function EmergencyPanel({
  emergencies,
  actionLoading,
  onAction
}) {

  return (

    <div style={styles.panel}>

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px"
        }}
      >

        <div>

          <h3 style={styles.panelTitle}>
            🚨 Emergency Column
          </h3>

          <p
            style={{
              margin: "-16px 0 0 0",
              color: "#64748b",
              fontSize: "13px"
            }}
          >
            High-risk situations requiring officer attention
          </p>

        </div>

        <div
          style={{
            background: "#fee2e2",
            color: "#b91c1c",
            padding: "8px 14px",
            borderRadius: "20px",
            fontWeight: "700",
            fontSize: "13px"
          }}
        >
          {emergencies.length} Active
        </div>

      </div>


      {/* NO EMERGENCIES */}

      {emergencies.length === 0 && (

        <div style={styles.emptyState}>

          <Siren
            size={48}
            color="#10b981"
          />

          <p style={styles.emptyText}>
            No active emergencies
          </p>

        </div>

      )}


      {/* EMERGENCY CARDS */}

      {emergencies.map((emergency) => {

        const isCritical =
          emergency.risk_level === "Critical";

        const stopped =
          emergency.vehicle_stopped === 1;

        const patrolDispatched =
          emergency.patrol_dispatched === 1;

        return (

          <div
            key={emergency.emergency_id}
            style={{
              border: `1px solid ${
                isCritical
                  ? "#fecaca"
                  : "#fed7aa"
              }`,
              borderLeft: `5px solid ${
                isCritical
                  ? "#dc2626"
                  : "#f97316"
              }`,
              borderRadius: "16px",
              padding: "24px",
              marginBottom: "16px",
              background: isCritical
                ? "#fff7f7"
                : "#fffaf5"
            }}
          >

            {/* TOP */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "20px",
                flexWrap: "wrap"
              }}
            >

              <div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "12px"
                  }}
                >

                  <span
                    style={{
                      background: isCritical
                        ? "#dc2626"
                        : "#f97316",
                      color: "white",
                      padding: "5px 12px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: "700"
                    }}
                  >
                    {emergency.risk_level}
                  </span>

                  <span
                    style={{
                      color: "#64748b",
                      fontSize: "12px"
                    }}
                  >
                    Emergency #{emergency.emergency_id}
                  </span>

                </div>


                <h4
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    color: "#0f172a"
                  }}
                >
                  {emergency.passenger_name ||
                    "Unknown Passenger"}
                </h4>

              </div>


              {/* RISK SCORE */}

              <div
                style={{
                  textAlign: "center",
                  background: "#fee2e2",
                  padding: "10px 18px",
                  borderRadius: "12px"
                }}
              >

                <div
                  style={{
                    fontSize: "11px",
                    color: "#991b1b",
                    fontWeight: "600"
                  }}
                >
                  RISK SCORE
                </div>

                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "800",
                    color: "#dc2626"
                  }}
                >
                  {emergency.risk_score}
                </div>

              </div>

            </div>


            {/* DETAILS */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginTop: "20px"
              }}
            >

              <EmergencyDetail
                label="Booking ID"
                value={emergency.booking_id}
              />

              <EmergencyDetail
                label="Vehicle ID"
                value={
                  emergency.vehicle_id ?? "N/A"
                }
              />

              <EmergencyDetail
                label="Reason"
                value={
                  emergency.reason ||
                  "Risk detected"
                }
              />

              <EmergencyDetail
                label="Officer Action"
                value={
                  emergency.officer_action ||
                  "None"
                }
              />

            </div>


            {/* STATUS */}

            {(stopped || patrolDispatched) && (

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginTop: "18px"
                }}
              >

                {stopped && (

                  <span
                    style={{
                      background: "#fee2e2",
                      color: "#b91c1c",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "700"
                    }}
                  >
                    🛑 Vehicle Stop Requested
                  </span>

                )}

                {patrolDispatched && (

                  <span
                    style={{
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "700"
                    }}
                  >
                    🚓 Patrol Dispatched
                  </span>

                )}

              </div>

            )}


            {/* ACTION BUTTONS */}

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "20px",
                paddingTop: "18px",
                borderTop: "1px solid #e2e8f0"
              }}
            >

              {emergency.stop_requested === 1 ? (
  <button
    onClick={() =>
      onAction(
        emergency.emergency_id,
        "START"
      )
    }
    disabled={
      actionLoading !== null
    }
    style={{
      ...styles.emergencyButton,
      background: "#16a34a"
    }}
  >
    {actionLoading ===
    `${emergency.emergency_id}-START`
      ? "Starting..."
      : "▶️ START Vehicle"}
  </button>
) : (
  <button
    onClick={() =>
      onAction(
        emergency.emergency_id,
        "STOP"
      )
    }
    disabled={
      actionLoading !== null
    }
    style={{
      ...styles.emergencyButton,
      background: "#dc2626"
    }}
  >
    {actionLoading ===
    `${emergency.emergency_id}-STOP`
      ? "Stopping..."
      : "🛑 STOP Vehicle"}
  </button>
)}


              <button
                onClick={() =>
                  onAction(
                    emergency.emergency_id,
                    "DISPATCH_PATROL"
                  )
                }
                disabled={
                  actionLoading !== null ||
                  emergency.patrol_dispatched === 1
                }
                style={{
                  ...styles.emergencyButton,
                  background:
                    emergency.patrol_dispatched === 1
                      ? "#94a3b8"
                      : "#2563eb"
                }}
              >

                {actionLoading ===
                `${emergency.emergency_id}-DISPATCH_PATROL`
                  ? "Dispatching..."
                  : emergency.patrol_dispatched === 1
                  ? "🚓 Patrol Dispatched"
                  : "🚓 Dispatch Patrol"}

              </button>


              <button
                onClick={() =>
                  onAction(
                    emergency.emergency_id,
                    "RESOLVE"
                  )
                }
                disabled={
                  actionLoading !== null
                }
                style={{
                  ...styles.emergencyButton,
                  background: "#16a34a"
                }}
              >

                {actionLoading ===
                `${emergency.emergency_id}-RESOLVE`
                  ? "Resolving..."
                  : "✅ Resolve"}

              </button>

            </div>

          </div>

        );

      })}

    </div>

  );
}
function EmergencyDetail({ label, value }) {

  return (

    <div
      style={{
        background: "#f8fafc",
        padding: "12px",
        borderRadius: "10px"
      }}
    >

      <p
        style={{
          margin: 0,
          color: "#94a3b8",
          fontSize: "11px",
          fontWeight: "700",
          textTransform: "uppercase"
        }}
      >
        {label}
      </p>

      <p
        style={{
          margin: "5px 0 0 0",
          color: "#0f172a",
          fontSize: "13px",
          fontWeight: "600"
        }}
      >
        {value}
      </p>

    </div>

  );

}
function HistoryCard({ history, delay }) {

return (

<div
style={{
...styles.historyCard,
animation:`fadeInUp 0.6s ease-out ${delay}s both`
}}
>

<div style={styles.historyHeader}>

<div style={styles.historyUser}>

<div style={styles.avatarCircleSmall}>
<User size={18}/>
</div>

<p style={styles.historyName}>
{history.passenger_name}
</p>

</div>

<div style={styles.completedBadge}>
Completed
</div>

</div>



<div style={styles.historyRoute}>

<MapPin size={16}/>

<span style={styles.historyText}>
{history.origin}
</span>

<span style={styles.historyArrow}>→</span>

<Target size={16}/>

<span style={styles.historyText}>
{history.destination}
</span>

</div>



<div style={styles.historyInfo}>

<div style={styles.historyInfoItem}>

<User size={14}/>

<span>
Driver: {history.driver_name}
</span>

</div>

<div style={styles.historyInfoItem}>

<Clock size={14}/>

<span>
Duration: {history.duration_minutes} mins
</span>

</div>

</div>

</div>

);

}
const keyframes = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

const styles = {
  container: {
    background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },

  header: {
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    padding: "20px 40px",
    borderBottom: "1px solid rgba(226, 232, 240, 0.8)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px"
  },

  logoContainer: {
    width: "52px",
    height: "52px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)"
  },

  headerTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.5px"
  },

  headerSubtitle: {
    margin: "4px 0 0 0",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: "500"
  },

  headerRight: {
    display: "flex",
    gap: "20px",
    alignItems: "center"
  },

  notificationBell: {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.3s ease",
    border: "1px solid #e2e8f0"
  },

  liveIndicator: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    padding: "10px 20px",
    borderRadius: "25px",
    fontWeight: "700",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
  },

  liveDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "white",
    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
  },

  liveText: {
    letterSpacing: "1px"
  },

  content: {
    padding: "40px",
    maxWidth: "1400px",
    margin: "0 auto"
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "20px",
    marginBottom: "32px"
  },

  statCard: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    position: "relative",
    overflow: "hidden",
    transition: "all 0.3s ease",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    border: "1px solid rgba(226, 232, 240, 0.8)"
  },

  statIconContainer: {
    position: "relative"
  },

  statIcon: {
    width: "56px",
    height: "56px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  statContent: {
    flex: 1
  },

  statTitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },

  statValue: {
    margin: "8px 0 0 0",
    fontSize: "32px",
    fontWeight: "700",
    color: "#0f172a"
  },

  alertPulse: {
    position: "absolute",
    top: "12px",
    right: "12px",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#ef4444",
    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
  },

  tabsContainer: {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(10px)",
    padding: "8px",
    borderRadius: "16px",
    display: "inline-flex",
    marginBottom: "32px",
    gap: "4px",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
  },

  tabButton: {
    padding: "12px 24px",
    borderRadius: "12px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    color: "#64748b",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },

  tabButtonActive: {
    background: "white",
    color: "#0ea5e9",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)"
  },

  panel: {
    background: "white",
    padding: "32px",
    borderRadius: "20px",
    animation: "scaleIn 0.5s ease-out",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    border: "1px solid rgba(226, 232, 240, 0.8)"
  },

  panelTitle: {
    margin: "0 0 24px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a"
  },

  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px"
  },

  emptyText: {
    color: "#94a3b8",
    fontSize: "16px",
    margin: 0
  },

  journeyCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "24px",
    marginTop: "16px",
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    transition: "all 0.3s ease"
  },

  journeyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },

  journeyUser: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },

  avatarCircle: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  passengerName: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
    color: "#0f172a"
  },

  vehicleType: {
    margin: "4px 0 0 0",
    color: "#64748b",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },

  riskBadge: {
    background: "#d1fae5",
    color: "#065f46",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },

  riskDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#10b981"
  },

  progressContainer: {
    marginBottom: "20px"
  },

  progressBar: {
    height: "8px",
    background: "#e2e8f0",
    borderRadius: "10px",
    overflow: "hidden",
    position: "relative"
  },

  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #0ea5e9 0%, #06b6d4 100%)",
    borderRadius: "10px",
    transition:"width .5s linear",
    boxShadow: "0 0 10px rgba(14, 165, 233, 0.5)"
  },

  progressText: {
    margin: "8px 0 0 0",
    fontSize: "13px",
    fontWeight: "600",
    color: "#64748b"
  },

  journeyDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "20px",
    marginBottom: "20px"
  },

  detailItem: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start"
  },

  detailLabel: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },

  detailValue: {
    margin: "4px 0 0 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a"
  },

  journeyActions: {
    display: "flex",
    gap: "12px",
    paddingTop: "16px",
    borderTop: "1px solid #e2e8f0"
  },

  actionButton: {
    flex: 1,
    padding: "12px 20px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    background: "white",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.3s ease"
  },

  historyCard: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px",
    marginTop: "16px",
    background: "white",
    transition: "all 0.3s ease"
  },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },

  historyUser: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  avatarCircleSmall: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    background: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  historyName: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a"
  },

  completedBadge: {
    background: "#e0e7ff",
    color: "#3730a3",
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600"
  },

  historyRoute: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px",
    background: "#f8fafc",
    borderRadius: "10px",
    marginBottom: "12px"
  },

  historyText: {
    fontSize: "13px",
    color: "#0f172a",
    fontWeight: "500"
  },

  historyArrow: {
    color: "#cbd5e1",
    margin: "0 4px"
  },

  historyInfo: {
    display: "flex",
    gap: "20px",
    marginBottom: "12px"
  },

  historyInfoItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#64748b"
  },

  historyTimestamps: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9"
  },

  timestamp: {
    margin: 0,
    fontSize: "12px",
    color: "#94a3b8"
  },

  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(4px)",
    animation: "fadeIn 0.3s ease-out",
    zIndex: 200
  },

  popup: {
    position: "fixed",
    bottom: "40px",
    right: "40px",
    background: "white",
    borderRadius: "20px",
    width: "340px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    animation: "slideIn 0.4s ease-out",
    zIndex: 300,
    border: "1px solid #e2e8f0"
  },

  popupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0"
  },

  popupTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "700",
    color: "#0f172a"
  },

  closeButton: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    background: "#f8fafc",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    transition: "all 0.2s ease"
  },

  popupContent: {
    padding: "24px"
  },

  popupAvatar: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px auto",
    boxShadow: "0 8px 16px rgba(14, 165, 233, 0.3)"
  },

  popupInfo: {
    marginBottom: "16px"
  },

  popupLabel: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },

  popupValue: {
    margin: "6px 0 0 0",
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f172a"
  },

  popupRoute: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "14px",
    background: "#f8fafc",
    borderRadius: "12px",
    marginTop: "16px",
    marginBottom: "20px"
  },

  routeText: {
    fontSize: "13px",
    color: "#0f172a",
    fontWeight: "500"
  },

  routeArrow: {
    color: "#cbd5e1",
    margin: "0 4px"
  },
  emergencyButton: {
    border: "none",
    color: "white",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "13px",
    transition: "all 0.2s ease"
  },
  callButton: {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
  }
};

