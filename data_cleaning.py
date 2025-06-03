import pandas as pd
import numpy as np
from datetime import datetime
import re
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# Initialize Nominatim geocoder with a user agent and rate limiter
geolocator = Nominatim(user_agent="earthquake_app_geocoding")
# Rate limit requests to 1 second between calls to comply with Nominatim policy
geocode = RateLimiter(geolocator.reverse, min_delay_seconds=1)

def extract_magnitude_from_title(title):
    """Extract magnitude from title using regex"""
    match = re.search(r'M\s*(\d+\.?\d*)', title)
    return float(match.group(1)) if match else np.nan

def extract_location_details(location):
    """Extract city and country from location string"""
    if pd.isna(location):
        return pd.Series([np.nan, np.nan])
    
    parts = location.split(',')
    city = parts[0].strip() if len(parts) > 0 else np.nan
    country = parts[-1].strip() if len(parts) > 1 else np.nan
    return pd.Series([city, country])

def calculate_seismic_energy(magnitude):
    """Calculate seismic energy in joules using Gutenberg-Richter relationship"""
    return 10 ** (1.5 * magnitude + 4.8)

def clean_earthquake_data(input_file, output_file):
    """
    Clean and prepare earthquake dataset for analysis and visualization
    with advanced preprocessing techniques
    """
    # Read the dataset
    df = pd.read_csv(input_file)
    
    # Convert date_time to datetime
    df['date_time'] = pd.to_datetime(df['date_time'], format='%d-%m-%Y %H:%M')
    
    # Extract additional time features
    df['year'] = df['date_time'].dt.year
    df['month'] = df['date_time'].dt.month
    df['day'] = df['date_time'].dt.day
    df['hour'] = df['date_time'].dt.hour
    df['day_of_week'] = df['date_time'].dt.dayofweek
    df['quarter'] = df['date_time'].dt.quarter
    
    # Extract magnitude from title as a backup
    df['magnitude_from_title'] = df['title'].apply(extract_magnitude_from_title)
    
    # Clean magnitude data - use title magnitude if main magnitude is missing
    df['magnitude'] = pd.to_numeric(df['magnitude'], errors='coerce')
    df['magnitude'] = df['magnitude'].fillna(df['magnitude_from_title'])
    
    # Clean depth data
    df['depth'] = pd.to_numeric(df['depth'], errors='coerce')
    
    # Clean coordinates
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
    
    # Extract location details
    location_details = df['location'].apply(extract_location_details)
    df['city'] = location_details[0]
    df['location_country'] = location_details[1]
    
    # Clean tsunami data
    df['tsunami'] = df['tsunami'].map({0: 0, 1: 1})
    
    # Clean alert data
    df['alert'] = df['alert'].fillna('unknown')
    
    # Clean country data - use location_country if country is missing
    df['country'] = df['country'].fillna(df['location_country'])
    # Ensure 'location' is treated case-insensitively for 'unknown'
    df['country'] = df['country'].replace('unknown', 'Unknown', regex=True) # Replace lowercase 'unknown' first
    df['country'] = df['country'].fillna('Unknown') # Fill remaining NaNs
    
    # Clean continent data
    df['continent'] = df['continent'].fillna('Unknown')
    
    # --- Geocode 'Unknown' locations using Latitude and Longitude ---
    print("Attempting to geocode unknown locations...")
    # Look for both 'Unknown' and 'unknown' if not already handled
    unknown_locations_mask = df['location'].str.lower() == 'unknown'
    unknown_count_before = unknown_locations_mask.sum()
    print(f"Found {unknown_count_before} rows with Unknown location.")

    if unknown_count_before > 0:
        # Filter DataFrame to only include rows needing geocoding
        df_to_geocode = df[unknown_locations_mask].copy()

        locations_update = []
        # Use iterrows is generally discouraged for large dataframes due to performance,
        # but for geocoding external API calls, it's often simpler to handle row by row.
        # For very large datasets, consider batch geocoding if the service supports it.
        for index, row in df_to_geocode.iterrows():
            lat = row['latitude']
            lon = row['longitude']
            location_name = 'Unknown' # Default if geocoding fails
            
            # Ensure lat/lon are valid numbers before attempting to geocode
            if pd.notnull(lat) and pd.notnull(lon) and isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
                try:
                    # Use the RateLimiter wrapper for geocoding (coords to address)
                    location = geocode(f"{lat}, {lon}", language='en')
                    if location and location.address:
                         # Use the full address returned by the geocoder
                         location_name = location.address
                         # print(f"Geocoded {lat},{lon} to {location_name}") # Optional: print each geocoded location
                    # else: print(f"Could not geocode {lat},{lon}") # Optional: print failures

                except Exception as e:
                    # print(f"Error geocoding {lat},{lon}: {e}") # Optional: print errors
                    location_name = 'Unknown' # Keep as Unknown on error
            # else: print(f"Invalid lat/lon for geocoding at index {index}: {lat}, {lon}") # Optional: print invalid coords
                 
            # Store update information
            locations_update.append({'index': index, 'location': location_name})

        # Update the original DataFrame with geocoded locations
        for loc_info in locations_update:
             # Use .loc for label-based indexing
             df.loc[loc_info['index'], 'location'] = loc_info['location']
             
        unknown_count_after = (df['location'].str.lower() == 'unknown').sum() # Check case-insensitively again
        print(f"Finished geocoding. {unknown_count_before - unknown_count_after} locations updated, {unknown_count_after} remain Unknown.")
    # ------------------------------------------------------------------

    # Create magnitude categories with more detailed ranges
    df['magnitude_category'] = pd.cut(
        df['magnitude'],
        bins=[0, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 10],
        labels=['Micro', 'Minor', 'Light', 'Moderate', 'Strong', 'Major', 'Great', 'Severe', 'Catastrophic', 'Mega']
    )
    
    # Create depth categories with more detailed ranges
    df['depth_category'] = pd.cut(
        df['depth'],
        bins=[0, 70, 150, 300, 500, 700, float('inf')],
        labels=['Very Shallow', 'Shallow', 'Intermediate', 'Deep', 'Very Deep', 'Ultra Deep']
    )
    
    # Calculate seismic energy
    df['seismic_energy'] = df['magnitude'].apply(calculate_seismic_energy)
    
    # Create alert level categories
    df['alert_level'] = pd.Categorical(
        df['alert'],
        categories=['green', 'yellow', 'orange', 'red', 'unknown'],
        ordered=True
    )
    
    # Calculate distance from equator
    df['distance_from_equator'] = abs(df['latitude'])
    
    # Create time of day categories
    df['time_of_day'] = pd.cut(
        df['hour'],
        bins=[0, 6, 12, 18, 24],
        labels=['Night', 'Morning', 'Afternoon', 'Evening'],
        include_lowest=True
    )
    
    # Create season categories
    df['season'] = pd.cut(
        df['month'],
        bins=[0, 3, 6, 9, 12],
        labels=['Winter', 'Spring', 'Summer', 'Fall'],
        include_lowest=True
    )
    
    # Remove rows with missing values in essential columns
    essential_columns = ['magnitude', 'depth', 'latitude', 'longitude', 'tsunami', 'location']
    df = df.dropna(subset=essential_columns)
    
    # Calculate additional features
    df['magnitude_depth_ratio'] = df.apply(lambda row: row['magnitude'] / row['depth'] if row['depth'] != 0 else 0, axis=1)
    df['is_coastal'] = df['depth'] < 50
    
    # Save cleaned dataset
    df.to_csv(output_file, index=False)
    
    # Print dataset information
    print("\nDataset Information:")
    print("-" * 40)
    print(f"Total number of earthquakes: {len(df)}")
    print(f"Date range: {df['date_time'].min()} to {df['date_time'].max()}")
    print(f"Magnitude range: {df['magnitude'].min():.1f} to {df['magnitude'].max():.1f}")
    print(f"Depth range: {df['depth'].min():.1f} to {df['depth'].max():.1f} km")
    print(f"Number of tsunamis: {df['tsunami'].sum()}")
    print(f"Number of countries affected: {df['country'].nunique()}")
    print(f"Number of continents affected: {df['continent'].nunique()}")
    print("\nMagnitude Distribution:")
    print(df['magnitude_category'].astype(str).value_counts().sort_index())
    print("\nDepth Distribution:")
    print(df['depth_category'].astype(str).value_counts().sort_index())
    print("\nAlert Level Distribution:")
    print(df['alert_level'].astype(str).value_counts().sort_index())
    print("\nMissing values after cleaning:")
    print(df.isnull().sum()[df.isnull().sum() > 0])
    
    return df

if __name__ == "__main__":
    # Clean the dataset
    df = clean_earthquake_data(
        'Earthquake-app/data/earthquake_1995-2023.csv',
        'Earthquake-app/data/earthquake_cleaned.csv'
    ) 