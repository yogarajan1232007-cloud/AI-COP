import { useEffect, useState } from "react"
import { getVehicles, addVehicle, deleteVehicle, updateVehicle } from "./adminApi"

export default function Vehicles(){

const [vehicles,setVehicles] = useState([])
const [show,setShow] = useState(false)
const [editMode,setEditMode] = useState(false)
const [editId,setEditId] = useState(null)

const [form,setForm] = useState({
vehicle_no:"",
vehicle_type:"",
vehicle_model:"",
owner_name:"",
owner_phone:"",
owner_address:""
})

const [rc,setRc] = useState(null)
const [insurance,setInsurance] = useState(null)

useEffect(()=>{
loadVehicles()
},[])

async function loadVehicles(){

try{

const res = await getVehicles()
setVehicles(res.data)

}catch(err){

console.log("Vehicle Load Error",err)

}

}

function resetForm(){

setForm({
vehicle_no:"",
vehicle_type:"",
vehicle_model:"",
owner_name:"",
owner_phone:"",
owner_address:""
})

setRc(null)
setInsurance(null)
setEditMode(false)
setEditId(null)

}

async function createVehicle(){

try{

const fd = new FormData()

fd.append("vehicle_no",form.vehicle_no)
fd.append("vehicle_type",form.vehicle_type)
fd.append("vehicle_model",form.vehicle_model)
fd.append("owner_name",form.owner_name)
fd.append("owner_phone",form.owner_phone)
fd.append("owner_address",form.owner_address)

fd.append("rc_book",rc)
fd.append("insurance",insurance)

await addVehicle(fd)

setShow(false)
resetForm()
loadVehicles()

}catch(err){

console.log("Vehicle Save Error",err)

}

}

/* ---------------- UPDATE VEHICLE ---------------- */

async function updateVehicleData(){

try{

const fd = new FormData()

fd.append("vehicle_no",form.vehicle_no)
fd.append("vehicle_type",form.vehicle_type)
fd.append("vehicle_model",form.vehicle_model)
fd.append("owner_name",form.owner_name)
fd.append("owner_phone",form.owner_phone)
fd.append("owner_address",form.owner_address)

await updateVehicle(editId,fd)

setShow(false)
resetForm()
loadVehicles()

}catch(err){

console.log("Vehicle Update Error",err)

}

}

/* ---------------- EDIT ---------------- */

function editVehicle(v){

setForm({
vehicle_no:v.vehicle_no,
vehicle_type:v.vehicle_type || "",
vehicle_model:v.vehicle_model,
owner_name:v.owner_name || "",
owner_phone:v.phone_no || "",
owner_address:v.address || ""
})

setEditMode(true)
setEditId(v.vehicle_id)
setShow(true)

}

/* ---------------- DELETE ---------------- */

async function remove(id){

try{

await deleteVehicle(id)
loadVehicles()

}catch(err){

console.log("Delete Vehicle Error",err)

}

}

function handleSave(){

if(editMode){

updateVehicleData()

}else{

createVehicle()

}

}

return(

<div>

{/* HEADER */}

<div style={styles.topBar}>

<div>
<h3 style={styles.title}>Vehicles</h3>
<p style={styles.subtitle}>Manage all registered vehicles</p>
</div>

<button
style={styles.addBtn}
onClick={()=>{
resetForm()
setShow(true)
}}
>
+ Add Vehicle
</button>

</div>

{/* TABLE */}

<table style={styles.table}>

<thead>

<tr>
<th>Vehicle</th>
<th>Type</th>
<th>Owner</th>
<th>QR Code</th>
<th>Status</th>
<th>Actions</th>
</tr>

</thead>

<tbody>

{vehicles.map(v=>(

<tr key={v.vehicle_id} style={styles.row}>

<td>

<div style={styles.vehicleBlock}>

<div style={styles.vehicleNo}>
{v.vehicle_no}
</div>

<div style={styles.vehicleModel}>
{v.vehicle_model}
</div>

</div>

</td>

<td>

<span style={styles.typeTag}>
{v.vehicle_type}
</span>

</td>

<td>

<div style={styles.ownerBox}>

<img
src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
style={styles.avatar}
/>

<div>

<div style={styles.ownerName}>
{v.owner_name || "Owner"}
</div>

</div>

</div>

</td>

<td>

<span style={styles.qrTag}>
QR-{v.vehicle_id}
</span>

</td>

<td>

<span style={styles.status}>
Registered
</span>

</td>

<td>

<button
style={styles.editBtn}
onClick={()=>editVehicle(v)}
>
✏️
</button>

<button
style={styles.deleteBtn}
onClick={()=>{
if(window.confirm("Delete this vehicle?")){
remove(v.vehicle_id)
}
}}
>
🗑
</button>

</td>

</tr>

))}

</tbody>

</table>

{/* POPUP */}

{show &&(

<div style={styles.overlay}>

<div style={styles.popup}>

<h3>{editMode ? "Edit Vehicle" : "Add Vehicle"}</h3>

<input
placeholder="Vehicle Number"
style={styles.input}
value={form.vehicle_no}
onChange={e=>setForm({...form,vehicle_no:e.target.value})}
/>

<select
style={styles.input}
value={form.vehicle_type}
onChange={e=>setForm({...form,vehicle_type:e.target.value})}
>
<option value="">Select Vehicle Type</option>
<option value="Cab">Cab</option>
<option value="Bike">Bike</option>
<option value="Auto">Auto</option>
<option value="Bus">Bus</option>
</select>

<input
placeholder="Vehicle Model"
style={styles.input}
value={form.vehicle_model}
onChange={e=>setForm({...form,vehicle_model:e.target.value})}
/>

<hr/>

<h4>Owner Details</h4>

<input
placeholder="Owner Name"
style={styles.input}
value={form.owner_name}
onChange={e=>setForm({...form,owner_name:e.target.value})}
/>

<input
placeholder="Owner Phone"
style={styles.input}
value={form.owner_phone}
onChange={e=>setForm({...form,owner_phone:e.target.value})}
/>

<input
placeholder="Owner Address"
style={styles.input}
value={form.owner_address}
onChange={e=>setForm({...form,owner_address:e.target.value})}
/>

{!editMode &&(
<>

<label>RC Book</label>

<input
type="file"
onChange={e=>setRc(e.target.files[0])}
/>

<label>Insurance</label>

<input
type="file"
onChange={e=>setInsurance(e.target.files[0])}
/>

</>
)}

<div style={styles.buttons}>

<button
onClick={()=>{
setShow(false)
resetForm()
}}
>
Cancel
</button>

<button
style={styles.saveBtn}
onClick={handleSave}
>
{editMode ? "Update" : "Save"}
</button>

</div>

</div>

</div>

)}

</div>

)

}

