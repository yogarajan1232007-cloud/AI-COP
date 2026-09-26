import React, { useEffect, useState } from "react";

import API, {
  getDashboardStats,
  getJourneys,
  getActiveEmergencies,
  takeEmergencyAction,
} from "../api";

import LiveMap from "../components/LiveMap";

const PoliceDashboard = () => {

  // ============================================
  // DASHBOARD STATS
  // ============================================

  const [stats, setStats] = useState({
    active_journeys: 0,
    high_risk: 0,
    emergencies: 0,
    autos: 0,
    cabs: 0,
    bikes: 0,
  });


  // ============================================
  // JOURNEYS
  // ============================================

  const [journeys, setJourneys] = useState([]);
  const [history, setHistory] = useState([]);


  // ============================================
  // EMERGENCIES
  // ============================================

  const [emergencies, setEmergencies] = useState([]);


  // ============================================
  // ACTION LOADING
  // ============================================

  const [actionLoading, setActionLoading] = useState(null);


  // ============================================
  // MAP STATE
  // ============================================

  const [selectedJourney, setSelectedJourney] = useState(null);

  const [showMap, setShowMap] = useState(false);


  // ============================================
  // FETCH DASHBOARD DATA
  // ============================================

  const fetchData = async () => {

    try {

      const [
       statsRes,
       journeysRes,
       emergenciesRes,
       historyRes,
      ] = await Promise.all([

       getDashboardStats(),

      getJourneys(),

      getActiveEmergencies(),

      API.get("/api/journey/history"),

    ]);

      setStats(statsRes.data);

      setJourneys(journeysRes.data);

      setEmergencies(emergenciesRes.data);

      setHistory(historyRes.data || []);


    } catch (error) {

      console.error(
        "Dashboard fetch error:",
        error
      );

    }

  };


  // ============================================
  // AUTO REFRESH
  // ============================================

  useEffect(() => {

    fetchData();


    const interval = setInterval(
      fetchData,
      5000
    );


    return () =>
      clearInterval(interval);

  }, []);


  // ============================================
  // VIEW JOURNEY ON MAP
  // ============================================

  const handleViewMap = (journey) => {

    console.log(
      "Opening journey on map:",
      journey
    );


    setSelectedJourney(journey);

    setShowMap(true);

  };


  // ============================================
  // CLOSE MAP
  // ============================================

  const handleCloseMap = () => {

    setShowMap(false);

    setSelectedJourney(null);

  };


  // ============================================
  // OFFICER EMERGENCY ACTION
  // ============================================

  const handleEmergencyAction = async (
    emergencyId,
    action
  ) => {

    try {

      setActionLoading(
        `${emergencyId}-${action}`
      );


      await takeEmergencyAction(
        emergencyId,
        action
      );


      // Refresh immediately
      await fetchData();


    } catch (error) {

      console.error(
        "Emergency action error:",
        error
      );


      alert(
        "Failed to perform emergency action."
      );


    } finally {

      setActionLoading(null);

    }

  };

    // ============================================
  // DASHBOARD UI
  // ============================================

  return (

    <div className="p-6 bg-slate-50 min-h-screen">


      {/* ========================================= */}
      {/* PAGE HEADER */}
      {/* ========================================= */}

      <div className="mb-8">

        <h1 className="text-2xl font-bold text-slate-800">
          Police Control Dashboard
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          Real-time monitoring and emergency response
        </p>

      </div>


      {/* ========================================= */}
      {/* TOP STAT CARDS */}
      {/* ========================================= */}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">


        <StatCard
          title="Active Journeys"
          value={stats.active_journeys}
          icon="📈"
        />


        <StatCard
          title="Autos"
          value={stats.autos}
          icon="🚕"
          color="text-yellow-500"
        />


        <StatCard
          title="Cabs"
          value={stats.cabs}
          icon="🚗"
          color="text-blue-500"
        />


        <StatCard
          title="Bikes"
          value={stats.bikes}
          icon="🏍️"
          color="text-red-500"
        />


        <StatCard
          title="High Risk"
          value={stats.high_risk}
          icon="⚠️"
          color="text-red-600"
          alert
        />


        <StatCard
          title="Emergencies"
          value={stats.emergencies}
          icon="🛡️"
          color="text-red-600"
          alert
        />

      </div>
            {/* ========================================= */}
      {/* EMERGENCY COLUMN */}
      {/* ========================================= */}

      <div className="bg-white rounded-xl shadow-sm border border-red-200 mb-8">


        {/* HEADER */}

        <div className="p-6 border-b border-red-100 bg-red-50 rounded-t-xl">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-xl font-bold text-red-700">
                🚨 Emergency Column
              </h2>

              <p className="text-sm text-red-600 mt-1">
                High-risk situations requiring officer attention
              </p>

            </div>


            <div className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold">

              {emergencies.length} Active

            </div>

          </div>

        </div>


        {/* EMERGENCY LIST */}

        <div className="p-6">

          {emergencies.length === 0 ? (

            <div className="text-center py-10 text-gray-500">

              <div className="text-4xl mb-2">
                ✅
              </div>

              No active emergencies

            </div>

          ) : (

            emergencies.map((emergency) => (

              <EmergencyCard
                key={emergency.emergency_id}
                emergency={emergency}
                actionLoading={actionLoading}
                onAction={handleEmergencyAction}
              />

            ))

          )}

        </div>

      </div>
            {/* ========================================= */}
      {/* REAL-TIME JOURNEY MONITORING */}
      {/* ========================================= */}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">


        <div className="flex items-center justify-between mb-5">

          <div>

            <h2 className="text-xl font-bold text-slate-800">
              Real-Time Journey Monitoring
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Currently active passenger journeys
            </p>

          </div>


          <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-bold">

            {journeys.length} Active

          </div>

        </div>


        {journeys.length === 0 ? (

          <div className="text-center py-8 text-gray-500">

            <div className="text-3xl mb-2">
              🚗
            </div>

            No active journeys

          </div>

        ) : (

          journeys.map((journey) => (

            <JourneyCard
              key={journey.booking_id}
              journey={journey}
              onViewMap={handleViewMap}
            />

          ))

        )}

      </div>
     {/* ========================================= */}
{/* LIVE MAP */}
{/* ========================================= */}

<div
  style={{
    display: showMap ? "block" : "none",
    width: "100%",
  }}
>
  {selectedJourney && (
    <>
      {/* MAP HEADER */}

      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            🗺️ Live Journey Map
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Booking #{selectedJourney.booking_id}
            {" • "}
            {selectedJourney.passenger_name || "Passenger"}
          </p>
        </div>

        <button
          onClick={handleCloseMap}
          className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300 transition"
        >
          ✕ Close Map
        </button>
      </div>

      {/* MAP */}

      <div className="p-4">
        <LiveMap journey={selectedJourney} />
      </div>
    </>
  )}
</div>

    </div>

  );
};
/* ================================= */
/* EMERGENCY CARD */
/* ================================= */

