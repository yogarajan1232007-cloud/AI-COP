import { useState } from "react";
import Drivers from "./Drivers";
import Vehicles from "./Vehicles";
import QRCodes from "./QRCodes";
import Analytics from "./Analytics";

export default function AdminDashboard(){

const [tab,setTab] = useState("drivers")

return(

<div style={styles.page}>

<h2 style={styles.title}>Admin Control Panel</h2>
<p style={styles.subtitle}>Manage Drivers, Vehicles & Analytics</p>

<div style={styles.tabs}>

<button style={tab==="drivers"?styles.activeTab:styles.tab}
onClick={()=>setTab("drivers")}>
Drivers
</button>

<button style={tab==="vehicles"?styles.activeTab:styles.tab}
onClick={()=>setTab("vehicles")}>
Vehicles
</button>

<button style={tab==="qr"?styles.activeTab:styles.tab}
onClick={()=>setTab("qr")}>
QR Codes
</button>

<button style={tab==="analytics"?styles.activeTab:styles.tab}
onClick={()=>setTab("analytics")}>
Analytics
</button>

</div>

<div style={styles.panel}>

{tab==="drivers" && <Drivers/>}
{tab==="vehicles" && <Vehicles/>}
{tab==="qr" && <QRCodes/>}
{tab==="analytics" && <Analytics/>}

</div>

</div>

)

}

const styles={

page:{
padding:40,
background:"#f1f5f9",
minHeight:"100vh"
},

title:{
marginBottom:5
},

subtitle:{
color:"#64748b",
marginBottom:20
},

tabs:{
display:"flex",
gap:10,
marginBottom:20
},

tab:{
padding:"10px 20px",
background:"#e2e8f0",
border:"none",
borderRadius:8,
cursor:"pointer"
},

activeTab:{
padding:"10px 20px",
background:"#6366f1",
color:"white",
border:"none",
borderRadius:8
},

panel:{
background:"white",
padding:25,
borderRadius:12
}

}