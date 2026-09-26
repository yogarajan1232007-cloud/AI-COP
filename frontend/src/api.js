import axios from "axios";

export const baseURL = "http://127.0.0.1:8000";

const API = axios.create({
  baseURL: baseURL,
});


// =====================================
// DASHBOARD APIs
// =====================================

export const getDashboardStats = () =>
  API.get("/api/stats");

export const getJourneys = () =>
  API.get("/api/journeys/active");

export const startJourney = (bookingId) =>
  API.post("/api/journey/start", {
    booking_id: bookingId,
  });
export const getJourneyHistory = () =>
  API.get("/api/journey/history");

// =====================================
// EMERGENCY APIs
// =====================================

// Create a new emergency event
export const createEmergency = (data) =>
  API.post("/api/emergencies", data);

// Get all active emergencies
export const getActiveEmergencies = () =>
  API.get("/api/emergencies/active");

// Officer action:
// STOP
// DISPATCH_PATROL
// RESOLVE
export const takeEmergencyAction = (emergencyId, officerAction) =>
  API.put(`/api/emergencies/${emergencyId}/action`, {
    officer_action: officerAction,
  });

// =====================================
// RNN MODEL APIs
// =====================================

export const getRiskScore = (data) =>
  API.post("/api/rnn/risk", data);

export const checkRouteAnomaly = (data) =>
  API.post("/api/rnn/anomaly", data);

export const getETAPrediction = (data) =>
  API.post("/api/rnn/eta", data);

export const getDemandForecast = () =>
  API.get("/api/rnn/demand");


export default API;
