import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, RobustScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
import xgboost as xgb
import joblib
import warnings
import os

warnings.filterwarnings('ignore')

# --- Main Script ---

# 1. Load Data
# Correctly pathing to the data file from the project root.
DATA_PATH = os.path.join('Earthquake-app', 'data', 'earthquake_cleaned.csv')
MODELS_DIR = os.path.join('Earthquake-app', 'models')

print("Loading and preparing data...")
df = pd.read_csv(DATA_PATH)

# Handle potential infinite values and drop rows with missing essential data
df.replace([np.inf, -np.inf], np.nan, inplace=True)
df.dropna(subset=['magnitude', 'depth', 'latitude', 'longitude', 'sig', 'magType', 'tsunami'], inplace=True)


# 2. Define Features and Target
numeric_features = ['magnitude', 'depth', 'latitude', 'longitude', 'sig']
categorical_features = ['magType']
features = numeric_features + categorical_features
target = 'tsunami'

X = df[features]
y = df[target]

print(f"Features selected for modeling: {features}")


# 3. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
)


# 4. Create a Preprocessing Pipeline
numeric_transformer = RobustScaler()
categorical_transformer = OneHotEncoder(handle_unknown='ignore')

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)
    ],
    remainder='passthrough'
)


# 5. Define Models to Compare
base_models = {
    'XGBoost': xgb.XGBClassifier(
        objective='binary:logistic', eval_metric='logloss', use_label_encoder=False,
        random_state=42, n_estimators=200, learning_rate=0.1, max_depth=5
    ),
    'RandomForest': RandomForestClassifier(
        random_state=42, n_estimators=200, max_depth=10, n_jobs=-1
    ),
    'GradientBoosting': GradientBoostingClassifier(
        random_state=42, n_estimators=200, learning_rate=0.1, max_depth=5
    )
}

best_model = None
best_model_name = ""
best_accuracy = 0.0

# 6. Train, Evaluate, and Compare Models
for name, model in base_models.items():
    print(f"\n--- Training and Evaluating {name} ---")
    
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', model)
    ])
    
    pipeline.fit(X_train, y_train)
    
    y_pred = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, digits=4))
    
    if accuracy > best_accuracy:
        best_accuracy = accuracy
        best_model = pipeline
        best_model_name = name

print("-" * 50)
print(f"\n🏆 Best performing model: '{best_model_name}' with an accuracy of {best_accuracy:.4f}.")
print("-" * 50)

# 7. Save the Best Model and Columns
if best_model:
    print(f"\nSaving the best model ('{best_model_name}')...")
    os.makedirs(MODELS_DIR, exist_ok=True)

    joblib.dump(best_model, os.path.join(MODELS_DIR, 'earthquake_model.pkl'))
    joblib.dump(features, os.path.join(MODELS_DIR, 'model_columns.pkl'))

    print(f"Model and columns saved successfully in the '{MODELS_DIR}' directory.")
else:
    print("Could not determine the best model. Nothing was saved.")


# 8. Feature Importance Analysis for the Best Model
if best_model and hasattr(best_model.named_steps['classifier'], 'feature_importances_'):
    print("\n--- Feature Importance of Best Model ---")
    try:
        ohe_feature_names = best_model.named_steps['preprocessor'].named_transformers_['cat'].get_feature_names_out(categorical_features)
        final_feature_names = numeric_features + list(ohe_feature_names)
        importances = best_model.named_steps['classifier'].feature_importances_

        feature_importance_df = pd.DataFrame({
            'feature': final_feature_names,
            'importance': importances
        }).sort_values('importance', ascending=False)

        print(feature_importance_df.head(10))

    except Exception as e:
        print(f"Could not display feature importance: {e}")

print("\nPrediction script finished successfully.")