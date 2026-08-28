"""
prepare_situp_data.py

Filters Kaggle data to sit-up videos, computes torso angle
(shoulder-hip-knee) from raw landmarks (not precomputed in angles.csv),
and inspects the distribution before picking thresholds.
"""

import pandas as pd
import numpy as np
from pathlib import Path

DATA_DIR = Path("../data/Kaggle")
LABELS_PATH = DATA_DIR / "labels.csv"
LANDMARKS_PATH = DATA_DIR / "landmarks.csv"
OUTPUT_PATH = Path("../data/situp_raw_angles.csv")

TARGET_EXERCISE = "situp"


def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return angle


def main():
    labels_df = pd.read_csv(LABELS_PATH)
    landmarks_df = pd.read_csv(LANDMARKS_PATH)

    video_ids = labels_df.loc[labels_df["class"] == TARGET_EXERCISE, "vid_id"]
    df = landmarks_df[landmarks_df["vid_id"].isin(video_ids)].copy()

    if df.empty:
        raise ValueError(f"No rows matched class '{TARGET_EXERCISE}'")

    print(f"Matched {df['vid_id'].nunique()} videos, {len(df)} frames")

    def row_angle(row, side):
        shoulder = [row[f"x_{side}_shoulder"], row[f"y_{side}_shoulder"]]
        hip = [row[f"x_{side}_hip"], row[f"y_{side}_hip"]]
        knee = [row[f"x_{side}_knee"], row[f"y_{side}_knee"]]
        return calculate_angle(shoulder, hip, knee)

    df["left_torso_angle"] = df.apply(lambda r: row_angle(r, "left"), axis=1)
    df["right_torso_angle"] = df.apply(lambda r: row_angle(r, "right"), axis=1)
    df["avg_torso_angle"] = (df["left_torso_angle"] + df["right_torso_angle"]) / 2

    for col in ["left_torso_angle", "right_torso_angle", "avg_torso_angle"]:
        s = df[col].dropna()
        print(f"\n--- {col} ---")
        print(f"  min={s.min():.1f}  max={s.max():.1f}  mean={s.mean():.1f}  median={s.median():.1f}")
        for p in [5, 10, 25, 50, 75, 90, 95]:
            print(f"  {p:>3}th percentile: {s.quantile(p/100):.1f}")

    keep_cols = ["vid_id", "frame_order", "left_torso_angle", "right_torso_angle", "avg_torso_angle"]
    df[keep_cols].to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()