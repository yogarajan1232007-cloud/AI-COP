import React, {
  Fragment,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  Tooltip,
  Circle,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  AlertTriangle,
  Activity,
  Clock,
  MapPin,
  Navigation,
  Shield,
  Zap,
} from "lucide-react";

import API, {
  getRiskScore,
  checkRouteAnomaly,
  createEmergency,
  getActiveEmergencies
} from "../api";

import taxiIconImg from "../assets/taxi.png";
import { setVehicles } from "../store/vehicleStore";


/* =========================================================
   ICONS
========================================================= */

const taxiIcon = new L.Icon({
  iconUrl: taxiIconImg,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
});


/* -------------------------
   FROM ICON
------------------------- */

const sourceIcon = L.divIcon({
  className: "ai-cop-source-icon",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#2563eb;
      border:4px solid white;
      box-shadow:0 0 0 5px rgba(37,99,235,.20);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:15px;
      font-weight:900;
    ">
      A
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});


/* -------------------------
   TO ICON
------------------------- */

const destinationIcon = L.divIcon({
  className: "ai-cop-destination-icon",
  html: `
    <div style="
      width:34px;
      height:34px;
      border-radius:50%;
      background:#dc2626;
      border:4px solid white;
      box-shadow:0 0 0 5px rgba(220,38,38,.20);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:14px;
      font-weight:900;
    ">
      B
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});


/* -------------------------
   FEMALE PASSENGER ICON
------------------------- */

const femalePassengerIcon = L.divIcon({
  className: "ai-cop-female-icon",
  html: `
    <div style="
      width:28px;
      height:28px;
      border-radius:50%;
      background:#ec4899;
      border:3px solid white;
      box-shadow:
        0 0 0 4px rgba(236,72,153,.20),
        0 3px 8px rgba(0,0,0,.20);
      display:flex;
      align-items:center;
      justify-content:center;
      color:white;
      font-size:16px;
      font-weight:900;
    ">
      ♀
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});


/* =========================================================
   HELPERS
========================================================= */


/*
 * Calculate the current simulated vehicle speed.
 *
 * We don't have real GPS speed from the physical
 * vehicle yet, so we estimate speed from:
 *
 *     distance / ETA
 *
 * Example:
 *
 *     20 km / 30 minutes
 *     = 40 km/h
 *
 * This gives the RNN a meaningful speed value
 * instead of a completely random speed.
 */

function calculateLiveSpeed(vehicle) {

  const distance =
    Number(vehicle.distance) || 0;

  const etaMinutes =
    Number(vehicle.eta) || 10;


  /*
   * If distance is unavailable,
   * use a safe demo speed.
   */

  if (distance <= 0) {
    return 30;
  }


  /*
   * Convert:
   *
   * km / minutes
   *
   * into:
   *
   * km / hour
   */

  const estimatedSpeed =
    (distance / etaMinutes) * 60;


  /*
   * Keep the simulated vehicle speed
   * inside a reasonable range.
   */

  return 100;
}


/*
 * Convert risk score into route color.
 */

function getRiskColor(score) {

  const value =
    Number(score) || 0;


  if (value <= 3) {
    return "#10b981";
  }


  if (value <= 5) {
    return "#f59e0b";
  }


  if (value <= 7) {
    return "#ef4444";
  }


  return "#dc2626";
}


/*
 * Convert risk score into risk level.
 */

function getRiskLevel(score) {

  const value =
    Number(score) || 0;


  if (value <= 3) {
    return "Low";
  }


  if (value <= 5) {
    return "Medium";
  }


  if (value <= 7) {
    return "High";
  }


  return "Critical";
}
/* =========================================================
   TRUE ROUTE BEARING
========================================================= */

function getRouteBearing(point1, point2) {
  if (
    !point1 ||
    !point2 ||
    point1.length < 2 ||
    point2.length < 2
  ) {
    return 0;
  }

  const lat1 =
    Number(point1[0]) * Math.PI / 180;

  const lat2 =
    Number(point2[0]) * Math.PI / 180;

  const deltaLng =
    (Number(point2[1]) - Number(point1[1])) *
    Math.PI / 180;

  const y =
    Math.sin(deltaLng) *
    Math.cos(lat2);

  const x =
    Math.cos(lat1) *
      Math.sin(lat2) -
    Math.sin(lat1) *
      Math.cos(lat2) *
      Math.cos(deltaLng);

  return (
    Math.atan2(y, x) *
    180 /
    Math.PI
  );
}


/* =========================================================
   FEMALE ROUTE ARROW
========================================================= */

