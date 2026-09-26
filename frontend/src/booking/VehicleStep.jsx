import { useEffect, useState } from "react";
import API from "../api";

export default function VehicleStep({ nextStep, prevStep, booking, setBooking }) {

const [vehicles,setVehicles] = useState([]);
const [loading,setLoading] = useState(true);

useEffect(()=>{

async function loadVehicles(){

try{

const res = await API.get("/api/vehicles");

setVehicles(res.data);

}catch(err){

console.error("Vehicle load error:",err);

}

setLoading(false);

}

loadVehicles();

},[]);


function selectVehicle(v){

setBooking({
...booking,

vehicle_id: v.vehicle_id,   // REQUIRED for DB
vehicle: v.vehicle_model    // display only

});

nextStep();

}

if(loading){
return <h3 style={{textAlign:"center"}}>Loading vehicles...</h3>
}

return(

<div>

<h2 style={{textAlign:"center"}}>Select Your Vehicle</h2>

<div style={grid}>

{vehicles.map((v)=>(

<div
key={v.vehicle_id}
style={{
...card,
border:
booking.vehicle_id === v.vehicle_id
? "2px solid #28a745"
: "2px solid transparent"
}}
onClick={()=>selectVehicle(v)}
>

<div style={avatar}>🚗</div>

<h3>{v.vehicle_model}</h3>

<p><b>Vehicle No:</b> {v.vehicle_no}</p>

</div>

))}

</div>

<div style={{textAlign:"center",marginTop:"25px"}}>

<button onClick={prevStep} style={backBtn}>
← Back
</button>

</div>

</div>

)

}

const grid={
display:"grid",
gridTemplateColumns:"repeat(2,1fr)",
gap:"20px",
maxWidth:"600px",
margin:"auto",
marginTop:"20px"
}

const card={
background:"white",
padding:"25px",
borderRadius:"12px",
cursor:"pointer",
boxShadow:"0 10px 25px rgba(0,0,0,0.1)",
textAlign:"center",
transition:"0.2s"
}

const avatar={
width:"60px",
height:"60px",
borderRadius:"50%",
background:"#f4f4f4",
display:"flex",
alignItems:"center",
justifyContent:"center",
fontSize:"28px",
margin:"auto",
marginBottom:"10px"
}

const backBtn={
padding:"10px 20px",
border:"none",
background:"#ccc",
borderRadius:"8px",
cursor:"pointer"
}