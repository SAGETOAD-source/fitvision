"""
prepare_pullup_training_data.py

Filters Kaggle data to pull-up videos, applies elbow-angle thresholds,
and saves a labeled training CSV.
"""

import pandas as pd
from pathlib import Path

DATA_DIR = Path("../data/Kaggle")
LABELS_PATH = DATA_DIR / "labels.csv"
ANGLES_PATH = DATA_DIR / "angles.csv"
OUTPUT_PATH = Path("../data/pullup_training_dataset.csv")

TARGET_EXERCISE = "pull_up"

LEFT_COL = "left_wrist_left_elbow_left_shoulder"
RIGHT_COL = "right_wrist_right_elbow_right_shoulder"

DOWN_THRESHOLD = 150  # arms extended, hanging
UP_THRESHOLD = 95     # arms bent, pulled up


def label_row(avg_angle: float) -> str | None:
    if avg_angle > DOWN_THRESHOLD:
        return "pullup_down"
    elif avg_angle < UP_THRESHOLD:
        return "pullup_up"
    return None


def main():
    labels_df = pd.read_csv(LABELS_PATH)
    angles_df = pd.read_csv(ANGLES_PATH)

    video_ids = labels_df.loc[labels_df["class"] == TARGET_EXERCISE, "vid_id"]
    df = angles_df[angles_df["vid_id"].isin(video_ids)].copy()

    if df.empty:
        raise ValueError(f"No rows matched class '{TARGET_EXERCISE}'")

    print(f"Matched {df['vid_id'].nunique()} videos, {len(df)} frames")

    df["avg_elbow_angle"] = (df[LEFT_COL] + df[RIGHT_COL]) / 2
    df["label"] = df["avg_elbow_angle"].apply(label_row)

    before = len(df)
    labeled_df = df.dropna(subset=["label"]).copy()
    after = len(labeled_df)

    print(f"Frames kept (clear up/down):  {after} / {before}")
    print("\nLabel distribution:")
    print(labeled_df["label"].value_counts().to_string())

    output_cols = [LEFT_COL, RIGHT_COL, "label", "vid_id"]
    final_df = labeled_df[output_cols].rename(columns={
        LEFT_COL: "left_elbow_angle",
        RIGHT_COL: "right_elbow_angle",
        "vid_id": "source"
    })

    final_df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved to: {OUTPUT_PATH}")
    print(final_df.head(5).to_string(index=False))


if __name__ == "__main__":
    main()