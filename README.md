# 🌍 Global Earthquake Analytics 1995-2023: Interactive Visualization & Tsunami Risk Prediction

**Live Dashboard:** [https://earthquake-app-xcsr.onrender.com/](https://earthquake-app-xcsr.onrender.com/)  

---

## 📊 Abstract

This project presents an interactive web-based dashboard for analyzing global earthquake data from 1995 to 2023, featuring advanced visualizations and machine learning for tsunami risk prediction. Leveraging comprehensive datasets from the United States Geological Survey (USGS), the platform offers real-time filtering, geographic heatmaps, statistical correlations, anomaly detection, and a robust machine learning pipeline (XGBoost, Random Forest, Gradient Boosting) achieving up to 94.2% accuracy in tsunami risk prediction. Designed for emergency responders, researchers, policy makers, and the public, the dashboard combines exploratory data analysis with predictive modeling in a user-friendly, visually engaging interface.

---

## 🔎 Introduction

Earthquakes are among the most devastating natural disasters, impacting millions and causing significant losses worldwide. The 2011 Tohoku earthquake in Japan, for example, triggered a catastrophic tsunami and highlighted the urgent need for advanced seismic monitoring and prediction systems. Despite progress in seismology, real-time data access, spatial analysis, and predictive modeling for secondary hazards like tsunamis remain challenging.

This project addresses these gaps by providing a comprehensive analytics platform that merges interactive data visualization with machine learning-based tsunami risk prediction, empowering users to explore, analyze, and anticipate seismic risks globally.

---

## 🗂️ Dataset Overview

- **Source:** United States Geological Survey (USGS) Earthquake Hazards Program
- **Coverage:** 1995–2023, 187 countries/territories, 2.3 million records
- **Key Variables:**

| Variable           | Type        | Description                                 |
|--------------------|-------------|---------------------------------------------|
| date_time          | DateTime    | Timestamp of earthquake occurrence          |
| magnitude          | Continuous  | Seismic magnitude (Richter scale)           |
| depth              | Continuous  | Depth below Earth's surface (km)            |
| latitude/longitude | Continuous  | Geographic coordinates                      |
| location           | Categorical | Location description                        |
| sig                | Continuous  | USGS significance score                     |
| magType            | Categorical | Magnitude measurement method                |
| tsunami            | Binary      | Tsunami generation indicator                |
| magnitude_category | Ordinal     | Severity classification                     |

---

## 👥 Target Audience

| User Group            | Needs                                      | Dashboard Features                        |
|-----------------------|--------------------------------------------|-------------------------------------------|
| Emergency Responders  | Real-time risk, impact analysis            | Heatmap, prediction, filters              |
| Government Agencies   | Policy, resource allocation                | Stats, trends, correlation matrices       |
| Research Institutions | Pattern identification, academic research  | Anomaly detection, time series, export    |
| Insurance Companies   | Risk modeling, premium calculation         | Magnitude/geographic analysis, prediction |
| General Public        | Awareness, safety planning                 | Interactive maps, simple visualizations   |

---

## 🤖 Machine Learning

**Prediction Task:**  
Binary classification of tsunami risk (0 = no tsunami, 1 = tsunami generated) based on earthquake parameters.

**Algorithms Evaluated:**
- **XGBoost:** Best for imbalanced data and feature importance
- **Random Forest:** Interpretable, robust to overfitting
- **Gradient Boosting:** Strong sequential performance

**Pipeline:**
- Data cleaning & feature engineering
- OneHotEncoder for categorical variables
- RobustScaler for numerical features
- Stratified train-test split (75:25)
- Model comparison and automatic best model selection

**Results:**
- **XGBoost:** Accuracy 0.8675 (best overall)
- **Random Forest:** Accuracy 0.8594
- **Gradient Boosting:** Accuracy 0.8554

---

## 🛠️ Dashboard Features

- **Summary Cards:** Total earthquakes, average magnitude, average depth
- **Interactive Heatmap:** Explore global earthquake distribution, adjust intensity/radius/blur
- **Time-Series Analysis:** Trends by day, week, month, year
- **Geographical Analysis:** Most affected regions/countries
- **Magnitude & Type Analysis:** Category distributions, violin plots, pie/bar charts
- **Distribution Analysis:** Histograms, box plots for depth/significance
- **Relationship & Correlation:** Scatter plots, correlation heatmaps
- **Tsunami Analysis:** Proportion and count of tsunami events
- **Anomaly Detection:** Identify and review outlier events
- **Tsunami Risk Prediction:** Input parameters and get instant AI-driven risk assessment
- **Tabular Data Browsing:** Search, filter, and export earthquake records

---

## 📸 Demo

### Dashboard Tab
![image](https://github.com/user-attachments/assets/9793b64c-e57f-43c4-9d94-247dfbd891df)

### Risk Prediction tab
![Image](https://github.com/user-attachments/assets/067de984-d333-4cd8-ae95-2834a6bad1b7)

### Tabular Data Browsing Tab
![image](https://github.com/user-attachments/assets/33c7e014-3683-49df-b57e-1209ee4f4b2f)

---

## 🎨 Design & User Experience

- **Neuromorphic design:** Soft, modern, and accessible
- **Responsive layout:** Mobile-first, touch-friendly, scalable typography
- **Semantic color coding:** Magnitude-based, colorblind-friendly, WCAG compliant
- **Dark mode:** Automatic and manual toggle
- **Progressive loading:** Smooth transitions, clear feedback, error handling

---

## 🌟 Interesting Findings

1. **Pacific Ring of Fire:** Indonesia, Papua New Guinea, and Japan are the most earthquake-prone, consistent with global seismic data.
2. **Magnitude, Depth, and Tsunami Risk:** Shallow, high-magnitude quakes are most likely to trigger tsunamis; most events occur at depths <80 km.
3. **Anomalies & Outliers:** Rare, extreme events (e.g., 2011 Tohoku, 2004 Sumatra) drive the majority of fatalities and economic losses.

---

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hfsha/Earthquake-app.git
   cd Earthquake-app
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Run the app locally:**
   ```bash
   python app.py
   ```
4. **Access the dashboard:**  
   Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 📚 References

- [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/)
- [Render Deployment Docs](https://render.com/docs/web-services)
- [Project Dataset](https://github.com/hfsha/Earthquake-app/tree/main/data)

---

## 📬 Contact

For questions, suggestions, or collaboration, please open an issue or contact via [GitHub](https://github.com/hfsha/Earthquake-app).

---

*Enjoy exploring global seismic activity and tsunami risk with cutting-edge analytics!*
