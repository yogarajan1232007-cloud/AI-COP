"""
Train all AI-COP RNN models.

Usage:
    cd backend_backup
    python train_models.py
"""

import time
from generate_training_data import generate_risk_data, generate_eta_data
from rnn_models import risk_model, eta_model, anomaly_model, demand_model


def train_all():
    
    print("=" * 60)
    print("  AI-COP RNN Model Training")
    print("=" * 60)
    
    start = time.time()
    
    # --------------------------------
    # 1. Risk Score Model
    # --------------------------------
    print("\n📊 Training Risk Score Model...")
    X_risk, y_risk = generate_risk_data(3000)
    risk_model.train(X_risk, y_risk, epochs=30, lr=0.01)
    
    # Test prediction
    test = risk_model.predict(
        hour=23, day_of_week=6, gender="Female",
        zone="downtown", speed=90, is_night=True
    )
    print(f"  Test prediction (late night, female, high speed): {test}")
    
    test2 = risk_model.predict(
        hour=10, day_of_week=1, gender="Male",
        zone="suburb", speed=30, is_night=False
    )
    print(f"  Test prediction (morning, male, normal speed): {test2}")
    
    
    # --------------------------------
    # 2. ETA Prediction Model
    # --------------------------------
    print("\n🕐 Training ETA Prediction Model...")
    X_eta, y_eta = generate_eta_data(3000)
    eta_model.train(X_eta, y_eta, epochs=30, lr=0.005)
    
    # Test prediction
    test = eta_model.predict(
        distance_km=15, hour=18, day_of_week=1, zone="downtown"
    )
    print(f"  Test prediction (15km, rush hour): {test}")
    
    test2 = eta_model.predict(
        distance_km=5, hour=23, day_of_week=6, zone="suburb"
    )
    print(f"  Test prediction (5km, late night): {test2}")
    
    
    # --------------------------------
    # 3. Route Anomaly Model
    # --------------------------------
    print("\n🛣️ Configuring Route Anomaly Model...")
    anomaly_model.threshold = 0.002  # ~220m deviation
    anomaly_model.trained = True
    anomaly_model._save()
    
    # Test prediction
    normal_route = [[11.0, 77.0], [11.01, 77.01], [11.02, 77.02]]
    actual_normal = [[11.0, 77.0], [11.01, 77.01], [11.02, 77.02]]
    actual_deviated = [[11.0, 77.0], [11.05, 77.05], [11.02, 77.02]]
    
    test_normal = anomaly_model.predict(actual_normal, normal_route)
    print(f"  Normal route: {test_normal}")
    
    test_deviated = anomaly_model.predict(actual_deviated, normal_route)
    print(f"  Deviated route: {test_deviated}")
    
    
    # --------------------------------
    # 4. Demand Forecast Model
    # --------------------------------
    print("\n📈 Configuring Demand Forecast Model...")
    demand_model._generate_default_patterns()
    demand_model.trained = True
    demand_model._save()
    
    # Test prediction
    test = demand_model.predict()
    zone_count = len(test["zones"])
    print(f"  Zones configured: {zone_count}")
    
    for zone, data in list(test["zones"].items())[:3]:
        print(f"  {zone}: demand={data['current_demand']}, predicted={data['predicted_demand']}, surge={data['surge_factor']}x")
    
    
    # --------------------------------
    # DONE
    # --------------------------------
    elapsed = time.time() - start
    
    print("\n" + "=" * 60)
    print(f"  ✅ All models trained in {elapsed:.1f} seconds")
    print("=" * 60)
    print("\nModel files saved to: models/")
    print("  - risk_model.npz")
    print("  - eta_model.npz")
    print("  - anomaly_model.json")
    print("  - demand_model.json")


if __name__ == "__main__":
    train_all()
