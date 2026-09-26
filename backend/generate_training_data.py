"""
Generate synthetic training data for AI-COP RNN models.
Creates realistic patterns for risk scoring, ETA prediction, and demand.
"""

import numpy as np
from datetime import datetime, timedelta


def generate_risk_data(n_samples=5000):
    """
    Generate risk training data.
    Features: [hour_norm, day_norm, gender_enc, is_night, speed_norm, zone_risk]
    Target: risk_score (0-10)
    """
    X = []
    y = []
    
    for _ in range(n_samples):
        hour = np.random.randint(0, 24)
        day = np.random.randint(0, 7)
        gender = np.random.choice([0, 1, 2])  # Male, Female, Other
        speed = np.random.uniform(0, 120)
        zone_risk = np.random.uniform(0, 1)
        is_night = 1.0 if (hour >= 21 or hour <= 5) else 0.0
        
        # Calculate realistic risk score
        risk = 2.0  # base
        
        # Night time
        if is_night:
            risk += 2.5
        
        # Gender factor (Female alone at night = higher risk in the context of safety monitoring)
        if gender == 1:  # Female
            if is_night:
                risk += 2.0
            else:
                risk += 0.5
        
        # Speed factor
        if speed > 80:
            risk += min((speed - 80) / 40 * 3, 3.0)
        elif speed > 60:
            risk += 0.5
        
        # Late night premium
        if hour >= 23 or hour <= 3:
            risk += 1.0
        
        # Weekend
        if day >= 5:
            risk += 0.5
        
        # Zone risk
        risk += zone_risk * 1.5
        
        # Noise
        risk += np.random.normal(0, 0.5)
        risk = max(0, min(10, risk))
        
        features = [
            hour / 23.0,
            day / 6.0,
            gender / 2.0,
            is_night,
            min(speed, 200) / 200.0,
            zone_risk
        ]
        
        X.append(features)
        y.append(risk)
    
    return np.array(X, dtype=np.float64), np.array(y, dtype=np.float64)


def generate_eta_data(n_samples=5000):
    """
    Generate ETA training data.
    Features: [distance_norm, hour_norm, day_norm, zone_factor]
    Target: duration_minutes
    """
    X = []
    y = []
    
    for _ in range(n_samples):
        distance = np.random.uniform(1, 50)
        hour = np.random.randint(0, 24)
        day = np.random.randint(0, 7)
        zone_factor = np.random.uniform(0.5, 1.0)
        
        # Calculate realistic ETA
        base_speed = 25.0  # km/h city average
        
        # Rush hour
        if 8 <= hour <= 10:
            base_speed = 12 + np.random.uniform(0, 5)
        elif 17 <= hour <= 19:
            base_speed = 10 + np.random.uniform(0, 5)
        # Night
        elif 22 <= hour or hour <= 5:
            base_speed = 35 + np.random.uniform(0, 10)
        # Midday
        elif 11 <= hour <= 16:
            base_speed = 20 + np.random.uniform(0, 8)
        else:
            base_speed = 22 + np.random.uniform(0, 8)
        
        # Weekend faster
        if day >= 5:
            base_speed *= 1.15
        
        # Zone congestion
        base_speed *= zone_factor
        
        duration = (distance / base_speed) * 60  # minutes
        
        # Noise
        duration *= np.random.uniform(0.85, 1.15)
        duration = max(3, duration)
        
        features = [
            min(distance, 100) / 100.0,
            hour / 23.0,
            day / 6.0,
            zone_factor
        ]
        
        X.append(features)
        y.append(duration)
    
    return np.array(X, dtype=np.float64), np.array(y, dtype=np.float64)


if __name__ == "__main__":
    print("Generating risk training data...")
    X_risk, y_risk = generate_risk_data(5000)
    print(f"  Generated {len(X_risk)} samples")
    print(f"  Risk range: {y_risk.min():.1f} - {y_risk.max():.1f}")
    
    print("\nGenerating ETA training data...")
    X_eta, y_eta = generate_eta_data(5000)
    print(f"  Generated {len(X_eta)} samples")
    print(f"  ETA range: {y_eta.min():.1f} - {y_eta.max():.1f} minutes")
    
    print("\n✅ Training data generation complete!")
