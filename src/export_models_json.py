"""
export_models_json.py

Exports all 6 trained scikit-learn RandomForestClassifier models to JSON
format for in-browser inference in TypeScript, and generates golden test
samples to verify 100% parity between Python and TypeScript predictions.
"""

import os
import json
import joblib
import numpy as np

EXERCISES = ["squat", "pushup", "situp", "pullup", "jumpingjack", "latpulldown"]

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
MODELS_JSON_DIR = os.path.join(os.path.dirname(__file__), "..", "models_json")
FRONTEND_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "models")


def export_model_to_dict(model):
    """
    Exports a scikit-learn RandomForestClassifier into a pure dictionary
    ready for JSON serialization.
    """
    classes = [str(c) for c in model.classes_]
    trees = []

    for estimator in model.estimators_:
        tree = estimator.tree_
        
        # Squeeze out the middle dimension from tree.value (n_nodes, 1, n_classes)
        val = tree.value.squeeze(axis=1).astype(float)
        
        # Normalize leaf/node values to probabilities (sum to 1)
        row_sums = val.sum(axis=1, keepdims=True)
        row_sums[row_sums == 0] = 1.0
        normalized_val = (val / row_sums).tolist()

        trees.append({
            "children_left": tree.children_left.tolist(),
            "children_right": tree.children_right.tolist(),
            "feature": tree.feature.tolist(),
            "threshold": tree.threshold.tolist(),
            "value": normalized_val,
        })

    return {
        "classes": classes,
        "n_features": int(model.n_features_in_),
        "trees": trees,
    }


def generate_golden_samples(model, n_samples=250, seed=42):
    """
    Generates n_samples random feature vectors in the 0-180 angle range
    and computes the ground-truth prediction using the scikit-learn model.
    """
    rng = np.random.RandomState(seed)
    n_features = model.n_features_in_
    # Feature values between 10.0 and 175.0 degrees
    X = rng.uniform(10.0, 175.0, size=(n_samples, n_features)).astype(np.float32)
    predictions = model.predict(X)

    samples = []
    for feats, pred in zip(X, predictions):
        samples.append({
            "features": [float(f) for f in feats],
            "prediction": str(pred)
        })
    return samples


def main():
    os.makedirs(MODELS_JSON_DIR, exist_ok=True)
    os.makedirs(FRONTEND_MODELS_DIR, exist_ok=True)

    golden_data = {}

    print(f"Exporting models from {MODELS_DIR}...")
    for exercise in EXERCISES:
        pkl_path = os.path.join(MODELS_DIR, f"rf_{exercise}_model.pkl")
        if not os.path.exists(pkl_path):
            raise FileNotFoundError(f"Model file not found: {pkl_path}")

        model = joblib.load(pkl_path)
        model_dict = export_model_to_dict(model)

        # 1. Write to models_json/<exercise>.json
        json_path = os.path.join(MODELS_JSON_DIR, f"{exercise}.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(model_dict, f, separators=(",", ":"))
        print(f"  -> Wrote {json_path} ({len(model_dict['trees'])} trees, {len(model_dict['classes'])} classes)")

        # 2. Write to frontend/public/models/<exercise>.json
        fe_json_path = os.path.join(FRONTEND_MODELS_DIR, f"{exercise}.json")
        with open(fe_json_path, "w", encoding="utf-8") as f:
            json.dump(model_dict, f, separators=(",", ":"))
        print(f"  -> Wrote {fe_json_path}")

        # 3. Generate golden test samples
        golden_data[exercise] = generate_golden_samples(model, n_samples=250)

    # Write golden_test.json under models_json/ ONLY (not public/)
    golden_test_path = os.path.join(MODELS_JSON_DIR, "golden_test.json")
    with open(golden_test_path, "w", encoding="utf-8") as f:
        json.dump(golden_data, f, indent=2)
    print(f"\nSaved golden test data to {golden_test_path} ({len(golden_data)} exercises, 250 samples each).")


if __name__ == "__main__":
    main()

