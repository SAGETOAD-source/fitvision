import cv2
import mediapipe as mp
import numpy as np
import joblib

mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils

pose = mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

MODEL_PATH = "../models/rf_squat_model.pkl"
VIDEO_FILES = [
    "../raw_videos/squat.mp4",
    "../raw_videos/squat2.mp4",
    "../raw_videos/squat3.mp4"
]
DISPLAY_SIZE = (480, 854)
VISIBILITY_THRESHOLD = 0.3

UP_STATES = {"standing", "squat_up"}
DOWN_STATE = "squat_down"


def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return angle


def get_point(landmarks, landmark_id):
    lm = landmarks[landmark_id.value]
    return [lm.x, lm.y], lm.visibility


def extract_knee_angles(landmarks):
    joint_ids = [
        mp_pose.PoseLandmark.LEFT_HIP, mp_pose.PoseLandmark.LEFT_KNEE, mp_pose.PoseLandmark.LEFT_ANKLE,
        mp_pose.PoseLandmark.RIGHT_HIP, mp_pose.PoseLandmark.RIGHT_KNEE, mp_pose.PoseLandmark.RIGHT_ANKLE,
    ]
    points = {}
    for joint_id in joint_ids:
        point, visibility = get_point(landmarks, joint_id)
        if visibility < VISIBILITY_THRESHOLD:
            return None
        points[joint_id] = point

    left_angle = calculate_angle(
        points[mp_pose.PoseLandmark.LEFT_HIP],
        points[mp_pose.PoseLandmark.LEFT_KNEE],
        points[mp_pose.PoseLandmark.LEFT_ANKLE],
    )
    right_angle = calculate_angle(
        points[mp_pose.PoseLandmark.RIGHT_HIP],
        points[mp_pose.PoseLandmark.RIGHT_KNEE],
        points[mp_pose.PoseLandmark.RIGHT_ANKLE],
    )
    return left_angle, right_angle


def run_on_video(model, video_path):
    print(f"\n=== Testing: {video_path} ===")
    cap = cv2.VideoCapture(video_path)

    rep_count = 0
    in_squat = False

    prediction_counts = {"standing": 0, "squat_up": 0, "squat_down": 0}
    none_frame_count = 0
    total_frames = 0

    while True:
        success, frame = cap.read()
        if not success:
            print(f"Finished: {video_path}")
            break

        total_frames += 1
        frame = cv2.resize(frame, DISPLAY_SIZE)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(
                frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS
            )

            angles = extract_knee_angles(results.pose_landmarks.landmark)

            if angles is not None:
                left_angle, right_angle = angles
                prediction = model.predict([[left_angle, right_angle]])[0]

                prediction_counts[prediction] = prediction_counts.get(prediction, 0) + 1

                if prediction == DOWN_STATE:
                    in_squat = True
                elif prediction in UP_STATES and in_squat:
                    rep_count += 1
                    in_squat = False

                cv2.putText(
                    frame, f"Prediction: {prediction}",
                    (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2
                )
            else:
                none_frame_count += 1
                cv2.putText(
                    frame, "Low confidence - skipping",
                    (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2
                )

        cv2.putText(
            frame, f"Reps: {rep_count}",
            (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 0), 2
        )

        cv2.imshow("Live Prediction", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()

    print(f"Total frames: {total_frames}")
    print(f"Frames skipped (low visibility): {none_frame_count}")
    print("Prediction counts:", prediction_counts)
    print(f"Final rep count: {rep_count}")


def main():
    model = joblib.load(MODEL_PATH)

    for video_path in VIDEO_FILES:
        run_on_video(model, video_path)

    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()