/* ---------------- STYLES ---------------- */

const styles={

topBar:{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:25
},

title:{
margin:0
},

subtitle:{
fontSize:13,
color:"#6b7280"
},

addBtn:{
background:"#7c3aed",
color:"white",
border:"none",
padding:"10px 18px",
borderRadius:8,
cursor:"pointer"
},

table:{
width:"100%",
borderCollapse:"collapse",
background:"white"
},

row:{
borderTop:"1px solid #eee"
},

vehicleBlock:{
display:"flex",
flexDirection:"column"
},

vehicleNo:{
fontWeight:600
},

vehicleModel:{
fontSize:12,
color:"#6b7280"
},

typeTag:{
background:"#e5e7eb",
padding:"4px 10px",
borderRadius:8,
fontSize:12
},

ownerBox:{
display:"flex",
alignItems:"center",
gap:10
},

avatar:{
width:32,
height:32,
borderRadius:"50%"
},

ownerName:{
fontWeight:500
},

qrTag:{
background:"#e5e7eb",
padding:"4px 8px",
borderRadius:6,
fontSize:12
},

status:{
background:"#dcfce7",
color:"#166534",
padding:"4px 10px",
borderRadius:10,
fontSize:12
},

editBtn:{
marginRight:10,
border:"none",
background:"transparent",
cursor:"pointer",
fontSize:16
},

deleteBtn:{
border:"none",
background:"transparent",
cursor:"pointer",
color:"red",
fontSize:16
},

overlay:{
position:"fixed",
top:0,
left:0,
right:0,
bottom:0,
background:"rgba(0,0,0,0.4)",
display:"flex",
alignItems:"center",
justifyContent:"center"
},

popup:{
background:"white",
padding:30,
borderRadius:12,
width:380,
display:"flex",
flexDirection:"column",
gap:10
},

input:{
padding:10,
border:"1px solid #ddd",
borderRadius:6
},

buttons:{
display:"flex",
justifyContent:"space-between",
marginTop:10
},

saveBtn:{
background:"#7c3aed",
color:"white",
border:"none",
padding:"8px 16px",
borderRadius:6
}

}