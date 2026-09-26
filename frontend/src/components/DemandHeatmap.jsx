import { useEffect, useState } from "react";
import { getDemandForecast } from "../api";
import { TrendingUp, MapPin, Zap, Clock, RefreshCw } from "lucide-react";

export default function DemandHeatmap() {

  const [demandData, setDemandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState("");

  async function loadDemand() {
    try {
      const res = await getDemandForecast();
      setDemandData(res.data);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.log("Demand forecast error:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDemand();
    const timer = setInterval(loadDemand, 30000); // Auto refresh every 30s
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <RefreshCw size={32} style={{ animation: "spin 1s linear infinite" }} />
        <p>Loading demand forecast...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const zones = demandData?.zones || {};
  const zoneList = Object.entries(zones).sort(
    (a, b) => b[1].predicted_demand - a[1].predicted_demand
  );

  function getSurgeColor(surge) {
    if (surge >= 2.5) return "#dc2626";
    if (surge >= 2.0) return "#ef4444";
    if (surge >= 1.5) return "#f59e0b";
    if (surge > 1.0) return "#eab308";
    return "#10b981";
  }

  function getDemandBarWidth(demand) {
    const max = Math.max(...Object.values(zones).map(z => z.predicted_demand), 1);
    return `${(demand / max) * 100}%`;
  }

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <TrendingUp size={22} color="#6366f1" />
          <h3 style={styles.title}>Demand Forecast</h3>
        </div>
        <div style={styles.headerRight}>
          <Clock size={14} color="#94a3b8" />
          <span style={styles.updateText}>Updated: {lastUpdate}</span>
          <button onClick={loadDemand} style={styles.refreshBtn}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: "#10b981" }} />
          Normal
        </span>
        <span style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: "#f59e0b" }} />
          Moderate
        </span>
        <span style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: "#ef4444" }} />
          High
        </span>
        <span style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: "#dc2626" }} />
          Surge
        </span>
      </div>

      <div style={styles.zoneList}>
        {zoneList.map(([zone, data]) => (
          <div key={zone} style={styles.zoneCard}>

            <div style={styles.zoneHeader}>
              <div style={styles.zoneName}>
                <MapPin size={14} color="#6366f1" />
                <span>{zone}</span>
              </div>
              {data.surge_factor > 1.0 && (
                <div style={{
                  ...styles.surgeBadge,
                  background: getSurgeColor(data.surge_factor) + "18",
                  color: getSurgeColor(data.surge_factor),
                  border: `1px solid ${getSurgeColor(data.surge_factor)}40`
                }}>
                  <Zap size={12} />
                  {data.surge_factor}x Surge
                </div>
              )}
            </div>

            <div style={styles.demandRow}>
              <div style={styles.demandInfo}>
                <span style={styles.demandLabel}>Current</span>
                <span style={styles.demandValue}>{data.current_demand}</span>
              </div>
              <div style={styles.demandArrow}>→</div>
              <div style={styles.demandInfo}>
                <span style={styles.demandLabel}>Predicted</span>
                <span style={{
                  ...styles.demandValue,
                  color: data.predicted_demand > data.current_demand ? "#ef4444" : "#10b981"
                }}>
                  {data.predicted_demand}
                </span>
              </div>
            </div>

            <div style={styles.barContainer}>
              <div style={{
                ...styles.bar,
                width: getDemandBarWidth(data.predicted_demand),
                background: `linear-gradient(90deg, ${getSurgeColor(data.surge_factor)}40, ${getSurgeColor(data.surge_factor)})`
              }} />
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}

const styles = {

  container: {
    background: "white",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    border: "1px solid #e2e8f0"
  },

  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
    color: "#94a3b8",
    gap: "12px"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },

  title: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0
  },

  updateText: {
    fontSize: "12px",
    color: "#94a3b8"
  },

  refreshBtn: {
    background: "none",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    padding: "4px",
    cursor: "pointer",
    display: "flex",
    color: "#94a3b8"
  },

  legend: {
    display: "flex",
    gap: "16px",
    marginBottom: "16px",
    padding: "10px 14px",
    background: "#f8fafc",
    borderRadius: "10px"
  },

  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#64748b"
  },

  legendDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%"
  },

  zoneList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    maxHeight: "400px",
    overflowY: "auto"
  },

  zoneCard: {
    padding: "14px 16px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #f1f5f9",
    transition: "all 0.2s"
  },

  zoneHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },

  zoneName: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: "600",
    fontSize: "14px",
    color: "#1e293b"
  },

  surgeBadge: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700"
  },

  demandRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px"
  },

  demandInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },

  demandLabel: {
    fontSize: "11px",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },

  demandValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1e293b"
  },

  demandArrow: {
    color: "#94a3b8",
    fontSize: "18px"
  },

  barContainer: {
    height: "6px",
    background: "#e2e8f0",
    borderRadius: "3px",
    overflow: "hidden"
  },

  bar: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.8s ease"
  }

};
