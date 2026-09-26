"""
AI-COP RNN Models
=================
Lightweight LSTM-style models using numpy for:
1. Risk Score Prediction
2. Route Anomaly Detection
3. ETA Prediction
4. Demand Forecasting

Uses simple neural network implementations with numpy
for fast inference without heavy TensorFlow dependency.
"""

import numpy as np
import json
import os
import math
from datetime import datetime, timedelta

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)


# ============================================================
# UTILITY: Simple sigmoid / tanh
# ============================================================

def sigmoid(x):
    x = np.clip(x, -500, 500)
    return 1 / (1 + np.exp(-x))

def tanh(x):
    return np.tanh(x)

def relu(x):
    return np.maximum(0, x)

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()


# ============================================================
# Simple Dense Layer
# ============================================================

class DenseLayer:
    def __init__(self, input_size, output_size):
        # Xavier initialization
        self.W = np.random.randn(input_size, output_size) * np.sqrt(2.0 / (input_size + output_size))
        self.b = np.zeros(output_size)
    
    def forward(self, x):
        return x @ self.W + self.b


# ============================================================
# Simple LSTM Cell (numpy)
# ============================================================

class LSTMCell:
    def __init__(self, input_size, hidden_size):
        self.hidden_size = hidden_size
        scale = np.sqrt(2.0 / (input_size + hidden_size))
        
        # Forget gate
        self.Wf = np.random.randn(input_size + hidden_size, hidden_size) * scale
        self.bf = np.zeros(hidden_size)
        
        # Input gate
        self.Wi = np.random.randn(input_size + hidden_size, hidden_size) * scale
        self.bi = np.zeros(hidden_size)
        
        # Cell gate
        self.Wc = np.random.randn(input_size + hidden_size, hidden_size) * scale
        self.bc = np.zeros(hidden_size)
        
        # Output gate
        self.Wo = np.random.randn(input_size + hidden_size, hidden_size) * scale
        self.bo = np.zeros(hidden_size)
    
    def forward(self, x_seq):
        """Process sequence: x_seq shape (seq_len, input_size)"""
        seq_len = x_seq.shape[0]
        h = np.zeros(self.hidden_size)
        c = np.zeros(self.hidden_size)
        
        for t in range(seq_len):
            combined = np.concatenate([x_seq[t], h])
            
            f = sigmoid(combined @ self.Wf + self.bf)
            i = sigmoid(combined @ self.Wi + self.bi)
            c_hat = tanh(combined @ self.Wc + self.bc)
            o = sigmoid(combined @ self.Wo + self.bo)
            
            c = f * c + i * c_hat
            h = o * tanh(c)
        
        return h


# ============================================================
# 1. RISK SCORE MODEL
# ============================================================

