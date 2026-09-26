import { useState } from "react";

export default function PassengerStep({ nextStep, prevStep, booking, setBooking }) {

const [name,setName] = useState(booking.passenger_name || "");
const [gender,setGender] = useState(booking.gender || "");
const [age,setAge] = useState(booking.age || "");
const [phone,setPhone] = useState(booking.phone_no || "");

function handleNext(){

if(!name || !phone || !gender || !age){
alert("Please fill all passenger details");
return;
}

if(!/^[0-9]{10}$/.test(phone)){
alert("Enter valid 10 digit phone number");
return;
}

setBooking(prev=>({
...prev,
passenger_name:name,
gender:gender,
age:age,
phone_no:phone
}));

nextStep();

}

return(

<div style={styles.card}>

<h2>Passenger Information</h2>

<input
type="text"
placeholder="Passenger Name"
value={name}
onChange={(e)=>setName(e.target.value)}
style={styles.input}
/>

<select
value={gender}
onChange={(e)=>setGender(e.target.value)}
style={styles.input}
>
<option value="">Select Gender</option>
<option value="Male">Male</option>
<option value="Female">Female</option>
<option value="Other">Other</option>
</select>

<input
type="number"
placeholder="Age"
value={age}
onChange={(e)=>setAge(e.target.value)}
style={styles.input}
/>

<input
type="text"
placeholder="Phone Number"
value={phone}
onChange={(e)=>setPhone(e.target.value)}
style={styles.input}
/>

<div style={styles.buttons}>

<button style={styles.backBtn} onClick={prevStep}>
← Back
</button>

<button style={styles.nextBtn} onClick={handleNext}>
Continue →
</button>

</div>

</div>

)

}

const styles={

card:{
background:"white",
padding:"40px",
borderRadius:"15px",
boxShadow:"0 15px 40px rgba(0,0,0,0.1)",
maxWidth:"500px",
margin:"auto"
},

input:{
width:"100%",
padding:"12px",
marginTop:"15px",
borderRadius:"8px",
border:"1px solid #ddd",
fontSize:"15px"
},

buttons:{
marginTop:"25px",
display:"flex",
justifyContent:"space-between"
},

backBtn:{
padding:"10px 20px",
border:"none",
background:"#ccc",
borderRadius:"8px",
cursor:"pointer"
},

nextBtn:{
padding:"10px 20px",
border:"none",
background:"#ff7a00",
color:"white",
borderRadius:"8px",
cursor:"pointer"
}

};