import { useEffect,useState } from "react"
import { getDrivers,addDriver,deleteDriver } from "./adminApi"
import API, { baseURL } from "../api"

export default function Drivers(){

const [drivers,setDrivers]=useState([])
const [show,setShow]=useState(false)
const [editMode,setEditMode]=useState(false)
const [editId,setEditId]=useState(null)

const [form,setForm]=useState({
name:"",
phone:"",
address:"",
license_no:"",
vehicle_no:""
})

const [license,setLicense]=useState(null)
const [photo,setPhoto]=useState(null)

useEffect(()=>{
loadDrivers()
},[])

async function loadDrivers(){

try{

const res=await getDrivers()
setDrivers(res.data)

}catch(err){

console.log(err)

}

}

function resetForm(){

setForm({
name:"",
phone:"",
address:"",
license_no:"",
vehicle_no:""
})

setLicense(null)
setPhoto(null)
setEditMode(false)
setEditId(null)

}

async function createDriver(){

try{

const fd=new FormData()

fd.append("name",form.name)
fd.append("phone",form.phone)
fd.append("address",form.address)
fd.append("license_no",form.license_no)
fd.append("vehicle_no",form.vehicle_no)

fd.append("license_file",license)
fd.append("driver_photo",photo)

await addDriver(fd)

setShow(false)
resetForm()
loadDrivers()

}catch(err){

console.log("Driver Save Error",err)

}

}

async function updateDriver(){

try{

const fd=new FormData()

fd.append("name",form.name)
fd.append("phone",form.phone)
fd.append("address",form.address)
fd.append("license_no",form.license_no)
fd.append("vehicle_no",form.vehicle_no)

await API.put(`/api/admin/update-driver/${editId}`,fd,{
  headers:{ "Content-Type":"multipart/form-data"}
})

setShow(false)
resetForm()
loadDrivers()

}catch(err){

console.log("Driver Update Error",err)

}

}

function editDriver(driver){

setForm({
name:driver.name,
phone:driver.phone_no,
address:driver.address,
license_no:driver.license_no,
vehicle_no:driver.vehicle_no
})

setEditMode(true)
setEditId(driver.driver_id)
setShow(true)

}

async function remove(id){

await deleteDriver(id)
loadDrivers()

}

function handleSave(){

if(editMode){

updateDriver()

}else{

createDriver()

}

}

return(

<div>

<div style={styles.header}>

<h3>Drivers</h3>

<button
style={styles.addBtn}
onClick={()=>{

setShow(true)
setEditMode(false)
resetForm()

}}
>
+ Add Driver
</button>

</div>

<table style={styles.table}>

<thead>

<tr>
<th>Driver</th>
<th>License Number</th>
<th>Vehicle</th>
<th>Phone</th>
<th>Rating</th>
<th>Status</th>
<th>Actions</th>
</tr>

</thead>

<tbody>

{drivers.map(d=>(

<tr key={d.driver_id}>

<td style={styles.driverCell}>

<img
src={
d.driver_photo
? `${baseURL}/${d.driver_photo}`
: "https://i.pravatar.cc/40"
}
style={styles.avatar}
/>

<div>

<div style={styles.driverName}>{d.name}</div>

<div style={styles.driverAddress}>{d.address}</div>

</div>

</td>

<td>{d.license_no}</td>

<td>
<div>{d.vehicle_no}</div>
<div style={styles.vehicleModel}>Taxi</div>
</td>

<td>{d.phone_no}</td>

<td>
<span style={styles.rating}>⭐ 4.5</span>
</td>

<td>
<span style={styles.status}>Active</span>
</td>

<td>

<button
style={styles.editBtn}
onClick={()=>editDriver(d)}
>
✏️
</button>

<button
style={styles.deleteBtn}
onClick={()=>remove(d.driver_id)}
>
🗑
</button>

</td>

</tr>

))}

</tbody>

</table>

{show &&(

<div style={styles.overlay}>

<div style={styles.popup}>

<h3>{editMode ? "Edit Driver" : "Add Driver"}</h3>

<input
placeholder="Driver Name"
style={styles.input}
value={form.name}
onChange={e=>setForm({...form,name:e.target.value})}
/>

<input
placeholder="Phone"
style={styles.input}
value={form.phone}
onChange={e=>setForm({...form,phone:e.target.value})}
/>

<input
placeholder="Address"
style={styles.input}
value={form.address}
onChange={e=>setForm({...form,address:e.target.value})}
/>

<input
placeholder="License Number"
style={styles.input}
value={form.license_no}
onChange={e=>setForm({...form,license_no:e.target.value})}
/>

<input
placeholder="Vehicle Number"
style={styles.input}
value={form.vehicle_no}
onChange={e=>setForm({...form,vehicle_no:e.target.value})}
/>

{!editMode && (

<>

<label>License Upload</label>

<input
type="file"
onChange={e=>setLicense(e.target.files[0])}
/>

<label>Driver Photo</label>

<input
type="file"
onChange={e=>setPhoto(e.target.files[0])}
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

const styles={

header:{
display:"flex",
justifyContent:"space-between",
marginBottom:20
},

addBtn:{
background:"#7c3aed",
color:"white",
border:"none",
padding:"10px 20px",
borderRadius:8,
cursor:"pointer"
},

table:{
width:"100%",
borderCollapse:"collapse",
background:"white"
},

driverCell:{
display:"flex",
alignItems:"center",
gap:10
},

avatar:{
width:40,
height:40,
borderRadius:"50%"
},

driverName:{
fontWeight:600
},

driverAddress:{
fontSize:12,
color:"#6b7280"
},

vehicleModel:{
fontSize:12,
color:"#6b7280"
},

rating:{
background:"#fef3c7",
padding:"4px 8px",
borderRadius:6
},

status:{
background:"#dcfce7",
color:"#166534",
padding:"4px 10px",
borderRadius:8,
fontSize:12
},

editBtn:{
marginRight:10,
border:"none",
background:"transparent",
cursor:"pointer"
},

deleteBtn:{
border:"none",
background:"transparent",
cursor:"pointer",
color:"red"
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
justifyContent:"center"
},

popup:{
background:"white",
padding:30,
borderRadius:12,
width:380,
display:"flex",
flexDirection:"column",
gap:12
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
padding:"8px 18px",
borderRadius:6,
cursor:"pointer"
}

}