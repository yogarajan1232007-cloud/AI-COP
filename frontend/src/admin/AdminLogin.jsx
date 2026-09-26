import { useState } from "react"
import API from "../api"
import { useNavigate } from "react-router-dom"

export default function AdminLogin() {

  const [username,setUsername] = useState("")
  const [password,setPassword] = useState("")
  const navigate = useNavigate()

  async function login(){

    try{

      const res = await API.post(
        "/api/admin/login",
        {username,password}
      )

      if(res.data.status==="success"){
        navigate("/admin/dashboard")
      }else{
        alert("Invalid login")
      }

    }catch(err){
      alert("Server Error")
    }

  }

  return (

    <div style={styles.container}>

      {/* LEFT SIDE */}

      <div style={styles.left}>

        <h1 style={styles.logo}>SafeRide</h1>

        <h2 style={styles.heading}>
          Smart Fleet Safety System
        </h2>

        <p style={styles.text}>
          Track drivers, monitor vehicles and keep every
          passenger safe — all from one powerful dashboard.
        </p>

        <div style={styles.stats}>

          <div style={styles.statBox}>
            <b>99%</b>
            <span>Uptime</span>
          </div>

          <div style={styles.statBox}>
            <b>Live</b>
            <span>Tracking</span>
          </div>

          <div style={styles.statBox}>
            <b>Secure</b>
            <span>System</span>
          </div>

        </div>

      </div>


      {/* RIGHT SIDE */}

      <div style={styles.right}>

        <div style={styles.card}>

          <h2>Sign in to Admin Panel</h2>

          <input
          placeholder="Enter username"
          value={username}
          onChange={(e)=>setUsername(e.target.value)}
          style={styles.input}
          />

          <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          style={styles.input}
          />

          <button
          style={styles.button}
          onClick={login}
          >
          Sign in to Dashboard
          </button>

        </div>

      </div>

    </div>

  )
}



const styles={

container:{
display:"flex",
height:"100vh",
fontFamily:"Arial"
},

left:{
flex:1,
background:"linear-gradient(135deg,#ff7a00,#ffb347)",
color:"white",
padding:"60px",
display:"flex",
flexDirection:"column",
justifyContent:"center"
},

logo:{
fontSize:"26px",
marginBottom:"20px"
},

heading:{
fontSize:"34px",
marginBottom:"10px"
},

text:{
opacity:0.9,
marginBottom:"30px"
},

stats:{
display:"flex",
gap:"15px"
},

statBox:{
background:"rgba(255,255,255,0.2)",
padding:"12px 18px",
borderRadius:"10px",
display:"flex",
flexDirection:"column",
alignItems:"center"
},

right:{
flex:1,
display:"flex",
alignItems:"center",
justifyContent:"center",
background:"#f4f4f4"
},

card:{
background:"white",
padding:"40px",
borderRadius:"12px",
boxShadow:"0 10px 20px rgba(0,0,0,0.1)",
display:"flex",
flexDirection:"column",
gap:"15px",
width:"300px"
},

input:{
padding:"12px",
border:"1px solid #ccc",
borderRadius:"6px"
},

button:{
background:"#ff7a00",
color:"white",
border:"none",
padding:"12px",
borderRadius:"6px",
cursor:"pointer"
}

}