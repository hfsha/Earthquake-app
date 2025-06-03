import pandas as pd
import numpy as np
import re
from datetime import datetime
import json
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# Initialize Nominatim geocoder with a user agent
geolocator = Nominatim(user_agent="earthquake_app")
geocode = RateLimiter(geolocator.reverse, min_delay_seconds=1)

def clean_data(df):
    # ... existing code ...

    # --- Geocode 'Unknown' locations using Latitude and Longitude ---
    print("Attempting to geocode unknown locations...")
    unknown_locations_mask = df['location'] == 'Unknown'
    unknown_count_before = unknown_locations_mask.sum()
    print(f"Found {unknown_count_before} rows with Unknown location.")

    if unknown_count_before > 0:
        # Filter DataFrame to only include rows needing geocoding
        df_to_geocode = df[unknown_locations_mask].copy()

        locations = []
        # Iterate through the filtered DataFrame
        for index, row in df_to_geocode.iterrows():
            lat = row['latitude']
            lon = row['longitude']
            location_name = 'Unknown'
            
            # Ensure lat/lon are valid numbers before attempting to geocode
            if pd.notnull(lat) and pd.notnull(lon) and isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                try:
                    # Use the RateLimiter wrapper for geocoding
                    # We reverse geocode (coords to address)
                    location = geocode(f"{lat}, {lon}", language='en')
                    if location and location.address:
                         # Use the full address or try to extract a relevant part
                         location_name = location.address
                         print(f"Geocoded {lat},{lon} to {location_name}")
                    else:
                        print(f"Could not geocode {lat},{lon}")

                except Exception as e:
                    print(f"Error geocoding {lat},{lon}: {e}")
                    # Keep location_name as 'Unknown' or handle error
                    location_name = 'Unknown'
            else:
                 print(f"Invalid lat/lon for geocoding at index {index}: {lat}, {lon}")
                 location_name = 'Unknown'
                 
            locations.append({'index': index, 'location': location_name})

        # Update the original DataFrame with geocoded locations
        for loc_info in locations:
             df.loc[loc_info['index'], 'location'] = loc_info['location']
             
        unknown_count_after = (df['location'] == 'Unknown').sum()
        print(f"Finished geocoding. {unknown_count_before - unknown_count_after} locations updated, {unknown_count_after} remain Unknown.")
    # ------------------------------------------------------------------

    # ... rest of the existing code ...

    return df

# Ensure the main part of your script that reads and writes the CSV calls clean_data
# For example, if your script looks like this:
# df = pd.read_csv('data/earthquake_data.csv')
# df_cleaned = clean_data(df)
# df_cleaned.to_csv('data/earthquake_cleaned.csv', index=False)
# The geocoding logic is now inside the clean_data function.

if __name__ == "__main__":
    input_csv_path = 'Earthquake-app/data/earthquake_data.csv'
    output_csv_path = 'Earthquake-app/data/earthquake_cleaned.csv'
    
    try:
        print(f"Reading raw data from {input_csv_path}...")
        raw_df = pd.read_csv(input_csv_path)
        print("Raw data read successfully. Cleaning data...")
        cleaned_df = clean_data(raw_df)
        print(f"Data cleaning complete. Saving cleaned data to {output_csv_path}...")
        cleaned_df.to_csv(output_csv_path, index=False)
        print("Cleaned data saved successfully.")
    except FileNotFoundError:
        print(f"Error: The file {input_csv_path} was not found.")
    except Exception as e:
        print(f"An error occurred during data cleaning or saving: {e}") 