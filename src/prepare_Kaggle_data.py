"""
prepare_kaggle_data.py

Filters the Kaggle multi-exercise dataset (angles.csv + labels.csv) down to
a single target exercise, validates the result, and saves a clean CSV ready
for feature engineering / model training.
"""

import pandas as pd
from pathlib import Path

# --- Config ---
DATA_DIR = Path("../data/Kaggle")
LABELS_PATH = DATA_DIR / "labels.csv"
ANGLES_PATH = DATA_DIR / "angles.csv"
OUTPUT_DIR = Path("../data")
TARGET_EXERCISE = "push_up"


def load_labels(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Labels file not found: {path}")
    df = pd.read_csv(path)
    required_cols = {"vid_id", "class"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"labels.csv is missing expected columns: {missing}")
    return df


def load_angles(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Angles file not found: {path}")
    df = pd.read_csv(path)
    if "vid_id" not in df.columns:
        raise ValueError("angles.csv is missing the 'vid_id' column")
    return df


def filter_by_exercise(labels_df: pd.DataFrame, angles_df: pd.DataFrame, exercise: str) -> pd.DataFrame:
    available_classes = labels_df["class"].unique().tolist()
    if exercise not in available_classes:
        raise ValueError(
            f"'{exercise}' not found in labels. Available classes: {available_classes}"
        )

    video_ids = labels_df.loc[labels_df["class"] == exercise, "vid_id"]
    filtered = angles_df[angles_df["vid_id"].isin(video_ids)].copy()

    if filtered.empty:
        raise ValueError(f"No angle rows matched any '{exercise}' video IDs. Check that vid_id keys align between files.")

    filtered["exercise"] = exercise
    return filtered


def summarize(labels_df: pd.DataFrame, filtered_df: pd.DataFrame, exercise: str) -> None:
    print("=" * 60)
    print("KAGGLE DATASET SUMMARY")
    print("=" * 60)
    print(f"\nAll exercise classes and video counts:")
    print(labels_df["class"].value_counts().to_string())

    n_videos = filtered_df["vid_id"].nunique()
    n_frames = len(filtered_df)
    print(f"\nTarget exercise: '{exercise}'")
    print(f"  Videos matched:  {n_videos}")
    print(f"  Frames matched:  {n_frames}")
    print(f"  Avg frames/video: {n_frames / n_videos:.1f}")

    angle_cols = [c for c in filtered_df.columns if c not in ("vid_id", "frame_order", "exercise")]
    print(f"\nAvailable angle columns ({len(angle_cols)}):")
    for col in angle_cols:
        print(f"  - {col}")

    print(f"\nSample rows:")
    print(filtered_df.head(5).to_string(index=False))

    print(f"\nMissing values per column:")
    na_counts = filtered_df[angle_cols].isna().sum()
    print(na_counts[na_counts > 0].to_string() if na_counts.any() else "  None")
    print("=" * 60)


def main():
    labels_df = load_labels(LABELS_PATH)
    angles_df = load_angles(ANGLES_PATH)

    filtered_df = filter_by_exercise(labels_df, angles_df, TARGET_EXERCISE)

    summarize(labels_df, filtered_df, TARGET_EXERCISE)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{TARGET_EXERCISE}_kaggle_dataset.csv"
    filtered_df.to_csv(output_path, index=False)
    print(f"\nSaved filtered dataset to: {output_path}")


if __name__ == "__main__":
    main()