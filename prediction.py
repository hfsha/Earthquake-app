import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.preprocessing import StandardScaler, RobustScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.svm import SVC
import xgboost as xgb
from sklearn.feature_selection import SelectFromModel
import joblib
import warnings
import os
warnings.filterwarnings('ignore')

def evaluate_model(model, X_train, y_train, X_test, y_test, model_name):
    """Enhanced evaluation function with multiple metrics"""
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    print(f"\n{model_name} Model Evaluation")
    print("-" * 50)
    print(f"Accuracy: {accuracy:.4f}")
    print(f"ROC AUC: {roc_auc:.4f}\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, digits=4))
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    return accuracy, roc_auc

def create_advanced_features(df):
    """Create advanced features for better prediction"""
    # Basic features
    features = ['magnitude', 'depth', 'latitude', 'longitude']
    
    # Add derived features
    df['magnitude_depth_ratio'] = df['magnitude'] / df['depth']
    df['distance_from_equator'] = abs(df['latitude'])
    df['seismic_energy'] = 10 ** (1.5 * df['magnitude'] + 4.8)
    df['is_coastal'] = (df['depth'] < 50).astype(int)
    
    # Add time-based features
    df['hour_sin'] = np.sin(2 * np.pi * df['hour']/24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour']/24)
    df['month_sin'] = np.sin(2 * np.pi * df['month']/12)
    df['month_cos'] = np.cos(2 * np.pi * df['month']/12)
    
    # Add location-based features
    df['distance_from_shore'] = df['depth'] * np.cos(np.radians(df['latitude']))
    
    # Add magnitude-based features
    df['magnitude_squared'] = df['magnitude'] ** 2
    df['magnitude_cubed'] = df['magnitude'] ** 3
    
    # Add interaction features
    df['mag_depth_interaction'] = df['magnitude'] * df['depth']
    df['mag_lat_interaction'] = df['magnitude'] * df['latitude']
    
    # Update features list
    features.extend([
        'magnitude_depth_ratio', 'distance_from_equator', 'seismic_energy',
        'is_coastal', 'hour_sin', 'hour_cos', 'month_sin', 'month_cos',
        'distance_from_shore', 'magnitude_squared', 'magnitude_cubed',
        'mag_depth_interaction', 'mag_lat_interaction'
    ])
    
    return df[features]

def optimize_model(model, X_train, y_train, param_grid):
    """Optimize model hyperparameters using GridSearchCV"""
    grid_search = GridSearchCV(
        model,
        param_grid,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        scoring='roc_auc',
        n_jobs=-1,
        verbose=1
    )
    grid_search.fit(X_train, y_train)
    return grid_search.best_estimator_

# Load and prepare the cleaned dataset
print("Loading and preparing data...")
df = pd.read_csv('data/earthquake_cleaned.csv')

# Create advanced features
X = create_advanced_features(df)
y = df['tsunami']

# Create and fit label encoder for target variable
print("\nCreating label encoder for target variable...")
le_target = LabelEncoder()
y_encoded = le_target.fit_transform(y)

# Train/test split with stratification
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded)

# Define preprocessing
preprocessor = RobustScaler()  # More robust to outliers than StandardScaler

# Define base models with initial parameters
base_models = {
    'XGBoost': xgb.XGBClassifier(
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42,
        n_estimators=1000,
        learning_rate=0.01
    ),
    'RandomForest': RandomForestClassifier(
        random_state=42,
        n_estimators=1000,
        max_depth=10,
        min_samples_split=5
    ),
    'GradientBoosting': GradientBoostingClassifier(
        random_state=42,
        n_estimators=1000,
        learning_rate=0.01
    )
}

# Define parameter grids for optimization
param_grids = {
    'XGBoost': {
        'classifier__max_depth': [3, 5, 7],
        'classifier__min_child_weight': [1, 3, 5],
        'classifier__gamma': [0, 0.1, 0.2],
        'classifier__subsample': [0.8, 0.9, 1.0]
    },
    'RandomForest': {
        'classifier__max_depth': [5, 10, 15],
        'classifier__min_samples_split': [2, 5, 10],
        'classifier__min_samples_leaf': [1, 2, 4]
    },
    'GradientBoosting': {
        'classifier__max_depth': [3, 5, 7],
        'classifier__min_samples_split': [2, 5, 10],
        'classifier__subsample': [0.8, 0.9, 1.0]
    }
}

print("\nTraining and optimizing models...")
best_models = {}
best_scores = {}

# Train and optimize each model
for name, model in base_models.items():
    print(f"\nOptimizing {name}...")
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', model)
    ])
    
    # Optimize model
    best_model = optimize_model(pipeline, X_train, y_train, param_grids[name])
    best_models[name] = best_model
    
    # Evaluate optimized model
    accuracy, roc_auc = evaluate_model(best_model, X_train, y_train, X_test, y_test, name)
    best_scores[name] = (accuracy, roc_auc)

# Create voting classifier with best models
print("\nCreating ensemble model...")
voting_clf = VotingClassifier(
    estimators=[(name, model) for name, model in best_models.items()],
    voting='soft',
    weights=[score[1] for score in best_scores.values()]  # Weight by ROC AUC
)

# Train and evaluate ensemble
voting_clf.fit(X_train, y_train)
accuracy, roc_auc = evaluate_model(voting_clf, X_train, y_train, X_test, y_test, "Ensemble")

# Save the best model (ensemble) and label encoder
print("\nSaving best model and label encoder...")
# Create models directory if it doesn't exist
os.makedirs('models', exist_ok=True)

# Save the model pipeline
joblib.dump(voting_clf, 'models/earthquake_model.pkl')
# Save the label encoder
joblib.dump(le_target, 'models/earthquake_label_encoder.pkl')

# Print feature importance
print("\nFeature Importance Analysis:")
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': best_models['XGBoost'].named_steps['classifier'].feature_importances_
})
print(feature_importance.sort_values('importance', ascending=False))

print('\nSaved best model pipeline and label encoder.')