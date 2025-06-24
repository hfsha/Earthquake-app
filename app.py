from flask import Flask, render_template, request, jsonify
import pandas as pd
import joblib
from datetime import datetime
import os
import numpy as np
import json

app = Flask(__name__)

# --- Global Variables ---
df = pd.DataFrame()
model = None
model_columns = None

# --- Application Startup: Load Data and Model ---
def load_essentials():
    global df, model, model_columns
    
    # Using the relative paths that worked in your environment
    data_path = 'Earthquake-app/data/earthquake_cleaned.csv'
    model_path = 'Earthquake-app/models/earthquake_model.pkl'
    columns_path = 'Earthquake-app/models/model_columns.pkl'
    
    # Load earthquake data
    try:
        print(f"Attempting to load data from: '{data_path}'")
        df = pd.read_csv(data_path)
        
        # CRITICAL FIX: Replace numpy's NaN with Python's None for JSON compatibility
        # This prevents the "Unexpected token N" error on the frontend.
        df = df.astype(object).where(pd.notnull(df), None)
        
        df['date_time'] = pd.to_datetime(df['date_time'])
        print(f"Successfully loaded data with {len(df)} rows.")
    except FileNotFoundError:
        print(f"---")
        print(f"CRITICAL ERROR: Data file not found at '{data_path}'.")
        print(f"Please ensure you are running this script from the correct root directory (the parent of the 'Earthquake-app' folder).")
        print(f"---")
        df = pd.DataFrame()

    # Load the prediction model and columns
    try:
        print(f"Loading prediction model from: '{model_path}'")
        model = joblib.load(model_path)
        model_columns = joblib.load(columns_path)
        print("Prediction model and columns loaded successfully.")
    except FileNotFoundError:
        print("Warning: Prediction model or columns not found. Prediction API will not work.")
        model = None
        model_columns = None

# --- Routes ---

@app.route('/')
def home():
    """Renders the main dashboard page."""
    return render_template('index.html')

@app.route('/api/data')
def api_data():
    """Provides the main dataset to the frontend."""
    if df.empty:
        return jsonify({'error': 'Data not available, DataFrame is empty.'}), 500
        
    try:
        data_to_send = df.copy()
        if 'date_time' in data_to_send.columns:
            # Convert datetime to string for JSON
            data_to_send['date_time'] = data_to_send['date_time'].astype(str)
        records = data_to_send.to_dict(orient='records')
        return jsonify(records)
    except Exception as e:
        print(f"Error in /api/data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict', methods=['POST'])
def predict():
    """Handles prediction requests from the frontend."""
    if not model or not model_columns:
        return jsonify({'success': False, 'error': 'Model not loaded on the server.'})

    try:
        data = request.get_json()
        input_df = pd.DataFrame([data])[model_columns]
        prediction_encoded = model.predict(input_df)
        prediction_label = 'High Risk' if prediction_encoded[0] == 1 else 'Low Risk'
        return jsonify({'success': True, 'prediction': prediction_label})
    except Exception as e:
        print(f"An error occurred during prediction: {e}")
        return jsonify({'success': False, 'error': str(e)})

# --- Main Execution ---
if __name__ == '__main__':
    load_essentials()
    app.run(debug=True, port=5000)
