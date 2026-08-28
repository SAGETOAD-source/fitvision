import pandas as pd
from sklearn.model_selection import GroupShuffleSplit
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import joblib

DATA_PATH = "../data/pullup_training_dataset.csv"
MODEL_PATH = "../models/rf_pullup_model.pkl"

df = pd.read_csv(DATA_PATH)

print("Dataset shape:", df.shape)
print(df["label"].value_counts())
print("\nUnique source videos:", df["source"].nunique())

X = df[["left_elbow_angle", "right_elbow_angle"]]
y = df["label"]
groups = df["source"]

splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
train_idx, test_idx = next(splitter.split(X, y, groups=groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

print(f"\nTrain videos: {groups.iloc[train_idx].nunique()}  Test videos: {groups.iloc[test_idx].nunique()}")

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

predictions = model.predict(X_test)

accuracy = accuracy_score(y_test, predictions)
print(f"\nAccuracy: {accuracy * 100:.2f}%")

print("\nConfusion Matrix (rows=actual, columns=predicted):")
print("Classes:", sorted(y.unique()))
print(confusion_matrix(y_test, predictions, labels=sorted(y.unique())))

print("\nClassification Report:")
print(classification_report(y_test, predictions))

joblib.dump(model, MODEL_PATH)
print(f"\nModel saved to {MODEL_PATH}")