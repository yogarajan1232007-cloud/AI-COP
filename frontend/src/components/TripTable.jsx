import {
  MapPin,
  Target,
  User,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Car
} from "lucide-react";

function TripTable({ journeys }) {
  if (!journeys.length) {
    return (
      <div style={styles.emptyContainer}>
        <style>{keyframes}</style>
        <div style={styles.emptyContent}>
          <Car size={48} color="#cbd5e1" />
          <p style={styles.emptyText}>No Active Journeys</p>
          <p style={styles.emptySubtext}>Waiting for new trip requests</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{keyframes}</style>
      <h3 style={styles.title}>Real-Time Journey Monitoring</h3>

      {journeys.map((j, index) => {
        const isHighRisk = j.risk_score > 7;

        return (
          <div
            key={j.id}
            style={{
              ...styles.card,
              animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
              borderLeft: `4px solid ${isHighRisk ? "#ef4444" : "#10b981"}`
            }}
          >
            <div style={styles.cardHeader}>
              <div style={styles.passengerInfo}>
                <div style={styles.avatar}>
                  <User size={20} color="#0ea5e9" />
                </div>
                <div>
                  <p style={styles.passengerName}>{j.passenger_name}</p>
                  <p style={styles.vehicleType}>
                    <Car size={14} />
                    {j.vehicle_type}
                  </p>
                </div>
              </div>

              <div style={{
                ...styles.riskBadge,
                background: isHighRisk ? "#fee2e2" : "#dcfce7",
                color: isHighRisk ? "#991b1b" : "#166534"
              }}>
                {isHighRisk ? (
                  <AlertTriangle size={16} />
                ) : (
                  <CheckCircle size={16} />
                )}
                <span>{isHighRisk ? "High Risk" : "Low Risk"}</span>
              </div>
            </div>

            <div style={styles.cardContent}>
              <div style={styles.routeGrid}>
                <div style={styles.routeItem}>
                  <MapPin size={16} color="#64748b" />
                  <div>
                    <p style={styles.routeLabel}>From</p>
                    <p style={styles.routeValue}>{j.origin}</p>
                  </div>
                </div>

                <div style={styles.routeArrow}>→</div>

                <div style={styles.routeItem}>
                  <Target size={16} color="#64748b" />
                  <div>
                    <p style={styles.routeLabel}>To</p>
                    <p style={styles.routeValue}>{j.destination}</p>
                  </div>
                </div>

                <div style={styles.routeItem}>
                  <User size={16} color="#64748b" />
                  <div>
                    <p style={styles.routeLabel}>Driver</p>
                    <p style={styles.routeValue}>{j.driver_name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TripTable;

const keyframes = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const styles = {
  container: {
    background: "white",
    padding: "28px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
  },

  emptyContainer: {
    background: "white",
    padding: "60px 28px",
    borderRadius: "20px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  emptyContent: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px"
  },

  emptyText: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
    color: "#94a3b8"
  },

  emptySubtext: {
    margin: 0,
    fontSize: "14px",
    color: "#cbd5e1"
  },

  title: {
    margin: "0 0 24px 0",
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.5px"
  },

  card: {
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "16px",
    background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    transition: "all 0.3s ease",
    cursor: "pointer"
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },

  passengerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },

  avatar: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  passengerName: {
    margin: 0,
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a"
  },

  vehicleType: {
    margin: "4px 0 0 0",
    color: "#64748b",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },

  riskBadge: {
    padding: "8px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.3s ease"
  },

  cardContent: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "16px"
  },

  routeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "16px",
    alignItems: "center"
  },

  routeItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px"
  },

  routeLabel: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "11px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },

  routeValue: {
    margin: "4px 0 0 0",
    fontSize: "13px",
    fontWeight: "600",
    color: "#0f172a"
  },

  routeArrow: {
    color: "#cbd5e1",
    fontSize: "18px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center"
  }
};
