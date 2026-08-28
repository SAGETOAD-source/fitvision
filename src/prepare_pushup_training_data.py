"""
prepare_pushup_training_data.py

Applies up/down thresholds to the filtered Kaggle push-up angle data,
producing a clean labeled CSV ready for training - same pattern used
for squats, but data-driven thresholds instead of guesses.
"""

import pandas as pd
from pathlib import Path

INPUT_PATH = Path("../data/push_up_kaggle_dataset.csv")
OUTPUT_PATH = Path("../data/pushup_training_dataset.csv")

LEFT_COL = "left_wrist_left_elbow_left_shoulder"
RIGHT_COL = "right_wrist_right_elbow_right_shoulder"

UP_THRESHOLD = 155
DOWN_THRESHOLD = 105


def load_data(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    df = pd.read_csv(path)
    required = {LEFT_COL, RIGHT_COL, "vid_id"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns: {missing}")
    return df


def label_row(avg_angle: float) -> str | None:
    if avg_angle > UP_THRESHOLD:
        return "pushup_up"
    elif avg_angle < DOWN_THRESHOLD:
        return "pushup_down"
    return None  # transition zone - skip


def main():
    df = load_data(INPUT_PATH)

    df["avg_elbow_angle"] = (df[LEFT_COL] + df[RIGHT_COL]) / 2
    df["label"] = df["avg_elbow_angle"].apply(label_row)

    before = len(df)
    labeled_df = df.dropna(subset=["label"]).copy()
    after = len(labeled_df)

    print(f"Total frames before labeling: {before}")
    print(f"Frames kept (clear up/down):  {after}")
    print(f"Frames dropped (transition):  {before - after}")

    print("\nLabel distribution:")
    print(labeled_df["label"].value_counts().to_string())

    output_cols = [LEFT_COL, RIGHT_COL, "label", "vid_id"]
    final_df = labeled_df[output_cols].rename(columns={
        LEFT_COL: "left_elbow_angle",
        RIGHT_COL: "right_elbow_angle",
        "vid_id": "source"
    })

    final_df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved labeled dataset to: {OUTPUT_PATH}")
    print(f"\nSample rows:")
    print(final_df.head(5).to_string(index=False))


if __name__ == "__main__":
    main()
    