class RiskScoreModel:
    """
    Predicts passenger safety risk (0-10) based on:
    - hour_of_day (0-23)
    - day_of_week (0-6)
    - gender_encoded (0=Male, 1=Female, 2=Other)
    - is_night (0/1)
    - speed (0-200)
    - zone_risk (derived from zone name hash)
    """
    
    def __init__(self):
        self.trained = False
        self.lstm = LSTMCell(6, 16)
        self.dense1 = DenseLayer(16, 8)
        self.dense2 = DenseLayer(8, 1)
        self._try_load()
    
    def _encode_features(self, hour, day_of_week, gender, zone, speed, is_night):
        gender_map = {"Male": 0, "Female": 1, "Other": 2, "male": 0, "female": 1, "other": 2}
        gender_enc = gender_map.get(gender, 0) / 2.0
        
        zone_risk = (hash(str(zone)) % 100) / 100.0
        
        return np.array([
            hour / 23.0,
            day_of_week / 6.0,
            gender_enc,
            1.0 if is_night else 0.0,
            min(speed, 200) / 200.0,
            zone_risk
        ])
    
    def predict(self, hour, day_of_week, gender, zone, speed, is_night):
        features = self._encode_features(hour, day_of_week, gender, zone, speed, is_night)
        
        if self.trained:
            # Use LSTM
            seq = np.stack([features, features, features])  # Create a short sequence
            h = self.lstm.forward(seq)
            x = relu(self.dense1.forward(h))
            score = sigmoid(self.dense2.forward(x))[0] * 10
        else:
            # Heuristic fallback
            score = 2.0  # base risk
            
            if is_night:
                score += 2.5
            
            if gender in ("Female", "female"):
                if is_night:
                    score += 2.0
                else:
                    score += 0.5
            
            if speed > 80:
                score += min((speed - 80) / 40.0 * 2, 3.0)
            
            if hour >= 22 or hour <= 5:
                score += 1.5
            
            if day_of_week >= 5:  # Weekend
                score += 0.5
            
            # Add some randomness for realism
            score += np.random.uniform(-0.5, 0.5)
        
        score = max(0, min(10, round(score, 1)))
        
        if score <= 3:
            level = "Low"
        elif score <= 5:
            level = "Medium"
        elif score <= 7:
            level = "High"
        else:
            level = "Critical"
        
        return {
            "risk_score": score,
            "risk_level": level
        }
    
    def train(self, X_train, y_train, epochs=50, lr=0.01):
        """Train with simple gradient descent"""
        n_samples = len(X_train)
        
        for epoch in range(epochs):
            total_loss = 0
            
            for i in range(n_samples):
                features = X_train[i]
                target = y_train[i] / 10.0  # Normalize to 0-1
                
                # Forward pass
                seq = np.stack([features, features, features])
                h = self.lstm.forward(seq)
                x = relu(self.dense1.forward(h))
                pred = sigmoid(self.dense2.forward(x))[0]
                
                # Simple loss
                loss = (pred - target) ** 2
                total_loss += loss
                
                # Simple gradient update (perturbation-based)
                error = pred - target
                
                # Update dense2
                self.dense2.W -= lr * error * x.reshape(-1, 1)
                self.dense2.b -= lr * error
                
                # Update dense1
                grad1 = error * self.dense2.W.T[0] * (x > 0).astype(float)
                self.dense1.W -= lr * np.outer(h, grad1)
                self.dense1.b -= lr * grad1
            
            if epoch % 10 == 0:
                avg_loss = total_loss / n_samples
                print(f"  Risk Model - Epoch {epoch}: Loss = {avg_loss:.4f}")
        
        self.trained = True
        self._save()
    
    def _save(self):
        path = os.path.join(MODELS_DIR, "risk_model.npz")
        np.savez(path,
            lstm_Wf=self.lstm.Wf, lstm_bf=self.lstm.bf,
            lstm_Wi=self.lstm.Wi, lstm_bi=self.lstm.bi,
            lstm_Wc=self.lstm.Wc, lstm_bc=self.lstm.bc,
            lstm_Wo=self.lstm.Wo, lstm_bo=self.lstm.bo,
            d1_W=self.dense1.W, d1_b=self.dense1.b,
            d2_W=self.dense2.W, d2_b=self.dense2.b
        )
    
    def _try_load(self):
        path = os.path.join(MODELS_DIR, "risk_model.npz")
        if os.path.exists(path):
            try:
                data = np.load(path)
                self.lstm.Wf = data['lstm_Wf']
                self.lstm.bf = data['lstm_bf']
                self.lstm.Wi = data['lstm_Wi']
                self.lstm.bi = data['lstm_bi']
                self.lstm.Wc = data['lstm_Wc']
                self.lstm.bc = data['lstm_bc']
                self.lstm.Wo = data['lstm_Wo']
                self.lstm.bo = data['lstm_bo']
                self.dense1.W = data['d1_W']
                self.dense1.b = data['d1_b']
                self.dense2.W = data['d2_W']
                self.dense2.b = data['d2_b']
                self.trained = True
                print("✅ Risk model loaded")
            except Exception as e:
                print(f"⚠️ Risk model load failed: {e}")


# ============================================================
# 2. ROUTE ANOMALY MODEL
# ============================================================

class RouteAnomalyModel:
    """
    Detects route deviations by comparing actual GPS points
    against expected route using reconstruction error.
    """
    
    def __init__(self):
        self.trained = False
        self.threshold = 0.002  # ~220 meters deviation threshold
        self._try_load()
    
    def predict(self, route_points, expected_route):
        """
        route_points: list of [lat, lng] - actual path
        expected_route: list of [lat, lng] - expected path
        """
        if not route_points or not expected_route:
            return {
                "is_anomaly": False,
                "deviation_score": 0.0,
                "alert_message": "No route data available"
            }
        
        actual = np.array(route_points)
        expected = np.array(expected_route)
        
        # Calculate deviation for each actual point
        deviations = []
        for point in actual:
            # Find minimum distance to any expected route point
            distances = np.sqrt(np.sum((expected - point) ** 2, axis=1))
            min_dist = np.min(distances)
            deviations.append(min_dist)
        
        avg_deviation = np.mean(deviations) if deviations else 0
        max_deviation = np.max(deviations) if deviations else 0
        
        # Normalize score to 0-1
        deviation_score = min(1.0, avg_deviation / 0.01)  # 0.01 degrees ≈ 1.1km
        
        is_anomaly = bool(
                       max_deviation > self.threshold or
                       avg_deviation > (self.threshold * 0.5)
                    )
        
        if is_anomaly and max_deviation > self.threshold * 3:
            alert = "⚠️ CRITICAL: Vehicle significantly off-route! Possible emergency."
        elif is_anomaly:
            alert = "🔶 WARNING: Vehicle deviating from expected route."
        else:
            alert = "✅ Vehicle following expected route."
        
        return {
            "is_anomaly": is_anomaly,
            "deviation_score": round(deviation_score, 3),
            "max_deviation_km": round(max_deviation * 111, 2),  # 1 degree ≈ 111km
            "alert_message": alert
        }
    
    def _save(self):
        path = os.path.join(MODELS_DIR, "anomaly_model.json")
        with open(path, "w") as f:
            json.dump({"threshold": self.threshold, "trained": True}, f)
    
    def _try_load(self):
        path = os.path.join(MODELS_DIR, "anomaly_model.json")
        if os.path.exists(path):
            try:
                with open(path) as f:
                    data = json.load(f)
                self.threshold = data.get("threshold", 0.002)
                self.trained = True
                print("✅ Anomaly model loaded")
            except:
                pass


