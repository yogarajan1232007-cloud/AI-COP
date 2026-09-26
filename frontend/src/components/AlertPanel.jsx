import { useEffect, useState } from "react";

import {
  AlertTriangle,
  Siren,
  CheckCircle,
  Clock,
  ShieldAlert,
  SquareStop,
  Car,
  Radio,
  RefreshCw
} from "lucide-react";

import API from "../api";

function AlertPanel({ alerts = [] }) {

  /* =====================================================
     EMERGENCY STATE
  ===================================================== */

  const [emergencies, setEmergencies] = useState([]);

  const [loadingEmergencies, setLoadingEmergencies] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [actionMessage, setActionMessage] =
    useState("");


  /* =====================================================
     LOAD ACTIVE EMERGENCIES
  ===================================================== */

  const loadEmergencies = async () => {

    try {

      setLoadingEmergencies(true);

      const response =
        await API.get("/api/emergencies/active");

      const data =
        Array.isArray(response.data)
          ? response.data
          : [];

      setEmergencies(data);

    } catch (error) {

      console.error(
        "EMERGENCY LOAD ERROR:",
        error
      );

    } finally {

      setLoadingEmergencies(false);

    }
  };


  /* =====================================================
     INITIAL LOAD + LIVE POLLING
  ===================================================== */

  useEffect(() => {

    loadEmergencies();

    const interval =
      setInterval(
        loadEmergencies,
        3000
      );

    return () => {
      clearInterval(interval);
    };

  }, []);


  /* =====================================================
     OFFICER ACTION
  ===================================================== */

  const performAction = async (
    emergencyId,
    action
  ) => {

    try {

      setActionLoading(
        `${emergencyId}-${action}`
      );

      setActionMessage("");


      const response =
        await API.put(
          `/api/emergencies/${emergencyId}/action`,
          {
            officer_action: action
          }
        );


      const updatedEmergency =
        response.data;


      /*
       * Update the emergency immediately
       * instead of waiting for polling.
       */

      setEmergencies((previous) =>
        previous.map((emergency) =>
          emergency.emergency_id === emergencyId
            ? updatedEmergency
            : emergency
        )
      );


      if (action === "STOP") {

        setActionMessage(
          `STOP command requested for Vehicle ${
            updatedEmergency.vehicle_id ?? "Unknown"
          }`
        );

      }

      else if (
        action === "DISPATCH_PATROL"
      ) {

        setActionMessage(
          `Patrol dispatched for Emergency #${emergencyId}`
        );

      }

      else if (
        action === "RESOLVE"
      ) {

        setActionMessage(
          `Emergency #${emergencyId} resolved`
        );

        /*
         * Remove resolved emergency
         * from active column.
         */

        setEmergencies((previous) =>
          previous.filter(
            (emergency) =>
              emergency.emergency_id !==
              emergencyId
          )
        );

      }

    } catch (error) {

      console.error(
        "EMERGENCY ACTION ERROR:",
        error
      );

      setActionMessage(
        "Unable to perform officer action"
      );

    } finally {

      setActionLoading(null);

    }

  };


  /* =====================================================
     RISK COLOR
  ===================================================== */

  const getRiskColor = (level) => {

    if (level === "Critical") {
      return "#dc2626";
    }

    if (level === "High") {
      return "#ef4444";
    }

    if (level === "Medium") {
      return "#f59e0b";
    }

    return "#10b981";

  };


  /* =====================================================
     EMERGENCY CARD
  ===================================================== */

  const EmergencyCard = ({
    emergency,
    index
  }) => {

    const riskColor =
      getRiskColor(
        emergency.risk_level
      );


    const stopLoading =
      actionLoading ===
      `${emergency.emergency_id}-STOP`;

    const patrolLoading =
      actionLoading ===
      `${emergency.emergency_id}-DISPATCH_PATROL`;

    const resolveLoading =
      actionLoading ===
      `${emergency.emergency_id}-RESOLVE`;


    return (

      <div
        style={{
          ...styles.emergencyCard,
          borderColor:
            emergency.risk_level === "Critical"
              ? "#fecaca"
              : "#fed7aa",
          animation:
            `slideIn 0.4s ease-out ${
              index * 0.08
            }s both`
        }}
      >

        {/* =================================================
           CARD HEADER
        ================================================= */}

        <div style={styles.emergencyHeader}>

          <div
            style={{
              ...styles.emergencyBadge,
              background:
                emergency.risk_level ===
                "Critical"
                  ? "#fee2e2"
                  : "#ffedd5",
              color: riskColor
            }}
          >

            <ShieldAlert size={16} />

            {emergency.risk_level ||
              "High"}

          </div>


          <span style={styles.emergencyId}>
            Emergency #
            {emergency.emergency_id}
          </span>

        </div>


        {/* =================================================
           PASSENGER
        ================================================= */}

        <div style={styles.passengerRow}>

          <div style={styles.passengerIcon}>
            <span>♀</span>
          </div>

          <div>

            <div style={styles.passengerName}>
              {emergency.passenger_name ||
                "Passenger"}
            </div>

            <div style={styles.passengerLabel}>
              Passenger safety event
            </div>

          </div>

        </div>


        {/* =================================================
           RISK SCORE
        ================================================= */}

        <div style={styles.riskBox}>

          <div>

            <span style={styles.smallLabel}>
              AI Risk Score
            </span>

            <div
              style={{
                ...styles.riskScoreLarge,
                color: riskColor
              }}
            >
              {emergency.risk_score}
              <span style={styles.outOf}>
                /10
              </span>
            </div>

          </div>


          <div
            style={{
              ...styles.riskCircle,
              borderColor: riskColor
            }}
          >

            <ShieldAlert
              size={24}
              color={riskColor}
            />

          </div>

        </div>


        {/* =================================================
           JOURNEY INFORMATION
        ================================================= */}

        <div style={styles.infoGrid}>

          <div style={styles.infoItem}>

            <span style={styles.smallLabel}>
              Booking
            </span>

            <strong>
              #{emergency.booking_id}
            </strong>

          </div>


          <div style={styles.infoItem}>

            <span style={styles.smallLabel}>
              Vehicle
            </span>

            <strong>
              {emergency.vehicle_id ??
                "Not Assigned"}
            </strong>

          </div>

        </div>


        {/* =================================================
           REASON
        ================================================= */}

        <div style={styles.reasonBox}>

          <AlertTriangle
            size={16}
            color={riskColor}
          />

          <div>

            <span style={styles.reasonLabel}>
              Detection Reason
            </span>

            <p style={styles.reasonText}>
              {emergency.reason ||
                "High risk detected during journey"}
            </p>

          </div>

        </div>


        {/* =================================================
           CURRENT STATUS
        ================================================= */}

        <div style={styles.statusBox}>

          <div style={styles.statusRow}>

            <span>
              Officer Action
            </span>

            <strong>
              {emergency.officer_action ||
                "None"}
            </strong>

          </div>


          {Boolean(
            emergency.stop_requested
          ) && (

            <div
              style={{
                ...styles.statusTag,
                background: "#fff7ed",
                color: "#c2410c"
              }}
            >

              <SquareStop size={14} />

              STOP REQUESTED

            </div>

          )}


          {Boolean(
            emergency.vehicle_stopped
          ) && (

            <div
              style={{
                ...styles.statusTag,
                background: "#fef2f2",
                color: "#b91c1c"
              }}
            >

              <Car size={14} />

              VEHICLE STOPPED

            </div>

          )}


          {Boolean(
            emergency.patrol_dispatched
          ) && (

            <div
              style={{
                ...styles.statusTag,
                background: "#eff6ff",
                color: "#1d4ed8"
              }}
            >

              <Radio size={14} />

              PATROL DISPATCHED

            </div>

          )}

        </div>


        {/* =================================================
           OFFICER ACTIONS
        ================================================= */}

        <div style={styles.actions}>

          {/* STOP */}

          <button
            disabled={
              stopLoading ||
              Boolean(
                emergency.stop_requested
              )
            }
            onClick={() =>
              performAction(
                emergency.emergency_id,
                "STOP"
              )
            }
            style={{
              ...styles.stopButton,
              opacity:
                stopLoading ||
                emergency.stop_requested
                  ? 0.55
                  : 1,
              cursor:
                stopLoading ||
                emergency.stop_requested
                  ? "not-allowed"
                  : "pointer"
            }}
          >

            <SquareStop size={17} />

            {stopLoading
              ? "Sending..."
              : emergency.stop_requested
              ? "STOP REQUESTED"
              : "STOP VEHICLE"}

          </button>


          {/* PATROL */}

          <button
            disabled={
              patrolLoading ||
              Boolean(
                emergency.patrol_dispatched
              )
            }
            onClick={() =>
              performAction(
                emergency.emergency_id,
                "DISPATCH_PATROL"
              )
            }
            style={{
              ...styles.patrolButton,
              opacity:
                patrolLoading ||
                emergency.patrol_dispatched
                  ? 0.55
                  : 1,
              cursor:
                patrolLoading ||
                emergency.patrol_dispatched
                  ? "not-allowed"
                  : "pointer"
            }}
          >

            <Radio size={17} />

            {patrolLoading
              ? "Dispatching..."
              : emergency.patrol_dispatched
              ? "PATROL DISPATCHED"
              : "DISPATCH PATROL"}

          </button>


          {/* RESOLVE */}

          <button
            disabled={resolveLoading}
            onClick={() =>
              performAction(
                emergency.emergency_id,
                "RESOLVE"
              )
            }
            style={{
              ...styles.resolveButton,
              opacity:
                resolveLoading
                  ? 0.55
                  : 1
            }}
          >

            <CheckCircle size={17} />

            {resolveLoading
              ? "Resolving..."
              : "RESOLVE"}

          </button>

        </div>

      </div>

    );

  };


  /* =====================================================
     GENERIC ALERT COUNT
  ===================================================== */

  const genericAlertCount =
    Array.isArray(alerts)
      ? alerts.length
      : 0;


  return (

    <div style={styles.container}>

      <style>{keyframes}</style>


      {/* ===================================================
         EMERGENCY COLUMN
      =================================================== */}

      <div style={styles.header}>

        <div style={styles.headerTitle}>

          <Siren
            size={23}
            color="#dc2626"
          />

          <div>

            <h2 style={styles.title}>
              Emergency Column
            </h2>

            <p style={styles.subtitle}>
              AI-detected high-risk journeys
            </p>

          </div>

        </div>


        <div
          style={{
            ...styles.alertCount,
            background:
              emergencies.length > 0
                ? "#fee2e2"
                : "#dcfce7",
            color:
              emergencies.length > 0
                ? "#991b1b"
                : "#166534"
          }}
        >

          {emergencies.length}

        </div>

      </div>


      {/* ===================================================
         ACTION MESSAGE
      =================================================== */}

      {actionMessage && (

        <div style={styles.actionMessage}>

          <CheckCircle
            size={17}
            color="#16a34a"
          />

          {actionMessage}

        </div>

      )}


      {/* ===================================================
         LOADING
      =================================================== */}

      {loadingEmergencies &&
        emergencies.length === 0 && (

          <div style={styles.loadingState}>

            <RefreshCw
              size={22}
              style={{
                animation:
                  "spin 1s linear infinite"
              }}
            />

            Loading emergency events...

          </div>

        )}


      {/* ===================================================
         NO EMERGENCIES
      =================================================== */}

      {!loadingEmergencies &&
        emergencies.length === 0 && (

          <div style={styles.emptyState}>

            <div style={styles.safeIcon}>

              <CheckCircle
                size={46}
                color="#10b981"
              />

            </div>

            <p style={styles.emptyTitle}>
              All Systems Operational
            </p>

            <p style={styles.emptyText}>
              No active emergency events detected
            </p>

          </div>

        )}


      {/* ===================================================
         EMERGENCY LIST
      =================================================== */}

      {emergencies.length > 0 && (

        <div style={styles.emergenciesList}>

          {emergencies.map(
            (emergency, index) => (

              <EmergencyCard
                key={
                  emergency.emergency_id
                }
                emergency={emergency}
                index={index}
              />

            )
          )}

        </div>

      )}


      {/* ===================================================
         RNN / ROUTE ALERTS
      =================================================== */}

      {genericAlertCount > 0 && (

        <div style={styles.liveAlertsSection}>

          <div style={styles.sectionDivider} />

          <div style={styles.liveAlertsTitle}>

            <AlertTriangle
              size={18}
              color="#f59e0b"
            />

            <span>
              Route / AI Alerts
            </span>

            <span
              style={styles.smallCount}
            >
              {genericAlertCount}
            </span>

          </div>


          <div style={styles.alertsList}>

            {alerts.map(
              (alert, index) => (

                <div
                  key={
                    alert.id ??
                    index
                  }
                  style={{
                    ...styles.alertItem,
                    animation:
                      `slideIn 0.4s ease-out ${
                        index * 0.08
                      }s both`
                  }}
                >

                  <div
                    style={
                      styles.alertIconContainer
                    }
                  >

                    <AlertTriangle
                      size={18}
                      color="#f59e0b"
                    />

                  </div>


                  <div
                    style={
                      styles.alertContent
                    }
                  >

                    <p
                      style={
                        styles.alertTitle
                      }
                    >
                      {alert.message ||
                        "Route anomaly detected"}
                    </p>

                    <p
                      style={
                        styles.alertDetails
                      }
                    >
                      Passenger:{" "}
                      {alert.passenger ||
                        "Passenger"}
                    </p>

                    {alert.deviation !==
                      undefined && (

                      <p
                        style={
                          styles.alertDetails
                        }
                      >
                        Deviation:{" "}
                        {alert.deviation} km
                      </p>

                    )}

                    <p
                      style={
                        styles.alertTime
                      }
                    >

                      <Clock size={12} />

                      Live AI detection

                    </p>

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      )}

    </div>

  );

}

export default AlertPanel;


/* =========================================================
   ANIMATIONS
========================================================= */

const keyframes = `

@keyframes slideIn {

  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }

}

@keyframes pulse {

  0%, 100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }

}

@keyframes spin {

  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }

}

`;


/* =========================================================
   STYLES
========================================================= */

const styles = {

  container: {
    background: "#ffffff",
    padding: "24px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    boxShadow:
      "0 4px 20px rgba(15, 23, 42, 0.06)"
  },


  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom:
      "2px solid #fee2e2"
  },


  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },


  title: {
    margin: 0,
    fontSize: "21px",
    fontWeight: "750",
    color: "#0f172a",
    letterSpacing: "-0.4px"
  },


  subtitle: {
    margin: "3px 0 0",
    fontSize: "12px",
    color: "#94a3b8"
  },


  alertCount: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "16px"
  },


  actionMessage: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 13px",
    marginBottom: "15px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600"
  },


  loadingState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    padding: "45px 10px",
    color: "#64748b",
    fontSize: "14px"
  },


  emptyState: {
    textAlign: "center",
    padding: "48px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px"
  },


  safeIcon: {
    width: "78px",
    height: "78px",
    borderRadius: "50%",
    background: "#ecfdf5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px"
  },


  emptyTitle: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#059669"
  },


  emptyText: {
    margin: 0,
    fontSize: "13px",
    color: "#94a3b8"
  },


  emergenciesList: {
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },


  emergencyCard: {
    position: "relative",
    padding: "17px",
    borderRadius: "16px",
    background:
      "linear-gradient(145deg, #fffafa 0%, #ffffff 100%)",
    border: "1px solid",
    boxShadow:
      "0 5px 18px rgba(15, 23, 42, 0.06)",
    overflow: "hidden"
  },


  emergencyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "15px"
  },


  emergencyBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 9px",
    borderRadius: "8px",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.3px"
  },


  emergencyId: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8"
  },


  passengerRow: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    marginBottom: "15px"
  },


  passengerIcon: {
    width: "43px",
    height: "43px",
    borderRadius: "50%",
    background: "#fce7f3",
    color: "#db2777",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    fontWeight: "700"
  },


  passengerName: {
    fontSize: "15px",
    fontWeight: "750",
    color: "#0f172a"
  },


  passengerLabel: {
    marginTop: "2px",
    fontSize: "11px",
    color: "#94a3b8"
  },


  riskBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 14px",
    background: "#f8fafc",
    borderRadius: "12px",
    marginBottom: "12px"
  },


  smallLabel: {
    display: "block",
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: "3px"
  },


  riskScoreLarge: {
    fontSize: "27px",
    fontWeight: "850",
    lineHeight: 1
  },


  outOf: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "600"
  },


  riskCircle: {
    width: "43px",
    height: "43px",
    borderRadius: "50%",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff"
  },


  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "12px"
  },


  infoItem: {
    padding: "9px 11px",
    background: "#f8fafc",
    borderRadius: "9px",
    fontSize: "13px",
    color: "#334155"
  },


  reasonBox: {
    display: "flex",
    gap: "9px",
    padding: "11px",
    background: "#fff7ed",
    borderRadius: "10px",
    marginBottom: "12px"
  },


  reasonLabel: {
    display: "block",
    fontSize: "10px",
    fontWeight: "700",
    color: "#9a3412",
    textTransform: "uppercase",
    marginBottom: "3px"
  },


  reasonText: {
    margin: 0,
    fontSize: "12px",
    lineHeight: 1.4,
    color: "#7c2d12"
  },


  statusBox: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
    padding: "10px",
    background: "#f8fafc",
    borderRadius: "10px",
    marginBottom: "12px"
  },


  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#64748b"
  },


  statusTag: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    width: "fit-content",
    padding: "5px 8px",
    borderRadius: "6px",
    fontSize: "9px",
    fontWeight: "800",
    letterSpacing: "0.3px"
  },


  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "7px"
  },


  stopButton: {
    border: "none",
    borderRadius: "9px",
    padding: "11px",
    background: "#dc2626",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    fontSize: "12px",
    fontWeight: "800"
  },


  patrolButton: {
    border: "none",
    borderRadius: "9px",
    padding: "11px",
    background: "#1d4ed8",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    fontSize: "12px",
    fontWeight: "800"
  },


  resolveButton: {
    border: "1px solid #bbf7d0",
    borderRadius: "9px",
    padding: "10px",
    background: "#f0fdf4",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer"
  },


  liveAlertsSection: {
    marginTop: "5px"
  },


  sectionDivider: {
    height: "1px",
    background: "#e2e8f0",
    margin: "20px 0 16px"
  },


  liveAlertsTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "750",
    color: "#334155",
    marginBottom: "12px"
  },


  smallCount: {
    marginLeft: "auto",
    background: "#fef3c7",
    color: "#92400e",
    padding: "3px 7px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: "800"
  },


  alertsList: {
    display: "flex",
    flexDirection: "column",
    gap: "9px"
  },


  alertItem: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "11px",
    background: "#fffbeb",
    borderRadius: "10px",
    border: "1px solid #fde68a"
  },


  alertIconContainer: {
    width: "36px",
    height: "36px",
    borderRadius: "9px",
    background: "#fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },


  alertContent: {
    flex: 1,
    minWidth: 0
  },


  alertTitle: {
    margin: 0,
    fontSize: "12px",
    fontWeight: "700",
    color: "#334155"
  },


  alertDetails: {
    margin: "4px 0 0",
    fontSize: "11px",
    color: "#64748b"
  },


  alertTime: {
    margin: "4px 0 0",
    fontSize: "10px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  }

};