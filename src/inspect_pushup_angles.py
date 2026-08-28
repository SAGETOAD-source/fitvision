"""
inspect_pushup_angles.py

Inspects the elbow-angle distributions in the filtered push-up dataset,
to pick sensible up/down thresholds - the same rigor we used for squats,
but based on Kaggle's real data instead of guessing.
"""

import pandas as pd
from pathlib import Path

DATASET_PATH = Path("../data/push_up_kaggle_dataset.csv")

LEFT_COL = "left_wrist_left_elbow_left_shoulder"
RIGHT_COL = "right_wrist_right_elbow_right_shoulder"


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {path}. "
            f"Run prepare_kaggle_data.py first to generate it."
        )
    df = pd.read_csv(path)

    required_cols = {LEFT_COL, RIGHT_COL, "vid_id"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing expected columns: {missing}")

    return df


def describe_angle_column(df: pd.DataFrame, col: str) -> None:
    series = df[col].dropna()
    print(f"\n--- {col} ---")
    print(f"  count:  {len(series)}")
    print(f"  min:    {series.min():.1f}")
    print(f"  max:    {series.max():.1f}")
    print(f"  mean:   {series.mean():.1f}")
    print(f"  median: {series.median():.1f}")
    print(f"  std:    {series.std():.1f}")

    # Percentile breakdown - helps spot where "up" and "down" clusters likely sit
    percentiles = [5, 10, 25, 50, 75, 90, 95]
    print(f"  percentiles:")
    for p in percentiles:
        val = series.quantile(p / 100)
        print(f"    {p:>3}th: {val:.1f}")


def suggest_thresholds(df: pd.DataFrame, col: str) -> tuple[float, float]:
    """
    Rough heuristic: treat the bottom 20th percentile as 'down' territory
    and the top 20th percentile as 'up' territory. These are starting
    points, not final values - always sanity-check visually afterward.
    """
    series = df[col].dropna()
    down_threshold = series.quantile(0.20)
    up_threshold = series.quantile(0.80)
    return down_threshold, up_threshold


def main():
    df = load_dataset(DATASET_PATH)

    print("=" * 60)
    print("PUSH-UP ELBOW ANGLE DISTRIBUTION")
    print("=" * 60)
    print(f"Total frames: {len(df)}")
    print(f"Total videos: {df['vid_id'].nunique()}")

    for col in [LEFT_COL, RIGHT_COL]:
        describe_angle_column(df, col)

    print("\n" + "=" * 60)
    print("SUGGESTED STARTING THRESHOLDS")
    print("=" * 60)
    for col in [LEFT_COL, RIGHT_COL]:
        down_t, up_t = suggest_thresholds(df, col)
        print(f"{col}:")
        print(f"  suggest pushup_down if angle < {down_t:.1f}")
        print(f"  suggest pushup_up   if angle > {up_t:.1f}")

    print("\nNote: these are statistical starting points based on the")
    print("overall distribution, not verified against real up/down labels.")
    print("Treat them as a first guess to refine, same as we did for squats.")


if __name__ == "__main__":
    main()