# ============================================================
# 3. ETA PREDICTION MODEL
# ============================================================

class ETAPredictionModel:
    """
    Predicts journey duration (minutes) based on:
    - distance_km
    - hour_of_day
    - day_of_week
    - zone_factor
    """
    
    def __init__(self):
        self.trained = False
        self.lstm = LSTMCell(4, 12)
        self.dense1 = DenseLayer(12, 8)
        self.dense2 = DenseLayer(8, 1)
        self._try_load()
    
    def _encode_features(self, distance_km, hour, day_of_week, zone):
        zone_factor = (hash(str(zone)) % 50 + 50) / 100.0
        
        return np.array([
            min(distance_km, 100) / 100.0,
            hour / 23.0,
            day_of_week / 6.0,
            zone_factor
        ])
    
    def predict(self, distance_km, hour, day_of_week, zone):
        features = self._encode_features(distance_km, hour, day_of_week, zone)
        
        if self.trained:
            seq = np.stack([features, features, features])
            h = self.lstm.forward(seq)
            x = relu(self.dense1.forward(h))
            raw = self.dense2.forward(x)[0]
            eta = max(5, abs(raw) * 120)  # Scale to minutes
        else:
            # Heuristic: avg speed 25 km/h in city
            base_speed = 25.0
            
            # Traffic factors
            if 8 <= hour <= 10 or 17 <= hour <= 19:
                base_speed = 15.0  # Rush hour
            elif 22 <= hour or hour <= 5:
                base_speed = 35.0  # Night (less traffic)
            elif 11 <= hour <= 16:
                base_speed = 22.0  # Midday
            
            # Weekend bonus
            if day_of_week >= 5:
                base_speed *= 1.15
            
            eta = (distance_km / base_speed) * 60  # Convert to minutes
            
            # Add some realistic variance
            eta *= np.random.uniform(0.9, 1.1)
        
        eta = max(3, round(eta))
        
        # Confidence based on distance (shorter = more confident)
        confidence = max(0.5, min(0.95, 1.0 - (distance_km / 200)))
        
        return {
            "predicted_eta_minutes": eta,
            "confidence": round(confidence, 2)
        }
    
    def train(self, X_train, y_train, epochs=50, lr=0.005):
        n_samples = len(X_train)
        
        for epoch in range(epochs):
            total_loss = 0
            
            for i in range(n_samples):
                features = X_train[i]
                target = y_train[i] / 120.0  # Normalize
                
                seq = np.stack([features, features, features])
                h = self.lstm.forward(seq)
                x = relu(self.dense1.forward(h))
                pred = self.dense2.forward(x)[0]
                
                loss = (pred - target) ** 2
                total_loss += loss
                
                error = pred - target
                self.dense2.W -= lr * error * x.reshape(-1, 1)
                self.dense2.b -= lr * error
                
                grad1 = error * self.dense2.W.T[0] * (x > 0).astype(float)
                self.dense1.W -= lr * np.outer(h, grad1)
                self.dense1.b -= lr * grad1
            
            if epoch % 10 == 0:
                avg_loss = total_loss / n_samples
                print(f"  ETA Model - Epoch {epoch}: Loss = {avg_loss:.4f}")
        
        self.trained = True
        self._save()
    
    def _save(self):
        path = os.path.join(MODELS_DIR, "eta_model.npz")
        np.savez(path,
            lstm_Wf=self.lstm.Wf, lstm_bf=self.lstm.bf,
            lstm_Wi=self.lstm.Wi, lstm_bi=self.lstm.bi,
            lstm_Wc=self.lstm.Wc, lstm_bc=self.lstm.bc,
            lstm_Wo=self.lstm.Wo, lstm_bo=self.lstm.bo,
            d1_W=self.dense1.W, d1_b=self.dense1.b,
            d2_W=self.dense2.W, d2_b=self.dense2.b
        )
    
    def _try_load(self):
        path = os.path.join(MODELS_DIR, "eta_model.npz")
        if os.path.exists(path):
            try:
                data = np.load(path)
                self.lstm.Wf = data['lstm_Wf']
                self.lstm.bf = data['lstm_bf']
                self.lstm.Wi = data['lstm_Wi']
                self.lstm.bi = data['lstm_bi']
                self.lstm.Wc = data['lstm_Wc']
                self.lstm.bc = data['lstm_bc']
                self.lstm.Wo = data['lstm_Wo']
                self.lstm.bo = data['lstm_bo']
                self.dense1.W = data['d1_W']
                self.dense1.b = data['d1_b']
                self.dense2.W = data['d2_W']
                self.dense2.b = data['d2_b']
                self.trained = True
                print("✅ ETA model loaded")
            except Exception as e:
                print(f"⚠️ ETA model load failed: {e}")


