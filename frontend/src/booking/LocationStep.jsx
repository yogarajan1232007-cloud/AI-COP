import { useState } from "react";
import axios from "axios";

export default function LocationStep({ nextStep, setBooking }) {

const API_KEY = "661609d3c8964ad6b6e0321591b665a1";

const [pickup,setPickup] = useState("");
const [drop,setDrop] = useState("");

const [pickupList,setPickupList] = useState([]);
const [dropList,setDropList] = useState([]);

const [pickupCoord,setPickupCoord] = useState(null);
const [dropCoord,setDropCoord] = useState(null);

const [distance,setDistance] = useState(0);
const [fare,setFare] = useState(0);

const ratePerKm = 18;

async function searchLocation(text,setList){

if(text.length < 3) return;

try{

const res = await axios.get(
`https://api.opencagedata.com/geocode/v1/json?q=${text}&countrycode=in&limit=5&key=${API_KEY}`
);

setList(res.data.results);

}catch(err){
console.log("API error",err);
}

}

function selectPickup(place){

setPickup(place.formatted);
setPickupList([]);

setPickupCoord(place.geometry);

calculateDistance(place.geometry,dropCoord);

}

function selectDrop(place){

setDrop(place.formatted);
setDropList([]);

setDropCoord(place.geometry);

calculateDistance(pickupCoord,place.geometry);

}

function calculateDistance(p1,p2){

if(!p1 || !p2) return;

const R = 6371;

const dLat = (p2.lat-p1.lat)*Math.PI/180;
const dLon = (p2.lng-p1.lng)*Math.PI/180;

const a =
Math.sin(dLat/2)**2 +
Math.cos(p1.lat*Math.PI/180) *
Math.cos(p2.lat*Math.PI/180) *
Math.sin(dLon/2)**2;

const c = 2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

const km = R*c;

setDistance(km.toFixed(1));
setFare((km*ratePerKm).toFixed(0));

}

function handleNext(){

if(!pickup || !drop){

alert("Please select pickup and drop locations");

return;

}

setBooking(prev=>({
...prev,
boarding_point: pickup,
destination_point: drop,
distance,
fare
}));

nextStep();

}

return(

<div style={styles.container}>

<h2 style={styles.title}>Select Pickup & Drop Location</h2>

{/* PICKUP */}

<input
placeholder="Search Pickup Location"
value={pickup}
onChange={(e)=>{
setPickup(e.target.value)
searchLocation(e.target.value,setPickupList)
}}
style={styles.input}
/>

{pickupList.map((place,i)=>(
<div
key={i}
style={styles.suggestion}
onClick={()=>selectPickup(place)}
>
{place.formatted}
</div>
))}

{/* DROP */}

<input
placeholder="Search Drop Location"
value={drop}
onChange={(e)=>{
setDrop(e.target.value)
searchLocation(e.target.value,setDropList)
}}
style={styles.input}
/>

{dropList.map((place,i)=>(
<div
key={i}
style={styles.suggestion}
onClick={()=>selectDrop(place)}
>
{place.formatted}
</div>
))}

{/* DISTANCE RESULT */}

{distance>0 &&(

<div style={styles.result}>

<div>

<p>Estimated Distance</p>

<h3>{distance} km</h3>

</div>

<div>

<p>Estimated Fare</p>

<h3>₹ {fare}</h3>

</div>

</div>

)}

<button style={styles.button} onClick={handleNext}>
Continue →
</button>

</div>

)

}

const styles = {

container:{
background:"white",
padding:"40px",
borderRadius:"15px",
boxShadow:"0 15px 40px rgba(0,0,0,0.1)",
maxWidth:"600px",
margin:"auto"
},

title:{
marginBottom:"20px"
},

input:{
width:"100%",
padding:"14px",
marginTop:"15px",
borderRadius:"10px",
border:"1px solid #ddd",
fontSize:"15px"
},

suggestion:{
background:"#f7f7f7",
padding:"10px",
borderBottom:"1px solid #eee",
cursor:"pointer"
},

result:{
display:"flex",
justifyContent:"space-between",
background:"#fff3e0",
padding:"20px",
marginTop:"20px",
borderRadius:"12px"
},

button:{
marginTop:"20px",
padding:"12px 25px",
background:"linear-gradient(45deg,#ff7a00,#ffb347)",
border:"none",
borderRadius:"30px",
color:"white",
fontWeight:"bold",
cursor:"pointer"
}

};