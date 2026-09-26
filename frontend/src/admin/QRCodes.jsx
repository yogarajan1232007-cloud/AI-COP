import {useEffect,useState} from "react"
import {getQRCodes} from "./adminApi"
import { baseURL } from "../api"

export default function QRCodes(){

const [codes,setCodes]=useState([])
const [search,setSearch]=useState("")

useEffect(()=>{
load()
},[])

async function load(){

const res = await getQRCodes()
setCodes(res.data)

}

const filtered = codes.filter(c =>
c.vehicle_no.toLowerCase().includes(search.toLowerCase())
)

return(

<div>

{/* HEADER */}

<div style={styles.header}>

<div>
<h3>QR Codes</h3>
<p style={{color:"#666"}}>
Download QR codes for each vehicle
</p>
</div>

<input
placeholder="Search vehicle..."
style={styles.search}
onChange={(e)=>setSearch(e.target.value)}
/>

</div>


{/* GRID */}

<div style={styles.grid}>

{filtered.map(c=>(

<div key={c.vehicle_no} style={styles.card}>

{/* VEHICLE */}

<div style={styles.vehicleBlock}>

<h3 style={styles.vehicle}>{c.vehicle_no}</h3>

<p style={styles.model}>
{c.vehicle_model}
</p>

</div>


{/* QR */}

<div style={styles.qrBox}>

<img
src={`${baseURL}/${c.qr}`}
style={styles.qr}
/>

</div>


{/* DRIVER */}

<p style={styles.driver}>
Driver: {c.driver_name || "Not Assigned"}
</p>


{/* CODE */}

<p style={styles.code}>
QR-{c.vehicle_no}
</p>


{/* DOWNLOAD */}

<a
href={`${baseURL}/${c.qr}`}
download
style={styles.download}
>
Download QR Code
</a>

</div>

))}

</div>

</div>

)

}

const styles={

header:{
display:"flex",
justifyContent:"space-between",
alignItems:"center",
marginBottom:25
},

search:{
padding:10,
borderRadius:8,
border:"1px solid #ddd",
width:220
},

grid:{
display:"grid",
gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
gap:20
},

card:{
background:"#fff",
padding:20,
borderRadius:12,
border:"1px solid #eee",
textAlign:"center"
},

vehicleBlock:{
marginBottom:10
},

vehicle:{
margin:0,
fontSize:18
},

model:{
margin:0,
fontSize:13,
color:"#777"
},

qrBox:{
border:"1px dashed #ddd",
padding:54,
borderRadius:10,
margin:"17px 0"
},

qr:{
width:180,
height:150
},

driver:{
fontSize:14,
marginBottom:4
},

code:{
fontSize:12,
color:"#777",
marginBottom:10
},

download:{
display:"block",
padding:8,
border:"1px solid #ddd",
borderRadius:8,
textDecoration:"none",
color:"#333",
fontSize:14
}

}