# ============================================================
# 4. DEMAND FORECAST MODEL
# ============================================================

class DemandForecastModel:
    """
    Predicts demand per zone for the next hour based on:
    - Current hour
    - Day of week
    - Historical booking patterns (synthetic)
    """
    
    ZONES = [
        "Coimbatore Central",
        "Gandhipuram",
        "RS Puram",
        "Saibaba Colony",
        "Peelamedu",
        "Singanallur",
        "Ukkadam",
        "Town Hall",
        "Brookefields",
        "Fun Republic"
    ]
    
    def __init__(self):
        self.trained = False
        self.zone_patterns = {}
        self._try_load()
        
        if not self.trained:
            self._generate_default_patterns()
    
    def _generate_default_patterns(self):
        """Generate realistic demand patterns for each zone"""
        for zone in self.ZONES:
            base = np.random.uniform(5, 20)
            pattern = []
            for h in range(24):
                if 7 <= h <= 9:
                    demand = base * np.random.uniform(1.5, 2.5)  # Morning rush
                elif 17 <= h <= 19:
                    demand = base * np.random.uniform(1.8, 3.0)  # Evening rush
                elif 10 <= h <= 16:
                    demand = base * np.random.uniform(0.8, 1.3)  # Midday
                elif 20 <= h <= 22:
                    demand = base * np.random.uniform(1.0, 1.8)  # Evening
                else:
                    demand = base * np.random.uniform(0.2, 0.5)  # Night
                pattern.append(round(demand))
            self.zone_patterns[zone] = pattern
    
    def predict(self):
        """Predict demand for all zones"""
        now = datetime.now()
        current_hour = now.hour
        day_of_week = now.weekday()
        
        zones = {}
        
        for zone in self.ZONES:
            pattern = self.zone_patterns.get(zone, [10] * 24)
            
            current_demand = pattern[current_hour]
            
            # Add some real-time noise
            current_demand = max(0, current_demand + np.random.randint(-3, 4))
            
            # Predict next hour
            next_hour = (current_hour + 1) % 24
            predicted_demand = pattern[next_hour]
            predicted_demand = max(0, predicted_demand + np.random.randint(-2, 3))
            
            # Weekend adjustment
            if day_of_week >= 5:
                current_demand = int(current_demand * 0.8)
                predicted_demand = int(predicted_demand * 0.85)
            
            # Surge factor
            if predicted_demand > current_demand * 1.5:
                surge = round(predicted_demand / max(current_demand, 1), 1)
            else:
                surge = 1.0
            
            surge = min(surge, 3.0)
            
            zones[zone] = {
                "current_demand": max(0, current_demand),
                "predicted_demand": max(0, predicted_demand),
                "surge_factor": surge
            }
        
        return {"zones": zones, "timestamp": now.isoformat()}
    
    def _save(self):
        path = os.path.join(MODELS_DIR, "demand_model.json")
        with open(path, "w") as f:
            json.dump({
                "zone_patterns": self.zone_patterns,
                "trained": True
            }, f)
    
    def _try_load(self):
        path = os.path.join(MODELS_DIR, "demand_model.json")
        if os.path.exists(path):
            try:
                with open(path) as f:
                    data = json.load(f)
                self.zone_patterns = data.get("zone_patterns", {})
                self.trained = True
                print("✅ Demand model loaded")
            except:
                pass


# ============================================================
# GLOBAL MODEL INSTANCES (loaded once at startup)
# ============================================================

risk_model = RiskScoreModel()
anomaly_model = RouteAnomalyModel()
eta_model = ETAPredictionModel()
demand_model = DemandForecastModel()