const EmergencyCard = ({
  emergency,
  actionLoading,
  onAction,
}) => {

  const isCritical =
    emergency.risk_level === "Critical";


  const isStopped =
    emergency.vehicle_stopped === 1;


  const patrolDispatched =
    emergency.patrol_dispatched === 1;


  return (

    <div className="border border-red-200 rounded-xl p-5 mb-4 bg-red-50">


      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="flex flex-col md:flex-row md:justify-between gap-4">


        <div>

          <div className="flex items-center gap-3">

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isCritical
                  ? "bg-red-600 text-white"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {emergency.risk_level || "High"}
            </span>


            <span className="text-sm text-gray-500">
              Emergency #{emergency.emergency_id}
            </span>

          </div>


          <h3 className="text-lg font-bold mt-3">

            {emergency.passenger_name ||
              "Unknown Passenger"}

          </h3>


          <div className="text-sm text-gray-600 mt-2 space-y-1">


            <p>
              🎫 Booking ID:{" "}
              <b>
                {emergency.booking_id}
              </b>
            </p>


            <p>
              🚗 Vehicle ID:{" "}
              <b>
                {emergency.vehicle_id ?? "N/A"}
              </b>
            </p>


            <p>
              ⚠️ Risk Score:{" "}
              <b className="text-red-600">
                {emergency.risk_score ?? 0}
              </b>
            </p>


            <p>
              📝 Reason:{" "}
              <b>
                {emergency.reason ||
                  "Risk detected"}
              </b>
            </p>

          </div>

        </div>


        {/* ================================= */}
        {/* STATUS */}
        {/* ================================= */}

        <div className="text-right">

          <p className="text-xs text-gray-500">
            Officer Action
          </p>


          <p className="font-bold mt-1">
            {emergency.officer_action ||
              "AI FLAGGED"}
          </p>


          {isStopped && (

            <p className="text-sm text-red-600 font-bold mt-2">
              🛑 Vehicle Stopped
            </p>

          )}


          {patrolDispatched && (

            <p className="text-sm text-blue-600 font-bold mt-1">
              🚓 Patrol Dispatched
            </p>

          )}

        </div>

      </div>


      {/* ================================= */}
      {/* OFFICER ACTION BUTTONS */}
      {/* ================================= */}

      <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-red-200">


        {/* STOP */}

        <button
          onClick={() =>
            onAction(
              emergency.emergency_id,
              "STOP"
            )
          }
          disabled={
            actionLoading !== null ||
            emergency.stop_requested === 1
          }
          className="px-5 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >

          {actionLoading ===
          `${emergency.emergency_id}-STOP`
            ? "Stopping..."
            : emergency.stop_requested === 1
            ? "🛑 Stop Requested"
            : "🛑 STOP Vehicle"}

        </button>


        {/* DISPATCH PATROL */}

        <button
          onClick={() =>
            onAction(
              emergency.emergency_id,
              "DISPATCH_PATROL"
            )
          }
          disabled={
            actionLoading !== null ||
            emergency.patrol_dispatched === 1
          }
          className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >

          {actionLoading ===
          `${emergency.emergency_id}-DISPATCH_PATROL`
            ? "Dispatching..."
            : patrolDispatched
            ? "🚓 Patrol Dispatched"
            : "🚓 Dispatch Patrol"}

        </button>


        {/* RESOLVE */}

        <button
          onClick={() =>
            onAction(
              emergency.emergency_id,
              "RESOLVE"
            )
          }
          disabled={
            actionLoading !== null
          }
          className="px-5 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >

          {actionLoading ===
          `${emergency.emergency_id}-RESOLVE`
            ? "Resolving..."
            : "✅ Resolve"}

        </button>

      </div>

    </div>

  );
};
/* ================================= */
/* JOURNEY CARD */
/* ================================= */

