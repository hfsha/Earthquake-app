from flask import Flask, render_template, request, jsonify
import pandas as pd
import joblib
from datetime import datetime
import os
import numpy as np # Import numpy for NaN checking
import json

app = Flask(__name__)

# Load earthquake data
try:
    print("Attempting to load earthquake data...")
    df = pd.read_csv('Earthquake-app/data/earthquake_cleaned.csv')
    print(f"Successfully loaded data with {len(df)} rows")
    print("Columns in dataset:", df.columns.tolist())
    
    # Add a check for the 'magType' column and its first few values
    if 'magType' in df.columns:
        print("'magType' column exists in the DataFrame.")
        print("Sample 'magType' values in DataFrame:")
        print(df['magType'].head())
    else:
        print("Error: 'magType' column NOT found in the DataFrame.")
        # You might need to check your CSV file or data loading process
    
    # Convert date_time column to datetime
    df['date_time'] = pd.to_datetime(df['date_time'])
    
    # --- Add logic to extract 'type' from 'title' ---
    def extract_type_from_title(title):
        if isinstance(title, str):
            # Convert to lowercase for case-insensitive matching
            title_lower = title.lower()
            
            # Check for specific event types based on keywords
            if 'nuclear explosion' in title_lower: return 'Nuclear Explosion'
            if 'rock burst' in title_lower: return 'Rock Burst'
            if 'explosion' in title_lower: return 'Explosion'
            
            # Add more checks for other specific types if needed, e.g., 'ice quake', 'volcanic activity'
            
            # Default to 'Earthquake' if no specific type is found
            return 'Earthquake'
        return 'Unknown'

    df['type'] = df['title'].apply(extract_type_from_title)
    print("Created 'type' column from 'title'. First few types:")
    print(df['type'].head())
    # --------------------------------------------------
    
    # Handle NaN values in all columns
    for col in df.columns:
        if df[col].dtype in ['float64', 'float32']:
            df[col] = df[col].fillna(0)
        elif df[col].dtype == 'object':
            df[col] = df[col].fillna('Unknown')
    
    # Convert all numeric columns to float to avoid NaN issues
    numeric_columns = df.select_dtypes(include=[np.number]).columns
    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
    
    print("Data types after conversion:")
    print(df.dtypes)

    # Add a check for the 'magType' column and its first few values right before sending data
    print("Checking 'magType' column before sending data:")
    if 'magType' in df.columns:
        print("'magType' column EXISTS in DataFrame before jsonify.")
        print("Sample 'magType' values:", df['magType'].head().tolist())
        print("Data type of 'magType':", df['magType'].dtype)
    else:
        print("Error: 'magType' column NOT FOUND in DataFrame before jsonify.")
    
    # Load model and label encoder
    print("Loading model and label encoder...")
    model_pipeline = joblib.load('Earthquake-app/models/earthquake_model.pkl')
    le_target = joblib.load('Earthquake-app/models/earthquake_label_encoder.pkl')
    print("Model and label encoder loaded successfully")
    
