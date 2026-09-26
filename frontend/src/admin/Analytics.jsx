import { useEffect, useState } from "react"
import API from "../api"

import {
Chart as ChartJS,
ArcElement,
Tooltip,
Legend,
CategoryScale,
LinearScale,
BarElement,
PointElement,
LineElement,
Filler
} from "chart.js"

import { Pie, Line, Bar } from "react-chartjs-2"

ChartJS.register(
ArcElement,
Tooltip,
Legend,
CategoryScale,
LinearScale,
BarElement,
PointElement,
LineElement,
Filler
)

export default function Analytics(){

const [data,setData] = useState(null)

useEffect(()=>{
loadAnalytics()
},[])

async function loadAnalytics(){

try{

const res = await API.get("/api/admin/analytics")
setData(res.data)

}catch(err){

console.log("Analytics Error:",err)

}

}


/* ---------------- SAFE DATA ---------------- */

const vehicleTypes = data?.vehicle_types || {}
const ratings = data?.driver_ratings || {}
const stats = data?.today_stats || {}
const gender = data?.gender_stats || {Male:0,Female:0}
const trend = data?.journey_trend || {}
const origins = data?.origin_stats || {}


/* ---------------- PIE CHART ---------------- */

const genderChart = {

labels:["Male","Female"],

datasets:[{

label:"Passengers",

data:[gender.Male, gender.Female],

backgroundColor:["#4f46e5","#ec4899"]

}]

}

const genderOptions = {

responsive:true,

plugins:{
legend:{
position:"top",
labels:{
generateLabels(chart){

const data = chart.data.datasets[0].data
const labels = chart.data.labels

return labels.map((label,i)=>({

text:`${label}: ${data[i]}`,
fillStyle: chart.data.datasets[0].backgroundColor[i]

}))

}
}
}
}

}


/* ---------------- LINE CHART ---------------- */

const trendChart = {

labels:Object.keys(trend),

datasets:[{

label:"Trips",

data:Object.values(trend),

borderColor:"#7c3aed",

backgroundColor:"rgba(124,58,237,0.2)",

fill:true,

tension:0.4,

pointRadius:5

}]

}

const trendOptions = {

responsive:true,

plugins:{
legend:{position:"top"}
},

scales:{

x:{
title:{
display:true,
text:"Last 7 Days"
}
},

y:{
title:{
display:true,
text:"Trips"
},
beginAtZero:true,
ticks:{stepSize:1}
}

}

}


/* ---------------- LOCATION BAR CHART ---------------- */

const originChart = {

labels:Object.keys(origins),

datasets:[{

label:"Trips",

data:Object.values(origins),

backgroundColor:"#10b981"

}]

}

const originOptions = {

responsive:true,

plugins:{
legend:{display:false}
},

scales:{

x:{
title:{
display:true,
text:"Pickup Locations"
}
},

y:{
title:{
display:true,
text:"Trips"
},
beginAtZero:true
}

}

}



/* ---------------- UI ---------------- */

return(

<div style={styles.container}>


{/* ---------- TOP CARDS ---------- */}

<div style={styles.topGrid}>

<div style={styles.card}>

<h3>Vehicle Types</h3>

{Object.entries(vehicleTypes).map(([k,v])=>(

<div key={k} style={styles.row}>
<span>{k}</span>
<span style={styles.badge}>{v}</span>
</div>

))}

</div>


<div style={styles.card}>

<h3>Driver Ratings</h3>

<div style={styles.row}><span>5 Star</span><span>{ratings["5"]||0}</span></div>
<div style={styles.row}><span>4 Star</span><span>{ratings["4"]||0}</span></div>
<div style={styles.row}><span>3 Star</span><span>{ratings["3"]||0}</span></div>
<div style={styles.row}><span>Below 3</span><span>{ratings["below"]||0}</span></div>

</div>


<div style={styles.card}>

<h3>Today's Stats</h3>

<div style={styles.row}><span>Total Journeys</span><span>{stats.journeys||0}</span></div>
<div style={styles.row}><span>Emergency Alerts</span><span>{stats.alerts||0}</span></div>
<div style={styles.row}><span>Avg Response Time</span><span>-</span></div>
<div style={styles.row}><span>Safety Score</span><span>-</span></div>

</div>

</div>



{/* ---------- PIE + LINE ---------- */}

<div style={styles.chartRow}>

<div style={styles.chartBox}>

<h3>Passenger Gender Distribution</h3>

<Pie data={genderChart} options={genderOptions}/>

</div>


<div style={styles.chartBox}>

<h3>Passenger Trend (Last 7 Days)</h3>

<Line data={trendChart} options={trendOptions}/>

</div>

</div>



{/* ---------- SECURITY AREAS ---------- */}

<div style={styles.chartBox}>

<h3>Security Risk Areas</h3>

<Bar data={originChart} options={originOptions}/>

</div>


</div>

)

}


/* ---------------- STYLES ---------------- */

const styles = {

container:{
padding:20
},

topGrid:{
display:"grid",
gridTemplateColumns:"1fr 1fr 1fr",
gap:20,
marginBottom:30
},

card:{
background:"white",
padding:20,
borderRadius:12,
boxShadow:"0 2px 10px rgba(0,0,0,0.05)"
},

row:{
display:"flex",
justifyContent:"space-between",
marginTop:10
},

badge:{
background:"#111827",
color:"white",
padding:"2px 8px",
borderRadius:6
},

chartRow:{
display:"grid",
gridTemplateColumns:"1fr 1fr",
gap:25,
marginBottom:30
},

chartBox:{
background:"white",
padding:25,
height:420,
borderRadius:12,
boxShadow:"0 2px 10px rgba(0,0,0,0.05)"
}

}