import API from "../api";
import { useState } from "react";

export default function ConfirmStep({ booking, prevStep }) {

const [success,setSuccess] = useState(false);
const [loading,setLoading] = useState(false);
const [riskData,setRiskData] = useState(null);
const [etaData,setEtaData] = useState(null);

async function confirmBooking(){

if(!booking.vehicle_id){
alert("Vehicle not selected");
return;
}

setLoading(true);

try{

const res = await API.post(
  "/bookings/create",
  {
    passenger_name: booking.passenger_name,
    gender: booking.gender,
    age: booking.age,
    phone_no: booking.phone_no,
    boarding_point: booking.boarding_point,
    destination_point: booking.destination_point,
    vehicle_id: booking.vehicle_id
  }
);

if(res.data.status === "success"){

setSuccess(true);

// Fetch RNN predictions after booking
try {
  const riskRes = await API.post("/api/rnn/risk", {
    hour: new Date().getHours(),
    day_of_week: new Date().getDay(),
    gender: booking.gender,
    zone: booking.boarding_point,
    speed: 40,
    is_night: new Date().getHours() >= 21 || new Date().getHours() <= 5
  });
  setRiskData(riskRes.data);
} catch(e) { console.log("Risk API not available yet"); }

try {
  const etaRes = await API.post("/api/rnn/eta", {
    distance_km: parseFloat(booking.distance) || 10,
    hour: new Date().getHours(),
    day_of_week: new Date().getDay(),
    zone: booking.boarding_point
  });
  setEtaData(etaRes.data);
} catch(e) { console.log("ETA API not available yet"); }

}

}catch(error){

console.error(error);
alert("Booking failed");

} finally {
setLoading(false);
}

}

function getRiskColor(level) {
  if (!level) return "#10b981";
  const colors = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444", Critical: "#dc2626" };
  return colors[level] || "#10b981";
}

return(

<div style={styles.card}>

<h2 style={styles.heading}>✅ Confirm Your Ride</h2>

<div style={styles.detailsGrid}>

<div style={styles.detailRow}>
<span style={styles.label}>📍 Pickup</span>
<span style={styles.value}>{booking.boarding_point}</span>
</div>

<div style={styles.detailRow}>
<span style={styles.label}>🏁 Drop</span>
<span style={styles.value}>{booking.destination_point}</span>
</div>

<div style={styles.detailRow}>
<span style={styles.label}>👤 Passenger</span>
<span style={styles.value}>{booking.passenger_name}</span>
</div>

<div style={styles.detailRow}>
<span style={styles.label}>⚥ Gender</span>
<span style={styles.value}>{booking.gender}</span>
</div>

<div style={styles.detailRow}>
<span style={styles.label}>🎂 Age</span>
<span style={styles.value}>{booking.age}</span>
</div>

<div style={styles.detailRow}>
<span style={styles.label}>📞 Phone</span>
<span style={styles.value}>{booking.phone_no}</span>
</div>

<div style={styles.detailRow}>
<span style={styles.label}>🚗 Vehicle</span>
<span style={styles.value}>{booking.vehicle || "Selected"}</span>
</div>

{booking.distance && (
<div style={styles.detailRow}>
<span style={styles.label}>📏 Distance</span>
<span style={styles.value}>{booking.distance} km</span>
</div>
)}

{booking.fare && (
<div style={styles.detailRow}>
<span style={styles.label}>💰 Fare</span>
<span style={styles.value}>₹ {booking.fare}</span>
</div>
)}

</div>

<div style={styles.buttons}>

<button onClick={prevStep} style={styles.backBtn} disabled={loading}>
← Back
</button>

<button
  onClick={confirmBooking}
  style={{
    ...styles.confirmBtn,
    opacity: loading ? 0.7 : 1,
    cursor: loading ? "not-allowed" : "pointer"
  }}
  disabled={loading}
>
{loading ? "Booking..." : "Confirm Ride ✓"}
</button>

</div>

{success && (

<div style={styles.overlay}>
<div style={styles.popup}>

<div style={styles.successIcon}>✅</div>

<h3 style={styles.popupTitle}>Ride Booked Successfully!</h3>

<p style={styles.popupText}>Your ride has been confirmed and saved.</p>

{riskData && (
<div style={{
  ...styles.riskBadge,
  background: getRiskColor(riskData.risk_level) + "20",
  border: `2px solid ${getRiskColor(riskData.risk_level)}`
}}>
  <span style={{ fontWeight: "bold", color: getRiskColor(riskData.risk_level) }}>
    🛡️ Safety Score: {riskData.risk_score}/10 — {riskData.risk_level}
  </span>
</div>
)}

{etaData && (
<div style={styles.etaBadge}>
  <span>🕐 Predicted ETA: <b>{etaData.predicted_eta_minutes} mins</b></span>
</div>
)}

<button
onClick={()=>window.location.href="/"}
style={styles.okBtn}
>
Go to Dashboard
</button>

</div>
</div>

)}

</div>

)

}

const styles={

card:{
background:"white",
padding:"40px",
borderRadius:"15px",
boxShadow:"0 15px 40px rgba(0,0,0,0.1)",
maxWidth:"550px",
margin:"auto",
textAlign:"left",
position:"relative"
},

heading:{
textAlign:"center",
marginBottom:"25px",
fontSize:"22px"
},

detailsGrid:{
display:"flex",
flexDirection:"column",
gap:"12px"
},

detailRow:{
display:"flex",
justifyContent:"space-between",
padding:"10px 15px",
background:"#f9fafb",
borderRadius:"8px",
alignItems:"center"
},

label:{
fontWeight:"600",
color:"#374151",
fontSize:"14px"
},

value:{
color:"#111827",
fontSize:"14px",
maxWidth:"60%",
textAlign:"right",
wordBreak:"break-word"
},

buttons:{
marginTop:"25px",
display:"flex",
justifyContent:"space-between"
},

backBtn:{
padding:"12px 24px",
border:"none",
background:"#e5e7eb",
borderRadius:"10px",
cursor:"pointer",
fontWeight:"600",
fontSize:"14px"
},

confirmBtn:{
padding:"12px 24px",
border:"none",
background:"linear-gradient(135deg, #10b981, #059669)",
color:"white",
borderRadius:"10px",
cursor:"pointer",
fontWeight:"600",
fontSize:"14px",
transition:"all 0.3s"
},

overlay:{
position:"fixed",
top:0,
left:0,
right:0,
bottom:0,
background:"rgba(0,0,0,0.5)",
display:"flex",
alignItems:"center",
justifyContent:"center",
zIndex:999
},

popup:{
background:"white",
padding:"40px",
borderRadius:"18px",
boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
textAlign:"center",
maxWidth:"420px",
width:"90%"
},

successIcon:{
fontSize:"48px",
marginBottom:"10px"
},

popupTitle:{
fontSize:"20px",
marginBottom:"8px",
color:"#111827"
},

popupText:{
color:"#6b7280",
marginBottom:"18px"
},

riskBadge:{
padding:"12px 16px",
borderRadius:"10px",
marginBottom:"12px",
textAlign:"center"
},

etaBadge:{
padding:"12px 16px",
borderRadius:"10px",
background:"#eff6ff",
border:"2px solid #3b82f6",
marginBottom:"18px",
textAlign:"center",
color:"#1d4ed8"
},

okBtn:{
padding:"12px 30px",
background:"linear-gradient(135deg, #10b981, #059669)",
color:"white",
border:"none",
borderRadius:"10px",
cursor:"pointer",
fontWeight:"600",
fontSize:"15px"
}

};