except Exception as e:
    print(f"Error during initialization: {str(e)}")
    raise

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def api_data():
    try:
        # Convert DataFrame to list of dictionaries
        data = df.to_dict(orient='records')
        
        # Convert datetime objects to strings
        for record in data:
            if 'date_time' in record and isinstance(record['date_time'], datetime):
                record['date_time'] = record['date_time'].isoformat()
        
        # Log the first few records being sent
        print("First 5 records being sent to frontend:", json.dumps(data[:5], indent=2))
        
        return jsonify(data)
    except Exception as e:
        print(f"Error in api_data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def api_predict():
    try:
        input_data = request.get_json()
        print("Received prediction input:", input_data)

        # Create a pandas DataFrame from the input data
        # Ensure all expected features are present, add NaNs for missing ones
        # Match the feature engineering steps in prediction.py
        predict_df = pd.DataFrame([input_data])

        # Add dummy values for other features required by the model pipeline if they are missing
        # This list of columns should match the columns used during model training
        model_features = ['latitude', 'longitude', 'magnitude', 'depth', 'type', 'magnitude_depth_ratio', 'distance_from_equator', 'seismic_energy', 'is_coastal', 'hour_sin', 'hour_cos', 'month_sin', 'month_cos', 'distance_from_shore', 'magnitude_squared', 'magnitude_cubed', 'mag_depth_interaction', 'mag_lat_interaction']

        for feature in model_features:
            if feature not in predict_df.columns:
                predict_df[feature] = None # Default to None if feature is missing in input

        # Derive or fill missing features based on available input, using Python syntax
        if 'depth' in predict_df.columns and 'magnitude' in predict_df.columns:
            predict_df['magnitude_depth_ratio'] = predict_df.apply(lambda row: row['magnitude'] / row['depth'] if row['depth'] != 0 and row['depth'] is not None else 0, axis=1)
        else:
             predict_df['magnitude_depth_ratio'] = None # Or 0, depending on model expectation for missing data

        if 'latitude' in predict_df.columns:
            predict_df['distance_from_equator'] = predict_df['latitude'].apply(lambda x: abs(x) if x is not None else 0)
        else:
            predict_df['distance_from_equator'] = None # Or 0

        if 'magnitude' in predict_df.columns:
             predict_df['seismic_energy'] = predict_df['magnitude'].apply(lambda x: 10 ** (1.5 * x + 4.8) if x is not None else 0)
             predict_df['magnitude_squared'] = predict_df['magnitude'].apply(lambda x: x**2 if x is not None else 0)
             predict_df['magnitude_cubed'] = predict_df['magnitude'].apply(lambda x: x**3 if x is not None else 0)
        else:
            predict_df['seismic_energy'] = None # Or 0
            predict_df['magnitude_squared'] = None # Or 0
            predict_df['magnitude_cubed'] = None # Or 0

        if 'depth' in predict_df.columns:
             predict_df['is_coastal'] = predict_df['depth'].apply(lambda x: 1 if x is not None and x < 50 else 0)
             predict_df['distance_from_shore'] = predict_df['depth'].apply(lambda x: x if x is not None else 0) # Simplified placeholder
        else:
            predict_df['is_coastal'] = None # Or 0
            predict_df['distance_from_shore'] = None # Or 0

        # Handle interaction terms - ensure component columns exist and are not None
        if 'magnitude' in predict_df.columns and 'depth' in predict_df.columns:
             predict_df['mag_depth_interaction'] = predict_df.apply(lambda row: row['magnitude'] * row['depth'] if row['magnitude'] is not None and row['depth'] is not None else 0, axis=1)
        else:
            predict_df['mag_depth_interaction'] = None # Or 0
            
        if 'magnitude' in predict_df.columns and 'latitude' in predict_df.columns:
             predict_df['mag_lat_interaction'] = predict_df.apply(lambda row: row['magnitude'] * row['latitude'] if row['magnitude'] is not None and row['latitude'] is not None else 0, axis=1)
        else:
            predict_df['mag_lat_interaction'] = None # Or 0

        # Time-based features - using placeholders as date/time input is missing
        if 'hour_sin' not in predict_df.columns: predict_df['hour_sin'] = 0
        if 'hour_cos' not in predict_df.columns: predict_df['hour_cos'] = 1 # Noon placeholder
        if 'month_sin' not in predict_df.columns: predict_df['month_sin'] = 0
        if 'month_cos' not in predict_df.columns: predict_df['month_cos'] = 1 # January placeholder
        

        # Convert 'type' column using the label encoder
        # Ensure 'type' column exists and handle potential unknown types
        if 'type' in predict_df.columns and predict_df['type'].iloc[0] is not None:
            try:
                # Ensure the type value is a string before transform
                type_value = str(predict_df['type'].iloc[0])
                if type_value in le_target.classes_:
                     predict_df['type'] = le_target.transform([type_value])[0]
                else:
                    print(f"Warning: Unknown earthquake type: {type_value}. Assigning a default.")
                    # Assign a default encoded value for unknown types, e.g., the most frequent class or a dedicated 'unknown' class if handled in training
                    # For now, we'll assign a placeholder value outside the normal range, adjust as per your model's handling of unseen labels
                    predict_df['type'] = -1 # Placeholder
            except Exception as e:
                print(f"Error processing 'type' for prediction: {e}")
                predict_df['type'] = -1 # Placeholder on error
        else:
             # Handle case where type is None or missing: extract from title if available
             if 'title' in input_data and isinstance(input_data['title'], str):
                 predict_df['type'] = extract_type_from_title(input_data['title'])
                 # Now encode the extracted type
                 try:
                      type_value = str(predict_df['type'].iloc[0])
                      if type_value in le_target.classes_:
                           predict_df['type'] = le_target.transform([type_value])[0]
                      else:
                          print(f"Warning: Unknown extracted earthquake type for prediction: {type_value}. Assigning a default.")
                          predict_df['type'] = -1 # Placeholder
                 except Exception as e:
                      print(f"Error encoding extracted type for prediction: {e}")
                      predict_df['type'] = -1 # Placeholder on error
             else:
                  predict_df['type'] = -1 # Final fallback if no type info at all

        # Ensure the order of columns matches the training data if necessary for the pipeline
        # This is important if your pipeline does not use column names (e.g., relies on positional input)
        # You would need the exact list of columns used during training in the correct order.
        # Example (replace with your actual training columns):
        # expected_cols = ['magnitude', 'depth', 'latitude', 'longitude', 'type', ...]
        # predict_df = predict_df[expected_cols]

        # Make prediction and get probabilities
        prediction = model_pipeline.predict(predict_df)[0]
        probabilities = model_pipeline.predict_proba(predict_df)[0]

        # Convert prediction label back to original string using label encoder
        # Check if the predicted label index is within the known classes
        if prediction >= 0 and prediction < len(le_target.classes_):
             predicted_label = le_target.inverse_transform([prediction])[0]
        else:
             predicted_label = "Unknown (Index out of bounds)"

        # Format probabilities with class labels
        prob_dict = dict(zip(le_target.classes_, probabilities))

        response_data = {
            'success': True,
            'prediction': predicted_label,
            'probabilities': prob_dict
        }
        return jsonify(response_data)

    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # In a production scenario, use a more robust server like Gunicorn or uWSGI
    # For development, debug=True is helpful but not recommended for production
    # Use 0.0.0.0 to make it accessible externally (if needed, be cautious)
    app.run(debug=True, port=5000)
