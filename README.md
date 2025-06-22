# 🌍 Earthquake 

# Earthquake Analytics Dashboard

A comprehensive web application for analyzing global earthquake data from 1995-2023.

## Features

### Enhanced Heatmap Analysis
- **Interactive Geographic Heatmap**: Visualize earthquake intensity across the globe with customizable parameters
- **Multiple Intensity Metrics**: Choose between magnitude, depth, significance, or event count for heatmap visualization
- **Adjustable Parameters**: 
  - Heatmap radius (5-50 pixels)
  - Blur intensity (5-25 pixels)
  - Maximum zoom level (10-18)
  - Toggle heatmap layer and individual markers
- **Real-time Updates**: Heatmap updates automatically when filters are applied
- **Color-coded Legend**: Dynamic legend showing the current metric and value range

### Correlation Analysis
- **Parameter Correlation Matrix**: Heatmap showing relationships between earthquake parameters
- **Multiple Correlation Methods**: 
  - Pearson correlation coefficient
  - Spearman rank correlation
- **Interactive Controls**: Toggle correlation values display
- **Parameter Analysis**: Magnitude, Depth, Significance, Latitude, Longitude correlations

### Existing Features
- **Interactive Map**: Geographic distribution of earthquakes with individual markers
- **Statistical Visualizations**: Violin plots, time series, pie charts, bar charts
- **Advanced Filtering**: Filter by magnitude, depth, date range, and earthquake type
- **Anomaly Detection**: Statistical anomaly detection with customizable thresholds
- **Prediction Model**: Machine learning-based earthquake risk prediction
- **Data Table**: Paginated data table with search functionality
- **Dark Mode**: Toggle between light and dark themes

## Technical Implementation

### Frontend Technologies
- **HTML5/CSS3**: Modern responsive design with neumorphic styling
- **JavaScript (ES6+)**: Interactive visualizations and data processing
- **Bootstrap 5**: Responsive grid system and components
- **Leaflet.js**: Interactive maps with heatmap plugin
- **Plotly.js**: Advanced statistical visualizations

### Backend Technologies
- **Flask**: Python web framework
- **Pandas**: Data manipulation and analysis
- **Scikit-learn**: Machine learning model for predictions
- **Joblib**: Model serialization and loading

### Data Processing
- **Real-time Filtering**: Client-side data filtering for responsive UI
- **Statistical Analysis**: Correlation analysis, anomaly detection, and descriptive statistics
- **Geographic Processing**: Coordinate validation and spatial analysis

## Installation and Usage

1. Install Python dependencies:
   ```bash
   pip install flask pandas scikit-learn joblib
   ```

2. Run the application:
   ```bash
   python app.py
   ```

3. Open your browser and navigate to `http://localhost:5000`

## Data Sources

The application uses cleaned earthquake data from the USGS (United States Geological Survey) covering the period 1995-2023, including:
- Magnitude and depth measurements
- Geographic coordinates
- Timestamp information
- Significance scores
- Tsunami indicators
- Location details

## Contributing

Feel free to submit issues and enhancement requests!

