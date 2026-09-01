"""
prepare_latpulldown_training_data.py

Applies elbow-angle thresholds (picked from inspect_latpulldown_angles.py's
real distribution, not guessed) to the raw extracted lat pulldown data,
producing a clean labeled CSV ready for training - same pattern as
prepare_pushup_training_data.py / prepare_pullup_training_data.py.

State naming mirrors pull-up's convention (not push-up's), since the
underlying motion is analogous - arms extended = "down", arms pulled/
bent = "up":
  latpulldown_down = arms extended overhead (elbow angle large)
  latpulldown_up   = pulled down to chest   (elbow angle small)

torso_angle is carried through into the output but NOT used for
labeling here - it's a form-quality signal (leaning-back check), not
a state signal. It'll be used later in exercises_config.py / the
RepCounter as a ceiling check, not a classifier feature.
"""

import pandas as pd
from pathlib import Path

INPUT_PATH = Path("../data/latpulldown_raw_angles.csv")
OUTPUT_PATH = Path("../data/latpulldown_training_dataset.csv")

# From inspect_latpulldown_angles.py's real percentile output - not guesses.
UP_THRESHOLD = 84.9     # avg_elbow_angle below this -> pulled down (latpulldown_up)
DOWN_THRESHOLD = 147.2  # avg_elbow_angle above this -> extended (latpulldown_down)


def load_data(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found: {path}. Run extract_latpulldown_landmarks.py first."
        )
    df = pd.read_csv(path)
    required = {"left_elbow_angle", "right_elbow_angle", "avg_elbow_angle", "avg_torso_angle", "source"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing expected columns: {missing}")
    return df


def label_row(avg_elbow_angle: float) -> str | None:
    if avg_elbow_angle < UP_THRESHOLD:
        return "latpulldown_up"
    elif avg_elbow_angle > DOWN_THRESHOLD:
        return "latpulldown_down"
    return None  # transition zone - skip, same as every other exercise's labeling script


def main():
    df = load_data(INPUT_PATH)

    df["label"] = df["avg_elbow_angle"].apply(label_row)

    before = len(df)
    labeled_df = df.dropna(subset=["label"]).copy()
    after = len(labeled_df)

    print(f"Total frames before labeling: {before}")
    print(f"Frames kept (clear up/down):  {after}")
    print(f"Frames dropped (transition):  {before - after}")

    print("\nLabel distribution:")
    print(labeled_df["label"].value_counts().to_string())

    print("\nLabel distribution by video (make sure both videos contribute both labels):")
    print(labeled_df.groupby(["source", "label"]).size().to_string())

    output_cols = ["left_elbow_angle", "right_elbow_angle", "avg_torso_angle", "label", "source"]
    final_df = labeled_df[output_cols].rename(columns={"avg_torso_angle": "torso_angle"})

    final_df.to_csv(OUTPUT_PATH, index=False)
    print(f"\nSaved labeled dataset to: {OUTPUT_PATH}")
    print(f"\nSample rows:")
    print(final_df.head(5).to_string(index=False))


if __name__ == "__main__":
    main()