const JourneyCard = ({
  journey,
  onViewMap,
}) => {

  const riskScore =
    journey.risk_score ?? 0;


  const riskLevel =
    journey.risk_level || "Low";


  const isHighRisk =
    riskLevel === "High" ||
    riskLevel === "Critical";


  return (

    <div
      className={`border-l-4 ${
        isHighRisk
          ? "border-red-500 bg-red-50"
          : "border-blue-500 bg-slate-50"
      } p-5 mb-4 rounded-r-lg`}
    >


      {/* ================================= */}
      {/* JOURNEY HEADER */}
      {/* ================================= */}

      <div className="flex flex-col md:flex-row md:justify-between gap-4">


        <div>


          <p className="font-bold text-lg text-slate-800">

            {journey.passenger_name ||
              "Unknown Passenger"}

          </p>


          <div className="flex flex-wrap gap-2 text-xs mt-2">


            <span className="bg-white border px-2 py-1 rounded">

              Booking #{journey.booking_id}

            </span>


            <span className="bg-white border px-2 py-1 rounded">

              {journey.status ||
                "IN_TRANSIT"}

            </span>


            <span
              className={`px-2 py-1 rounded font-bold ${
                riskLevel === "Critical"
                  ? "bg-red-600 text-white"
                  : riskLevel === "High"
                  ? "bg-orange-500 text-white"
                  : "bg-green-100 text-green-700"
              }`}
            >

              Risk: {riskLevel}

            </span>

          </div>


          {/* ================================= */}
          {/* ROUTE DETAILS */}
          {/* ================================= */}

          <div className="mt-4 text-sm text-gray-600 space-y-2">


            <p>

              📍 <b>From:</b>{" "}

              {journey.origin ||
                journey.boarding_point ||
                "Unknown"}

            </p>


            <p>

              🎯 <b>To:</b>{" "}

              {journey.destination ||
                journey.destination_point ||
                "Unknown"}

            </p>


            <p>

              🚗 <b>Vehicle ID:</b>{" "}

              {journey.vehicle_id ??
                "N/A"}

            </p>


            <p>

              👨‍✈️ <b>Driver:</b>{" "}

              {journey.driver_name ||
                "Unknown"}

            </p>


            <p>

              ⚠️ <b>Risk Score:</b>{" "}

              <span
                className={
                  isHighRisk
                    ? "font-bold text-red-600"
                    : "font-bold text-slate-700"
                }
              >

                {riskScore}/10

              </span>

            </p>

          </div>

        </div>


        {/* ================================= */}
        {/* MAP BUTTON */}
        {/* ================================= */}

        <div className="flex items-start">


          <button
            onClick={() =>
              onViewMap(journey)
            }
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition whitespace-nowrap"
          >

            🗺️ View on Map

          </button>


        </div>

      </div>

    </div>

  );
};
/* ================================= */
/* STAT CARD */
/* ================================= */

const StatCard = ({
  title,
  value,
  icon,
  color = "text-blue-600",
  alert = false,
}) => (

  <div
    className={`bg-white p-4 rounded-xl shadow-sm border ${
      alert
        ? "border-red-100 bg-red-50"
        : "border-slate-100"
    }`}
  >

    <div className="flex justify-between items-center">

      <div>

        <p className="text-gray-500 text-xs">
          {title}
        </p>


        <p
          className={`text-2xl font-bold ${color}`}
        >
          {value}
        </p>

      </div>


      <span className="text-2xl">
        {icon}
      </span>

    </div>

  </div>

);
export default PoliceDashboard;
  