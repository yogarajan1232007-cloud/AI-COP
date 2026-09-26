import { useState } from "react";
import LocationStep from "./LocationStep";
import PassengerStep from "./PassengerStep";
import VehicleStep from "./VehicleStep";
import ConfirmStep from "./ConfirmStep";

export default function BookingPage(){

const [step,setStep] = useState(1);

const [booking,setBooking] = useState({
boarding_point:"",
destination_point:"",
distance:"",
fare:"",
passenger_name:"",
gender:"",
age:"",
phone_no:"",
vehicle_id:"",
vehicle:"",
booking_status:"Pending"
});

function nextStep(){
setStep(prev => prev + 1);
}

function prevStep(){
setStep(prev => prev - 1);
}

return(

<div style={styles.page}>

<h1 style={styles.title}>🚖 RideEasy Cab Booking</h1>

<p style={styles.subtitle}>
Book your ride in simple steps
</p>

{/* STEP INDICATOR */}

<div style={styles.stepBar}>

<span style={step>=1 ? styles.activeStep : styles.step}>1</span>
<span style={step>=2 ? styles.activeStep : styles.step}>2</span>
<span style={step>=3 ? styles.activeStep : styles.step}>3</span>
<span style={step>=4 ? styles.activeStep : styles.step}>4</span>

</div>

{/* STEP CONTENT */}

{step===1 && (
<LocationStep
nextStep={nextStep}
booking={booking}
setBooking={setBooking}
/>
)}

{step===2 && (
<PassengerStep
nextStep={nextStep}
prevStep={prevStep}
booking={booking}
setBooking={setBooking}
/>
)}

{step===3 && (
<VehicleStep
nextStep={nextStep}
prevStep={prevStep}
booking={booking}
setBooking={setBooking}
/>
)}

{step===4 && (
<ConfirmStep
prevStep={prevStep}
booking={booking}
/>
)}

</div>

)

}

const styles={

page:{
background:"linear-gradient(120deg,#f7d7b5,#fce7c8)",
minHeight:"100vh",
padding:"40px",
textAlign:"center"
},

title:{
fontSize:"32px",
marginBottom:"5px"
},

subtitle:{
marginBottom:"30px",
color:"#555"
},

stepBar:{
display:"flex",
justifyContent:"center",
gap:"20px",
marginBottom:"30px"
},

step:{
width:"35px",
height:"35px",
borderRadius:"50%",
background:"#ccc",
display:"flex",
alignItems:"center",
justifyContent:"center",
color:"#fff"
},

activeStep:{
width:"35px",
height:"35px",
borderRadius:"50%",
background:"#ff7a00",
display:"flex",
alignItems:"center",
justifyContent:"center",
color:"#fff",
fontWeight:"bold"
}

};