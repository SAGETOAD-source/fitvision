"""
prepare_situp_training_data.py

Applies torso-angle thresholds to the computed sit-up data,
producing a clean labeled CSV ready for training.
"""

import pandas as pd
from pathlib import Path

INPUT_PATH = Path("../data/situp_raw_angles.csv")
OUTPUT_PATH = Path("../data/situp_training_dataset.csv")

DOWN_THRESHOLD = 150  # lying down
UP_THRESHOLD = 70     # sat up


def label_row(avg_angle: float) -> str | None:
    if avg_angle > DOWN_THRESHOLD:
        return "situp_down"
    elif avg_angle < UP_THRESHOLD:
        return "situp_up"
    return None


def main():
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {INPUT_PATH}. Run prepare_situp_data.py first.")

    df = pd.read_csv(INPUT_PATH)
    df["label"] = df["avg_torso_angle"].apply(label_row)

    before = len(df)
    labeled_df = df.dropna(subset=["label"]).copy()
    after = len(labeled_df)

    print(f"Total frames before labeling: {before}")
    print(f"Frames kept (clear up/down):  {after}")
    print(f"Frames dropped (transition):  {before - after}")

    print("\nLabel distribution:")
    print(labeled_df["label"].value_counts().to_string())

    output_cols = ["left_torso_angle", "right_torso_angle", "label", "vid_id"]
    final_df = labeled_df[output_cols].rename(columns={"vid_id": "source"})

    final_df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved to: {OUTPUT_PATH}")
    print(final_df.head(5).to_string(index=False))


if __name__ == "__main__":
    main()