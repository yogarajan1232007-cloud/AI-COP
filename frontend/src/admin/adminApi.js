import API from "../api"

/* ---------------- LOGIN ---------------- */

export async function adminLogin(data){
  return API.post("/api/admin/login",data)
}

/* ---------------- DRIVERS ---------------- */

export async function getDrivers(){
  return API.get("/api/admin/drivers")
}

export async function addDriver(formData){
  return API.post("/api/admin/add-driver",formData,{
    headers:{ "Content-Type":"multipart/form-data"}
  })
}

export async function deleteDriver(id){
  return API.delete(`/api/admin/delete-driver/${id}`)
}

/* ---------------- VEHICLES ---------------- */

export async function getVehicles(){
  return API.get("/api/admin/vehicles")
}

export async function addVehicle(formData){
  return API.post("/api/admin/add-vehicle",formData,{
    headers:{ "Content-Type":"multipart/form-data"}
  })
}

export async function deleteVehicle(id){
  return API.delete(`/api/admin/delete-vehicle/${id}`)
}

export async function updateVehicle(id,formData){
  return API.put(`/api/admin/update-vehicle/${id}`,formData,{
    headers:{ "Content-Type":"multipart/form-data"}
  })
}

/* ---------------- QR ---------------- */

export async function getQRCodes(){
  return API.get("/api/admin/qrcodes")
}