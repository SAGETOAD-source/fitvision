"""
prepare_jumpingjack_training_data.py

Applies loosened arm+leg thresholds to Kaggle's jumping-jack angle data,
requiring both signals to agree before labeling a frame as jack_in/jack_out.
"""

import pandas as pd
from pathlib import Path

INPUT_PATH = Path("../data/jumpingjack_raw_angles.csv")
OUTPUT_PATH = Path("../data/jumpingjack_training_dataset.csv")

ARM_COL_LEFT = "left_elbow_left_shoulder_left_hip"
ARM_COL_RIGHT = "right_elbow_right_shoulder_right_hip"
LEG_COL = "right_knee_mid_hip_left_knee"

ARM_DOWN_THRESHOLD = 35
ARM_UP_THRESHOLD = 125

LEG_IN_THRESHOLD = 25
LEG_OUT_THRESHOLD = 55


def load_data(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}. Run prepare_jumpingjack_data.py first.")
    df = pd.read_csv(path)
    required = {ARM_COL_LEFT, ARM_COL_RIGHT, LEG_COL, "vid_id"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns: {missing}")
    return df


def label_row(avg_arm_angle: float, leg_angle: float) -> str | None:
    arms_up = avg_arm_angle > ARM_UP_THRESHOLD
    arms_down = avg_arm_angle < ARM_DOWN_THRESHOLD
    legs_out = leg_angle > LEG_OUT_THRESHOLD
    legs_in = leg_angle < LEG_IN_THRESHOLD

    if arms_up and legs_out:
        return "jack_out"
    elif arms_down and legs_in:
        return "jack_in"
    return None  # signals disagree or both mid-range - skip


def main():
    df = load_data(INPUT_PATH)

    df["avg_arm_angle"] = (df[ARM_COL_LEFT] + df[ARM_COL_RIGHT]) / 2
    df["label"] = df.apply(lambda row: label_row(row["avg_arm_angle"], row[LEG_COL]), axis=1)

    before = len(df)
    labeled_df = df.dropna(subset=["label"]).copy()
    after = len(labeled_df)

    print(f"Total frames before labeling: {before}")
    print(f"Frames kept (clear in/out):   {after}")
    print(f"Frames dropped:               {before - after}")

    print("\nLabel distribution:")
    print(labeled_df["label"].value_counts().to_string())

    output_cols = [ARM_COL_LEFT, ARM_COL_RIGHT, LEG_COL, "label", "vid_id"]
    final_df = labeled_df[output_cols].rename(columns={
        ARM_COL_LEFT: "left_arm_angle",
        ARM_COL_RIGHT: "right_arm_angle",
        LEG_COL: "leg_spread_angle",
        "vid_id": "source"
    })

    final_df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved labeled dataset to: {OUTPUT_PATH}")
    print(f"\nSample rows:")
    print(final_df.head(5).to_string(index=False))


if __name__ == "__main__":
    main()