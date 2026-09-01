"""
inspect_latpulldown_angles.py

Inspects the elbow-angle and torso-angle distributions from
extract_latpulldown_landmarks.py's output, to pick sensible
up/down thresholds (elbow) and a leaning-back floor (torso) -
same data-driven approach used for push-ups, not guesswork.

With only 2 source videos, treat these as a rough first pass -
watch the raw numbers per-video too (printed separately) since a
single video's lighting/angle could skew the pooled distribution.
"""

import pandas as pd
from pathlib import Path

DATASET_PATH = Path("../data/latpulldown_raw_angles.csv")

ELBOW_COL = "avg_elbow_angle"
TORSO_COL = "avg_torso_angle"


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Dataset not found at {path}. "
            f"Run extract_latpulldown_landmarks.py first to generate it."
        )
    return pd.read_csv(path)


def describe_angle_column(df: pd.DataFrame, col: str) -> None:
    series = df[col].dropna()
    print(f"\n--- {col} (pooled across all videos) ---")
    print(f"  count:  {len(series)}")
    print(f"  min:    {series.min():.1f}")
    print(f"  max:    {series.max():.1f}")
    print(f"  mean:   {series.mean():.1f}")
    print(f"  median: {series.median():.1f}")
    print(f"  std:    {series.std():.1f}")

    percentiles = [5, 10, 25, 50, 75, 90, 95]
    print(f"  percentiles:")
    for p in percentiles:
        val = series.quantile(p / 100)
        print(f"    {p:>3}th: {val:.1f}")


def describe_per_video(df: pd.DataFrame, col: str) -> None:
    print(f"\n--- {col} by video (check these aren't wildly different) ---")
    for source, group in df.groupby("source"):
        s = group[col].dropna()
        print(f"  {source}: min={s.min():.1f}  max={s.max():.1f}  mean={s.mean():.1f}  n={len(s)}")


def suggest_elbow_thresholds(df: pd.DataFrame) -> tuple[float, float]:
    """
    Elbow angle: large = arms extended overhead ("down" state, mirrors
    pullup naming - see exercises_config comment when this gets added).
    Small = pulled down to chest ("up" state).
    Bottom 20th percentile -> up territory, top 20th -> down territory.
    """
    series = df[ELBOW_COL].dropna()
    up_threshold = series.quantile(0.20)    # pulled down = small angle
    down_threshold = series.quantile(0.80)  # extended = large angle
    return up_threshold, down_threshold


def suggest_torso_floor(df: pd.DataFrame) -> float:
    """
    Torso angle (shoulder-hip-knee): leaning back reduces this angle.
    Suggest the 10th percentile as a starting "don't go below this"
    floor - reps where torso_angle dips below it mid-pull indicate
    leaning back to cheat the pull, not real lat engagement.
    """
    series = df[TORSO_COL].dropna()
    return series.quantile(0.10)


def main():
    df = load_dataset(DATASET_PATH)

    print("=" * 60)
    print("LAT PULLDOWN ANGLE DISTRIBUTION")
    print("=" * 60)
    print(f"Total frames: {len(df)}")
    print(f"Total videos: {df['source'].nunique()}")

    for col in [ELBOW_COL, TORSO_COL]:
        describe_angle_column(df, col)
        describe_per_video(df, col)

    print("\n" + "=" * 60)
    print("SUGGESTED STARTING THRESHOLDS")
    print("=" * 60)

    up_t, down_t = suggest_elbow_thresholds(df)
    print(f"{ELBOW_COL}:")
    print(f"  suggest latpulldown_up   (pulled down) if angle < {up_t:.1f}")
    print(f"  suggest latpulldown_down (extended)    if angle > {down_t:.1f}")

    torso_floor = suggest_torso_floor(df)
    print(f"\n{TORSO_COL}:")
    print(f"  suggest MIN_VALID_TORSO_ANGLE (leaning-back floor) = {torso_floor:.1f}")
    print(f"  (a rep where avg_torso_angle drops below this mid-pull = leaning back)")

    print("\nNote: these are statistical starting points from only 2 videos -")
    print("sanity-check visually before locking them in. Same caveat applies")
    print("more here than it did for push-up, which had far more source videos.")


if __name__ == "__main__":
    main()