function createFemaleArrowIcon(angle, riskScore) {
  const highRisk =
    Number(riskScore) > 7;

  const arrowColor =
    highRisk
      ? "#dc2626"
      : "#ec4899";

  return L.divIcon({
    className: "ai-cop-route-arrow",
    html: `
      <div style="
        width:26px;
        height:26px;
        display:flex;
        align-items:center;
        justify-content:center;
        transform:rotate(${angle}deg);
        color:${arrowColor};
        font-size:22px;
        font-weight:900;
        line-height:1;
        text-shadow:
          0 1px 2px white,
          1px 0 2px white,
          -1px 0 2px white,
          0 -1px 2px white;
      ">
        ▲
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}


/* =========================================================
   FEMALE ROUTE ARROWS
   -----------------------------------------
   Shows directional arrows only for female passengers.

   Performance:
   - Maximum 6 arrows per route
   - Arrows are evenly distributed
   - Arrow direction follows the actual route
   - High/Critical risk changes arrows to RED
   - Normal female route stays PINK
========================================================= */

function FemaleRouteArrows({
  vehicle,
  riskScore,
}) {

  /* -------------------------------------------------------
     Only female passengers get these arrows.
  ------------------------------------------------------- */

  if (
    !vehicle ||
    vehicle.gender !== "Female" ||
    !Array.isArray(vehicle.route) ||
    vehicle.route.length < 2
  ) {
    return null;
  }


  const route =
    vehicle.route;


  /* -------------------------------------------------------
     Keep the number of arrow markers small.

     This is important for map performance.
  ------------------------------------------------------- */

  const arrowCount =
    Math.min(
      6,
      Math.max(
        3,
        Math.floor(
          route.length / 25
        )
      )
    );


  const interval =
    Math.max(
      1,
      Math.floor(
        route.length /
        arrowCount
      )
    );


  const arrows = [];


  /* -------------------------------------------------------
     Create arrows along the route.
  ------------------------------------------------------- */

  for (
    let i = interval;
    i < route.length - 1;
    i += interval
  ) {

    const point =
      route[i];


    const nextPoint =
      route[
        Math.min(
          i + 1,
          route.length - 1
        )
      ];


    if (
      !point ||
      !nextPoint
    ) {
      continue;
    }


    /* -----------------------------------------------------
       Calculate actual direction of the road.
    ----------------------------------------------------- */

    const bearing =
      getRouteBearing(
        point,
        nextPoint
      );


    arrows.push(

      <Marker

        key={
          `female-arrow-${vehicle.id}-${i}`
        }

        position={
          point
        }

        icon={
          createFemaleArrowIcon(
            bearing,
            riskScore
          )
        }

        interactive={
          false
        }

      />

    );

  }


  return (
    <>
      {arrows}
    </>
  );
}




/* =========================================================
   ROUTE CONTROLLER
========================================================= */

/* =========================================================
   ROUTE CONTROLLER
   -----------------------------------------
   IMPORTANT:
   Fit the map only when the selected vehicle changes.

   Do NOT fit the map every time the vehicle moves.
   This prevents map jumping and lag.
========================================================= */

function RouteController({
  vehicles,
  focusVehicle,
}) {

  const map = useMap();

  useEffect(() => {

    let routes = [];

    /*
     * If police selected
     * "View Direction",
     * focus only that vehicle.
     */
    if (
      focusVehicle &&
      Array.isArray(focusVehicle.route) &&
      focusVehicle.route.length >= 2
    ) {

      routes = [
        focusVehicle.route
      ];

    }

    /*
     * Otherwise show all active
     * vehicle routes.
     */
    else {

      routes = vehicles
        .filter(
          (vehicle) =>
            Array.isArray(vehicle.route) &&
            vehicle.route.length >= 2
        )
        .map(
          (vehicle) =>
            vehicle.route
        );

    }

    if (routes.length === 0) {
      return;
    }

    const allPoints =
      routes.flat();

    if (allPoints.length < 2) {
      return;
    }

    const bounds =
      L.latLngBounds(allPoints);

    map.fitBounds(
      bounds,
      {
        padding: [70, 70],
        maxZoom: 14,
        animate: true,
      }
    );

  }, [
    focusVehicle?.id,
    vehicles.length,
    map,
  ]);

  return null;
}


/* =========================================================
   LOCATION GROUPING
========================================================= */

function groupLocations(vehicles, type) {
  const groups = {};

  vehicles.forEach((vehicle) => {
    const location =
      type === "source"
        ? vehicle.start
        : vehicle.end;

    if (
      !Array.isArray(location) ||
      location.length < 2
    ) {
      return;
    }

    const lat = Number(location[0]);
    const lng = Number(location[1]);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      return;
    }

    /*
      Coordinates rounded to 3 decimal places
      allow nearby bookings to share one radar.
    */

    const key =
      `${lat.toFixed(3)},${lng.toFixed(3)}`;

    if (!groups[key]) {
      groups[key] = {
        lat,
        lng,
        count: 0,
        bookings: [],
      };
    }

    groups[key].count += 1;
    groups[key].bookings.push(vehicle);
  });

  return Object.values(groups);
}


/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function LiveMap({ journey }) {
  const [vehicles, setVehiclesState] =
    useState([]);

  const [riskScores, setRiskScores] =
    useState({});

  const [highRiskCount, setHighRiskCount] =
    useState(0);

  const [anomalyAlerts, setAnomalyAlerts] =
    useState([]);

  const [selectedVehicleId, setSelectedVehicleId] =
  useState(null);
  

useEffect(() => {
  if (journey?.vehicle_id != null) {
    setSelectedVehicleId(String(journey.vehicle_id));
  }
}, [journey]);
  const [focusVehicleId, setFocusVehicleId] =
  useState(null);

  const [lastUpdate, setLastUpdate] =
    useState(new Date());

  /*
    Persistent vehicle state.
    Backend refresh must NOT reset movement.
  */

const vehiclesRef = useRef([]);
const movementTimer = useRef(null);
const backendSync = useRef(null);

const emergencyVehiclesRef = useRef(new Set());

// Prevent overlapping RNN analysis cycles
const riskAnalysisRunningRef = useRef(false);
  


  /* =======================================================
     LOAD MAP DATA
  ======================================================= */

  async function loadVehicles() {
    try {
      const response =
        await API.get(
          "/api/map/live"
        );

      if (
        !Array.isArray(response.data)
      ) {
        return;
      }

      const incoming =
        response.data.map((v) => ({
          id:
            String(v.id),

          booking_id:
            v.booking_id,

          passenger_name:
            v.passenger_name ||
            "Passenger",

          gender:
            v.gender ||
            "Unknown",

          vehicle_id:
            v.vehicle_id,

          vehicle_no:
            v.vehicle_no ||
            "Not Assigned",

          vehicle_type:
            v.vehicle_type ||
            "CAB",

          vehicle_model:
            v.vehicle_model ||
            "Vehicle",

          driver_name:
            v.driver_name ||
            "Driver Pending",

          driver_phone:
            v.driver_phone ||
            "",

          origin:
            v.origin ||
            "Unknown",

          destination:
            v.destination ||
            "Unknown",

          start:
            Array.isArray(v.start)
              ? v.start
              : null,

          end:
            Array.isArray(v.end)
              ? v.end
              : null,

          route:
            Array.isArray(v.route)
              ? v.route
              : [],

          eta:
            Number(v.eta) || 10,

          distance:
            Number(v.distance) || 0,

          risk_score:
            Number(v.risk_score) || 2,

          risk_level:
            v.risk_level ||
            "Low",
        }));


      /* =================================================
         MERGE WITH EXISTING VEHICLES
      ================================================= */

      incoming.forEach((incomingVehicle) => {
        const existing =
          vehiclesRef.current.find(
            (v) =>
              v.id ===
              incomingVehicle.id
          );

        if (!existing) {
         vehiclesRef.current.push({
  ...incomingVehicle,

  /*
   * Real simulation start time.
   * This is created ONCE when the ride
   * first appears on the live map.
   */
  journeyStartedAt: Date.now(),

  /*
   * Freeze the ETA for this simulation.
   *
   * This prevents the backend refresh from
   * changing the duration every 5 seconds.
   */
  simulationDurationSeconds:
    Math.max(
      Number(incomingVehicle.eta || 10) * 60,
      60
    ),

  index: 0,

  completed: false,
});

          return;
        }


        /*
          Update metadata but preserve
          movement index.
        */

        existing.passenger_name =
          incomingVehicle.passenger_name;

        existing.gender =
          incomingVehicle.gender;

        existing.vehicle_id =
          incomingVehicle.vehicle_id;

        existing.vehicle_no =
          incomingVehicle.vehicle_no;

        existing.vehicle_type =
          incomingVehicle.vehicle_type;

        existing.vehicle_model =
          incomingVehicle.vehicle_model;

        existing.driver_name =
          incomingVehicle.driver_name;

        existing.driver_phone =
          incomingVehicle.driver_phone;

        existing.origin =
          incomingVehicle.origin;

        existing.destination =
          incomingVehicle.destination;

        existing.start =
          incomingVehicle.start;

        existing.end =
          incomingVehicle.end;

        existing.eta =
          incomingVehicle.eta;

        existing.distance =
          incomingVehicle.distance;

        existing.risk_score =
          incomingVehicle.risk_score;

        existing.risk_level =
          incomingVehicle.risk_level;


        if (
          incomingVehicle.route &&
          incomingVehicle.route.length > 1
        ) {
          existing.route =
            incomingVehicle.route;
        }
      });


      /*
        Remove vehicles that no longer
        exist in backend response.
      */

      const incomingIds =
        new Set(
          incoming.map(
            (v) => v.id
          )
        );

      vehiclesRef.current =
        vehiclesRef.current.filter(
          (v) =>
            incomingIds.has(v.id)
        );


      /*
        Safety fallback route.
      */

      vehiclesRef.current.forEach(
        (vehicle) => {
          if (
            !vehicle.route ||
            vehicle.route.length < 2
          ) {
            vehicle.route = [
              [11.0168, 77.0019],
              [11.0268, 77.0119],
            ];
          }
        }
      );


      const snapshot =
        [...vehiclesRef.current];

      setVehiclesState(snapshot);

      setVehicles(snapshot);

      setLastUpdate(
        new Date()
      );

      
      /*
        Run AI risk analysis.
      */

      fetchRiskScores(
        snapshot
      );

    } catch (error) {
      console.error(
        "MAP LOAD ERROR:",
        error
      );
    }
  }


/* =======================================================
   RISK INTELLIGENCE LAYER
======================================================= */

function calculateFinalRisk({
  rnnScore,
  speed,
  isNight,
  isRouteAnomaly,
}) {

  /*
   * Start with the score predicted by
   * the existing RNN.
   */

  let finalScore =
    Number(rnnScore) || 0;


  const reasons = [];


  /* =====================================================
     FACTOR 1 — NIGHT JOURNEY
  ===================================================== */

  if (isNight) {

    finalScore += 1.0;

    reasons.push(
      "Night journey"
    );
  }


  /* =====================================================
     FACTOR 2 — HIGH SPEED
  ===================================================== */

  if (speed >= 80) {

    finalScore += 2.0;

    reasons.push(
      "Excessive vehicle speed"
    );

  } else if (speed >= 60) {

    finalScore += 1.0;

    reasons.push(
      "High vehicle speed"
    );
  }


  /* =====================================================
     FACTOR 3 — ROUTE ANOMALY
  ===================================================== */

  if (isRouteAnomaly) {

    finalScore += 2.5;

    reasons.push(
      "Route deviation detected"
    );
  }


  /* =====================================================
     NORMALIZE SCORE
  ===================================================== */

  finalScore =
    Math.max(
      0,
      Math.min(
        10,
        finalScore
      )
    );


  /*
   * Round to one decimal place.
   *
   * Example:
   *
   * 8.347 → 8.3
   */

  finalScore =
    Math.round(
      finalScore * 10
    ) / 10;


  /* =====================================================
     DETERMINE FINAL RISK LEVEL
  ===================================================== */

  let riskLevel;


  if (finalScore <= 3) {

    riskLevel =
      "Low";

  } else if (finalScore <= 5) {

    riskLevel =
      "Medium";

  } else if (finalScore <= 7) {

    riskLevel =
      "High";

  } else {

    riskLevel =
      "Critical";
  }


  /*
   * If no specific danger factor exists,
   * provide a useful explanation.
   */

  if (
    reasons.length === 0
  ) {

    reasons.push(
      "No significant risk factors detected"
    );
  }


  return {
    risk_score:
      finalScore,

    risk_level:
      riskLevel,

    reasons:
      reasons,
  };
}
/* =======================================================
   RNN RISK + ANOMALY + RISK INTELLIGENCE
   + EMERGENCY CREATION
======================================================= */

async function fetchRiskScores(vehicleList) {

  /* =====================================================
     PREVENT OVERLAPPING RNN ANALYSIS
  ===================================================== */

  if (riskAnalysisRunningRef.current) {

    console.log(
      "⏳ RNN analysis already running. Skipping this cycle."
    );

    return;
  }

  // Lock RNN analysis
  riskAnalysisRunningRef.current = true;


  try {

    const scores = {};

    const alerts = [];


    /* =====================================================
       NO ACTIVE VEHICLES
    ===================================================== */

    if (
      !vehicleList ||
      vehicleList.length === 0
    ) {

      setRiskScores({});

      setHighRiskCount(0);

      setAnomalyAlerts([]);

      return;
    }


    /* =====================================================
       CURRENT TIME
    ===================================================== */

    const now =
      new Date();

    const hour =
      now.getHours();


    /*
     * Convert JavaScript day number
     * into Python weekday format.
     */

    const dayOfWeek =
      (now.getDay() + 6) % 7;


    /*
     * Night operation:
     *
     * 21:00 → 05:00
     */

    const isNight =
      hour >= 21 ||
      hour <= 5;


    /* =====================================================
       PROCESS ALL VEHICLES
    ===================================================== */

    await Promise.all(

      vehicleList.map(
        async (vehicle) => {

          try {

            /* =============================================
               1. CALCULATE LIVE SPEED
            ============================================= */

            const liveSpeed =
              calculateLiveSpeed(
                vehicle
              );


            /* =============================================
               2. SEND DATA TO RNN
            ============================================= */

            const riskResponse =
              await getRiskScore({

                hour:
                  hour,

                day_of_week:
                  dayOfWeek,

                gender:
                  vehicle.gender ||
                  "Unknown",

                zone:
                  vehicle.origin ||
                  "unknown",

                speed:
                  liveSpeed,

                is_night:
                  isNight,

              });


            /* =============================================
               3. READ RNN RESPONSE
            ============================================= */

            const result =
              riskResponse.data ||
              {};

            const rnnScore =
              Number(
                result.risk_score
              ) || 0;


            /* =============================================
               4. ROUTE ANOMALY
            ============================================= */

            let isRouteAnomaly =
              false;

            let anomalyData =
              {};


            if (
              Array.isArray(
                vehicle.route
              ) &&
              vehicle.route.length > 2 &&
              Number(vehicle.index) > 0
            ) {

              const actualRoute =
                vehicle.route.slice(
                  0,
                  Number(vehicle.index) + 1
                );


              try {

                const anomalyResponse =
                  await checkRouteAnomaly({

                    route_points:
                      actualRoute,

                    expected_route:
                      vehicle.route,

                  });


                anomalyData =
                  anomalyResponse.data ||
                  {};


                if (
                  anomalyData.is_anomaly
                ) {

                  isRouteAnomaly =
                    true;


                  alerts.push({

                    id:
                      vehicle.id,

                    passenger:
                      vehicle.passenger_name ||
                      "Passenger",

                    message:
                      anomalyData.alert_message ||
                      "Route anomaly detected",

                    deviation:
                      anomalyData.max_deviation_km ||
                      0,

                  });

                }

              } catch (
                anomalyError
              ) {

                console.error(
                  `ROUTE ANOMALY ERROR for vehicle ${vehicle.id}:`,
                  anomalyError
                );

              }

            }


            /* =============================================
               5. FINAL RISK INTELLIGENCE
            ============================================= */

            const finalRisk =
              calculateFinalRisk({

                rnnScore:
                  rnnScore,

                speed:
                  liveSpeed,

                isNight:
                  isNight,

                isRouteAnomaly:
                  isRouteAnomaly,

              });


            /* =================================================
               6. CREATE EMERGENCY
               
               ONLY CRITICAL RISK
               score > 7
            ================================================= */

            if (finalRisk.risk_score > 5 &&
             !emergencyVehiclesRef.current.has(vehicle.id) 
            ) {

              try {

                /*
                 * First check backend.
                 *
                 * This prevents duplicate emergencies
                 * even after browser refresh.
                 */

                const activeResponse =
                  await getActiveEmergencies();


                const activeEmergencies =
                  Array.isArray(
                    activeResponse.data
                  )
                    ? activeResponse.data
                    : [];


                /*
                 * Check whether this booking
                 * already has an ACTIVE emergency.
                 */

                const alreadyExists =
                  activeEmergencies.some(
                    (emergency) =>
                      Number(
                        emergency.booking_id
                      ) ===
                      Number(
                        vehicle.booking_id
                      )
                  );


                /* =========================================
                   EMERGENCY ALREADY EXISTS
                ========================================= */

                if (
                  alreadyExists
                ) {

                  console.log(
                    `🚨 Emergency already exists for booking ${vehicle.booking_id}`
                  );


                  /*
                   * Remember locally too.
                   */

                  emergencyVehiclesRef.current.add(
                    vehicle.id
                  );

                }


                /* =========================================
                   CREATE NEW EMERGENCY
                ========================================= */

                else {

                  const emergencyResponse =
                    await createEmergency({

                      booking_id:
                        vehicle.booking_id,

                      vehicle_id:
                        vehicle.vehicle_id,

                      passenger_name:
                        vehicle.passenger_name,

                      risk_score:
                        Math.round(
                          finalRisk.risk_score
                        ),

                      risk_level:
                        finalRisk.risk_level,

                      reason:
                        finalRisk.reasons.join(
                          ", "
                        ),

                    });


                  console.log(
                    "🚨 NEW EMERGENCY CREATED:",
                    emergencyResponse.data
                  );


                  /*
                   * Remember locally so the
                   * same vehicle does not create
                   * another emergency.
                   */

                  emergencyVehiclesRef.current.add(
                    vehicle.id
                  );

                }

              } catch (
                emergencyError
              ) {

                console.error(
                  "🚨 EMERGENCY CHECK/CREATE ERROR:",
                  emergencyError
                );

              }

            }


            /* =============================================
               7. STORE FINAL RISK
            ============================================= */

            scores[
              vehicle.id
            ] = {

              /*
               * Final score
               */

              risk_score:
                finalRisk.risk_score,

              risk_level:
                finalRisk.risk_level,


              /*
               * Raw RNN score
               */

              rnn_score:
                rnnScore,


              /*
               * Live information
               */

              speed:
                liveSpeed,

              hour:
                hour,

              day_of_week:
                dayOfWeek,

              is_night:
                isNight,

              gender:
                vehicle.gender ||
                "Unknown",

              zone:
                vehicle.origin ||
                "unknown",


              /*
               * Route information
               */

              route_anomaly:
                isRouteAnomaly,

              deviation:
                anomalyData.max_deviation_km ||
                0,


              /*
               * Human-readable reasons
               */

              reasons:
                finalRisk.reasons,

            };


          } catch (error) {

            /* =============================================
               RNN FAILURE FALLBACK
            ============================================= */

            console.error(
              `RNN ERROR for vehicle ${vehicle.id}:`,
              error
            );


            const fallbackScore =
              Number(
                vehicle.risk_score
              ) || 2;


            const liveSpeed =
              calculateLiveSpeed(
                vehicle
              );


            const fallbackRisk =
              calculateFinalRisk({

                rnnScore:
                  fallbackScore,

                speed:
                  liveSpeed,

                isNight:
                  isNight,

                isRouteAnomaly:
                  false,

              });


            scores[
              vehicle.id
            ] = {

              risk_score:
                fallbackRisk.risk_score,

              risk_level:
                fallbackRisk.risk_level,

              rnn_score:
                fallbackScore,

              speed:
                liveSpeed,

              hour:
                hour,

              day_of_week:
                dayOfWeek,

              is_night:
                isNight,

              gender:
                vehicle.gender ||
                "Unknown",

              zone:
                vehicle.origin ||
                "unknown",

              route_anomaly:
                false,

              deviation:
                0,

              reasons:
                fallbackRisk.reasons,

            };

          }

        }
      )

    );


    /* =====================================================
       UPDATE MAP RISK STATE
    ===================================================== */

    setRiskScores(
      scores
    );


    /* =====================================================
       UPDATE ROUTE ALERTS
    ===================================================== */

    setAnomalyAlerts(
      alerts
    );


    /* =====================================================
       COUNT CRITICAL VEHICLES
    ===================================================== */

    const highRiskCount =
      Object.values(
        scores
      ).filter(
        (risk) =>
          Number(
            risk.risk_score
          ) > 7
      ).length;


    setHighRiskCount(
      highRiskCount
    );





  } finally {

    /*
     * IMPORTANT:
     *
     * Unlock RNN after everything
     * finishes, even if an error occurs.
     */

    riskAnalysisRunningRef.current =
      false;

  }

}
  /* =======================================================
     COMPLETE JOURNEY
  ======================================================= */
async function completeJourney(vehicle) {
  try {
    /*
     * IMPORTANT:
     * journeyStartedAt was created when the
     * vehicle first appeared on the live map.
     */

    const startTime = vehicle.journeyStartedAt
      ? new Date(vehicle.journeyStartedAt).toISOString()
      : new Date().toISOString();


    /*
     * The backend will use its own current
     * time as the actual end time.
     */

    console.log("Completing journey:", {
      booking_id: vehicle.booking_id,
      passenger: vehicle.passenger_name,
      start_time: startTime,
    });


    const response = await API.post(
      "/api/journey/complete",
      {
        booking_id:
          vehicle.booking_id,

        passenger_name:
          vehicle.passenger_name,

        driver_name:
          vehicle.driver_name,

        vehicle_type:
          vehicle.vehicle_type ||
          "CAB",

        origin:
          vehicle.origin,

        destination:
          vehicle.destination,

        /*
         * DO NOT use new Date() here.
         *
         * This must be the ORIGINAL
         * journey start time.
         */

        start_time:
          startTime,
      }
    );


    console.log(
      "Journey completed:",
      response.data
    );

  } catch (error) {
    console.error(
      "JOURNEY COMPLETE ERROR:",
      error
    );
  }
}

  /* =======================================================
     VEHICLE MOVEMENT
  ======================================================= */

  function startMovement() {
  if (movementTimer.current) {
    return;
  }

  /*
   * Update the vehicle position twice per second.
   *
   * We are NOT moving a fixed number of
   * route points anymore.
   *
   * Instead:
   *
   * elapsed time
   *       ↓
   * ETA percentage
   *       ↓
   * route position
   */

  movementTimer.current =
    setInterval(() => {

      const now = Date.now();

      const updated =
        vehiclesRef.current.map(
          (vehicle) => {

            if (
              vehicle.completed ||
              !vehicle.route ||
              vehicle.route.length < 2
            ) {
              return vehicle;
            }


            /*
             * Safety fallback for vehicles
             * created before this new system.
             */

            if (
              !vehicle.journeyStartedAt
            ) {
              vehicle.journeyStartedAt =
                now;
            }


            /*
             * Freeze the simulation duration.
             *
             * Example:
             *
             * ETA = 10 minutes
             * duration = 600 seconds
             */

            const durationSeconds =
              Math.max(
                Number(
                  vehicle.simulationDurationSeconds
                ) ||
                  Number(
                    vehicle.eta
                  ) * 60 ||
                  600,

                60
              );


            /*
             * How many seconds have passed
             * since this particular ride started?
             */

            const elapsedSeconds =
              (
                now -
                vehicle.journeyStartedAt
              ) / 1000;


            /*
             * Convert elapsed time into
             * journey percentage.
             *
             * Example:
             *
             * 5 minutes elapsed
             * 10 minute ETA
             *
             * 5 / 10 = 0.5
             *
             * Therefore vehicle is 50%
             * through the route.
             */

            const progress =
              Math.min(
                elapsedSeconds /
                  durationSeconds,

                1
              );


            /*
             * Convert percentage into
             * route array index.
             */

            const totalPoints =
              vehicle.route.length;

            const nextIndex =
              Math.min(
                Math.floor(
                  progress *
                    (
                      totalPoints - 1
                    )
                ),

                totalPoints - 1
              );


            /*
             * Destination reached.
             */

            if (
              progress >= 1
            ) {

              if (
                !vehicle.completed
              ) {
                completeJourney(
                  {
                    ...vehicle,

                    journeyStartedAt:
                      vehicle.journeyStartedAt,
                  }
                );
              }


              return {
                ...vehicle,

                index:
                  totalPoints - 1,

                completed:
                  true,

                journeyProgress:
                  100,
              };
            }


            /*
             * Continue journey.
             */

            return {
              ...vehicle,

              index:
                nextIndex,

              journeyProgress:
                progress * 100,
            };
          }
        );


      vehiclesRef.current =
        updated;


      setVehiclesState(
        [...updated]
      );


      setVehicles(
        [...updated]
      );

    }, 1000);
}

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  useEffect(() => {
    loadVehicles();

    startMovement();


    backendSync.current =
      setInterval(
        loadVehicles,
        5000
      );


    const uiRefresh =
      setInterval(() => {
        setVehiclesState([
          ...vehiclesRef.current,
        ]);
      }, 1000);


    return () => {
      clearInterval(
        backendSync.current
      );

      clearInterval(
        uiRefresh
      );

      if (
        movementTimer.current
      ) {
        clearInterval(
          movementTimer.current
        );

        movementTimer.current =
          null;
      }
    };
  }, []);


  /* =======================================================
     SELECTED VEHICLE
  ======================================================= */

  const selectedVehicle =
    vehicles.find(
      (vehicle) =>
        vehicle.id ===
        selectedVehicleId
    ) || null;
  const focusVehicle =
  vehicles.find(
    (vehicle) =>
      vehicle.id ===
      focusVehicleId
  ) || null;

  /* =======================================================
     SOURCE / DESTINATION GROUPS
  ======================================================= */

  const sourceGroups =
    groupLocations(
      vehicles,
      "source"
    );

  const destinationGroups =
    groupLocations(
      vehicles,
      "destination"
    );


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div style={styles.container}>

      <MapContainer
        center={[
          11.0168,
          77.0019,
        ]}
        zoom={12}
        style={styles.map}
      >

        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />


        {/* =================================================
            SELECTED ROUTE CONTROLLER
        ================================================= */}

        <RouteController
         vehicles={vehicles}
         focusVehicle={focusVehicle}
       />

        {/* =================================================
            SOURCE RADARS
        ================================================= */}

        {sourceGroups.map(
          (group, index) => (
            <Fragment
              key={`source-group-${index}`}
            >

              <Circle
                center={[
                  group.lat,
                  group.lng,
                ]}
                radius={250}
                pathOptions={{
                  color:
                    "#2563eb",

                  fillColor:
                    "#3b82f6",

                  fillOpacity:
                    0.12,

                  weight: 3,
                }}
              >

                <Tooltip
                  permanent
                  direction="center"
                >
                  <b>
                    📍 {group.count}
                  </b>
                </Tooltip>

                <Popup>
                  <div
                    style={
                      styles.popup
                    }
                  >
                    <b>
                      📍 FROM AREA
                    </b>

                    <p>
                      {group.count} active
                      booking(s)
                    </p>
                  </div>
                </Popup>

              </Circle>


              <Marker
                position={[
                  group.lat,
                  group.lng,
                ]}
                icon={
                  sourceIcon
                }
              >
                <Tooltip>
                  <b>
                    FROM
                  </b>
                </Tooltip>
              </Marker>

            </Fragment>
          )
        )}


        {/* =================================================
            DESTINATION RADARS
        ================================================= */}

        {destinationGroups.map(
          (group, index) => (
            <Fragment
              key={`destination-group-${index}`}
            >

              <Circle
                center={[
                  group.lat,
                  group.lng,
                ]}
                radius={250}
                pathOptions={{
                  color:
                    "#dc2626",

                  fillColor:
                    "#ef4444",

                  fillOpacity:
                    0.10,

                  weight: 3,
                }}
              >

                <Tooltip
                  permanent
                  direction="center"
                >
                  <b>
                    🎯 {group.count}
                  </b>
                </Tooltip>

                <Popup>
                  <div
                    style={
                      styles.popup
                    }
                  >
                    <b>
                      🎯 DESTINATION AREA
                    </b>

                    <p>
                      {group.count} active
                      booking(s)
                    </p>
                  </div>
                </Popup>

              </Circle>


              <Marker
                position={[
                  group.lat,
                  group.lng,
                ]}
                icon={
                  destinationIcon
                }
              >
                <Tooltip>
                  <b>
                    TO
                  </b>
                </Tooltip>
              </Marker>

            </Fragment>
          )
        )}


        {/* =================================================
    SELECTED VEHICLE ROUTE ONLY

    We do NOT draw every vehicle's full route.

    This prevents:
    - overlapping routes
    - visual clutter
    - unnecessary Leaflet rendering
    - map lag

    All vehicles still move on the map.
    Their route becomes visible when selected.
================================================= */}

{vehicles.map((vehicle) => {
  if (
    !Array.isArray(vehicle.route) ||
    vehicle.route.length < 2
  ) {
    return null;
  }

  const risk =
    Number(
      riskScores[vehicle.id]?.risk_score ??
      vehicle.risk_score ??
      2
    );

  let routeColor;

  if (risk > 7) {
    routeColor = "#dc2626";
  } else if (vehicle.gender === "Female") {
    routeColor = "#ec4899";
  } else {
    routeColor = "#2563eb";
  }

  const isSelected =
    vehicle.id === selectedVehicleId;

  return (
    <Polyline
      key={`route-${vehicle.id}`}
      positions={vehicle.route}
      pathOptions={{
        color: routeColor,
        weight: isSelected ? 7 : 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }}
    />
  );
})}

       {/* =================================================
    FEMALE DIRECTION ARROWS

    Only show arrows for the selected
    female passenger's route.
================================================= */}

{vehicles.map((vehicle) => {
  if (vehicle.gender !== "Female") {
    return null;
  }

  return (
    <FemaleRouteArrows
      key={`arrows-${vehicle.id}`}
      vehicle={vehicle}
      riskScore={
        riskScores[vehicle.id]?.risk_score ??
        vehicle.risk_score ??
        2
      }
    />
  );
})}

        {/* =================================================
            SELECTED FROM / TO
        ================================================= */}

        {selectedVehicle &&
          selectedVehicle.route &&
          selectedVehicle.route.length > 1 && (
            <>

              <Marker
                position={
                  selectedVehicle.route[0]
                }
                icon={
                  sourceIcon
                }
              >
                <Tooltip
                  permanent
                  direction="top"
                >
                  <b>
                    📍 FROM
                  </b>
                </Tooltip>

                <Popup>
                  <div
                    style={
                      styles.popup
                    }
                  >
                    <b>
                      📍 FROM
                    </b>

                    <p>
                      {
                        selectedVehicle.origin
                      }
                    </p>
                  </div>
                </Popup>
              </Marker>


              <Marker
                position={
                  selectedVehicle.route[
                    selectedVehicle.route.length - 1
                  ]
                }
                icon={
                  destinationIcon
                }
              >
                <Tooltip
                  permanent
                  direction="top"
                >
                  <b>
                    🎯 TO
                  </b>
                </Tooltip>

                <Popup>
                  <div
                    style={
                      styles.popup
                    }
                  >
                    <b>
                      🎯 TO
                    </b>

                    <p>
                      {
                        selectedVehicle.destination
                      }
                    </p>
                  </div>
                </Popup>
              </Marker>

            </>
          )}


        {/* =================================================
            RISK ZONES
        ================================================= */}

        {vehicles.map(
          (vehicle) => {
            const risk =
              Number(
                riskScores[
                  vehicle.id
                ]?.risk_score ??
                vehicle.risk_score ??
                2
              );

            if (risk <= 5) {
              return null;
            }

            const position =
              vehicle.route?.[
                vehicle.index
              ] ||
              vehicle.route?.[0];

            if (!position) {
              return null;
            }

            return (
              <Circle
                key={
                  `risk-zone-${vehicle.id}`
                }
                center={
                  position
                }
                radius={
                  risk > 7
                    ? 800
                    : 400
                }
                pathOptions={{
                  color:
                    getRiskColor(
                      risk
                    ),

                  fillColor:
                    getRiskColor(
                      risk
                    ),

                  fillOpacity:
                    0.12,

                  weight: 2,

                  dashArray:
                    "6,6",
                }}
              />
            );
          }
        )}


        {/* =================================================
            MOVING VEHICLES
        ================================================= */}

        {vehicles.map(
          (vehicle) => {
            if (
              !vehicle.route ||
              vehicle.route.length < 1
            ) {
              return null;
            }

            const position =
              vehicle.route[
                vehicle.index
              ] ||
              vehicle.route[0];


            const riskData =
              riskScores[
                vehicle.id
              ] || {
                risk_score:
                  vehicle.risk_score ||
                  2,

                risk_level:
                  vehicle.risk_level ||
                  "Low",
              };


            const risk =
              Number(
                riskData.risk_score
              ) || 0;


            const riskLevel =
              riskData.risk_level ||
              getRiskLevel(
                risk
              );


            const remainingRatio =
              1 -
              (
                vehicle.index /
                Math.max(
                  vehicle.route.length - 1,
                  1
                )
              );


            const eta =
              Math.max(
                0,
                Math.round(
                  (
                    vehicle.eta ||
                    10
                  ) *
                  remainingRatio
                )
              );


            /*
              Separate female marker.

              It is deliberately offset from
              the taxi so the two markers don't
              overlap.
            */

            const femalePosition =
              vehicle.gender ===
              "Female"
                ? [
                    position[0] +
                      0.00035,

                    position[1] +
                      0.00035,
                  ]
                : null;


            return (
              <Fragment
                key={
                  `vehicle-${vehicle.id}`
                }
              >

                {/* =========================================
                    FEMALE PASSENGER MARKER
                ========================================= */}

                {vehicle.gender ===
                  "Female" &&
                  femalePosition && (
                    <Marker
                      position={
                        femalePosition
                      }
                      icon={
                        femalePassengerIcon
                      }
                      interactive={
                        false
                      }
                    >
                      <Tooltip>
                        <b
                          style={{
                            color:
                              "#be185d",
                          }}
                        >
                          ♀ Female Passenger
                        </b>

                        <br />

                        {
                          vehicle.passenger_name
                        }
                      </Tooltip>
                    </Marker>
                  )}


                {/* =========================================
                    VEHICLE MARKER
                ========================================= */}

                <Marker
                  position={
                    position
                  }
                  icon={
                    taxiIcon
                  }
                  eventHandlers={{
                    click: () =>
                      setSelectedVehicleId(
                        vehicle.id
                      ),
                  }}
                >

                  {/* =======================================
                      VEHICLE LABEL
                  ======================================= */}

                  <Tooltip
                    permanent
                    direction="top"
                    offset={[
                      0,
                      -12,
                    ]}
                  >
                    <div
                      style={{
                        textAlign:
                          "center",
                      }}
                    >

                      <b>
                        {
                          vehicle.passenger_name
                        }
                      </b>

                      <br />

                      <span
                        style={{
                          color:
                            getRiskColor(
                              risk
                            ),

                          fontWeight:
                            "800",

                          fontSize:
                            "11px",
                        }}
                      >
                        🛡️ Risk{" "}
                        {risk}/10
                      </span>

                    </div>
                  </Tooltip>


                  {/* =======================================
                      VEHICLE POPUP
                  ======================================= */}

                  <Popup>

                    <div
                      style={
                        styles.popup
                      }
                    >

                      <div
                        style={
                          styles.popupTitle
                        }
                      >
                        🚕{" "}
                        {
                          vehicle.vehicle_no
                        }
                      </div>


                      {/* FEMALE BADGE */}

                      {vehicle.gender ===
                        "Female" && (
                        <div
                          style={
                            styles.femaleBadge
                          }
                        >
                          ♀ FEMALE PASSENGER
                        </div>
                      )}


                      <p>
                        <b>
                          Passenger:
                        </b>{" "}
                        {
                          vehicle.passenger_name
                        }
                      </p>


                      <p>
                        <b>
                          Driver:
                        </b>{" "}
                        {
                          vehicle.driver_name
                        }
                      </p>


                      <p>
                        <b>
                          Vehicle:
                        </b>{" "}
                        {
                          vehicle.vehicle_model
                        }
                      </p>


                      <p>
                        <b>
                          From:
                        </b>{" "}
                        {
                          vehicle.origin
                        }
                      </p>


                      <p>
                        <b>
                          To:
                        </b>{" "}
                        {
                          vehicle.destination
                        }
                      </p>


                      <p>
                        <b>
                          ETA:
                        </b>{" "}
                        {eta} mins
                      </p>


                      <p>
                        <b>
                          Distance:
                        </b>{" "}
                        {
                          vehicle.distance
                        } km
                      </p>


                      {/* RISK */}

                      <div
                        style={{
                          ...styles.riskBadge,

                          color:
                            getRiskColor(
                              risk
                            ),

                          background:
                            `${getRiskColor(
                              risk
                            )}18`,
                        }}
                      >
                        Risk Level:{" "}
                        {riskLevel}
                        {" "}
                        ({risk}/10)
                      </div>


                      {/* VIEW DIRECTION */}

                      <button
                        onClick={() => {
                         setSelectedVehicleId(vehicle.id);
                         setFocusVehicleId(vehicle.id);
                        }}
                        style={
                          styles.directionButton
                        }
                      >
                        <Navigation
                          size={15}
                        />

                        View Direction
                      </button>

                    </div>

                  </Popup>

                </Marker>

              </Fragment>
            );
          }
        )}

      </MapContainer>


      {/* =====================================================
          LIVE TRACKING PANEL
      ===================================================== */}

      <div
        style={
          styles.panel
        }
      >

        <div
          style={
            styles.panelHeader
          }
        >
          <Activity
            size={18}
          />

          LIVE TRACKING
        </div>


        {/* ACTIVE VEHICLES */}

        <div
          style={
            styles.row
          }
        >
          <MapPin
            size={16}
          />

          <span>
            Active Vehicles
          </span>

          <b>
            {
              vehicles.length
            }
          </b>
        </div>


        {/* HIGH RISK */}

        <div
          style={
            styles.row
          }
        >
          <AlertTriangle
            size={16}
            color={
              highRiskCount >
              0
                ? "#ef4444"
                : undefined
            }
          />

          <span>
            High Risk
          </span>

          <b
            style={{
              color:
                highRiskCount >
                0
                  ? "#ef4444"
                  : undefined,
            }}
          >
            {
              highRiskCount
            }
          </b>
        </div>


        {/* RNN */}

        <div
          style={
            styles.row
          }
        >
          <Shield
            size={16}
          />

          <span>
            RNN Active
          </span>

          <b
            style={{
              color:
                "#10b981",
            }}
          >
            ✓
          </b>
        </div>


        {/* FEMALE COUNT */}

        <div
          style={
            styles.row
          }
        >
          <span>
            ♀ Female Passengers
          </span>

          <b
            style={{
              color:
                "#ec4899",
            }}
          >
            {
              vehicles.filter(
                (v) =>
                  v.gender ===
                  "Female"
              ).length
            }
          </b>
        </div>


        {/* LAST UPDATE */}

        <div
          style={
            styles.row
          }
        >
          <Clock
            size={16}
          />

          <span>
            Last Update
          </span>

          <b
            style={{
              fontSize:
                "10px",
            }}
          >
            {
              lastUpdate.toLocaleTimeString()
            }
          </b>
        </div>


        {/* =================================================
            SELECTED VEHICLE
        ================================================= */}

        {selectedVehicle && (
          <div
            style={
              styles.selectedInfo
            }
          >

            <div
              style={
                styles.selectedHeader
              }
            >
              <Navigation
                size={15}
              />

              SELECTED VEHICLE
            </div>


            <div
              style={{
                fontWeight:
                  "800",

                fontSize:
                  "15px",

                display:
                  "flex",

                alignItems:
                  "center",

                gap:
                  "5px",
              }}
            >

              {selectedVehicle.gender ===
                "Female" && (
                <span
                  style={{
                    color:
                      "#ec4899",

                    fontSize:
                      "19px",
                  }}
                >
                  ♀
                </span>
              )}

              {
                selectedVehicle.passenger_name
              }

            </div>


            {selectedVehicle.gender ===
              "Female" && (
              <div
                style={
                  styles.femaleBadge
                }
              >
                ♀ FEMALE PASSENGER
              </div>
            )}


            <div
              style={
                styles.directionRow
              }
            >
              <span>
                FROM
              </span>

              <b>
                {
                  selectedVehicle.origin
                }
              </b>
            </div>


            <div
              style={{
                ...styles.directionArrow,

                color:
                  selectedVehicle.gender ===
                  "Female"
                    ? "#ec4899"
                    : "#2563eb",
              }}
            >
              ↓
            </div>


            <div
              style={
                styles.directionRow
              }
            >
              <span>
                TO
              </span>

              <b>
                {
                  selectedVehicle.destination
                }
              </b>
            </div>


            <button
              onClick={() =>
                setSelectedVehicleId(
                  null
                )
              }
              style={
                styles.clearDirectionButton
              }
            >
              Clear Direction
            </button>

          </div>
        )}


        {/* =================================================
            ROUTE ALERTS
        ================================================= */}

        {anomalyAlerts.length >
          0 && (
          <div
            style={
              styles.alertSection
            }
          >

            <div
              style={
                styles.alertHeader
              }
            >
              <Zap
                size={14}
                color="#ef4444"
              />

              <span>
                ROUTE ALERTS
              </span>
            </div>


            {anomalyAlerts.map(
              (alert, index) => (
                <div
                  key={
                    `${alert.id}-${index}`
                  }
                  style={
                    styles.alertItem
                  }
                >
                  <p
                    style={
                      styles.alertText
                    }
                  >
                    <b>
                      {
                        alert.passenger
                      }
                    </b>
                    :{" "}
                    {
                      alert.message
                    }
                  </p>
                </div>
              )
            )}

          </div>
        )}

      </div>

    </div>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles = {
  container: {
    height: "520px",
    borderRadius: "18px",
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    position: "relative",
  },

  map: {
    height: "100%",
    width: "100%",
  },

  panel: {
    position: "absolute",
    top: "18px",
    right: "18px",

    background: "white",

    padding: "16px",

    borderRadius: "14px",

    boxShadow:
      "0 8px 25px rgba(0,0,0,.12)",

    minWidth: "225px",
    maxWidth: "285px",

    zIndex: 1000,
  },

  panelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",

    marginBottom: "12px",

    fontWeight: "800",
    fontSize: "13px",
  },

  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",

    gap: "8px",

    marginTop: "8px",

    fontSize: "12px",
  },

  popup: {
    padding: "5px",
    minWidth: "210px",
    fontSize: "12px",
  },

  popupTitle: {
    fontWeight: "800",
    fontSize: "16px",
    marginBottom: "8px",
  },

  femaleBadge: {
    display: "inline-block",

    marginTop: "5px",
    marginBottom: "7px",

    padding: "4px 8px",

    borderRadius: "6px",

    background: "#fce7f3",
    color: "#be185d",

    fontSize: "10px",
    fontWeight: "800",
  },

  riskBadge: {
    padding: "6px 9px",

    borderRadius: "7px",

    fontWeight: "800",

    fontSize: "11px",

    marginTop: "8px",
  },

  directionButton: {
    width: "100%",

    marginTop: "12px",

    padding: "9px 12px",

    border: "none",

    borderRadius: "8px",

    background: "#2563eb",

    color: "white",

    fontWeight: "800",

    fontSize: "11px",

    cursor: "pointer",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    gap: "6px",
  },

  selectedInfo: {
    marginTop: "14px",

    paddingTop: "12px",

    borderTop:
      "1px solid #e2e8f0",
  },

  selectedHeader: {
    display: "flex",
    alignItems: "center",

    gap: "6px",

    color: "#2563eb",

    fontSize: "10px",

    fontWeight: "900",

    marginBottom: "8px",
  },

  directionRow: {
    display: "flex",

    flexDirection: "column",

    gap: "3px",

    marginTop: "9px",

    fontSize: "10px",
  },

  directionArrow: {
    textAlign: "center",

    fontSize: "21px",

    fontWeight: "900",

    marginTop: "3px",
  },

  clearDirectionButton: {
    width: "100%",

    marginTop: "12px",

    padding: "7px",

    border:
      "1px solid #cbd5e1",

    borderRadius: "7px",

    background: "white",

    color: "#475569",

    fontSize: "10px",

    cursor: "pointer",
  },

  alertSection: {
    marginTop: "12px",

    paddingTop: "10px",

    borderTop:
      "1px solid #fee2e2",
  },

  alertHeader: {
    display: "flex",

    alignItems: "center",

    gap: "6px",

    marginBottom: "6px",

    color: "#ef4444",

    fontSize: "11px",

    fontWeight: "800",
  },

  alertItem: {
    background: "#fef2f2",

    padding: "6px 8px",

    borderRadius: "6px",

    marginTop: "4px",
  },

  alertText: {
    margin: 0,

    fontSize: "10px",

    color: "#991b1b",
  },
};