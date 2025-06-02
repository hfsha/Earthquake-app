# 🌍 Global Plastic Waste Dashboard & Risk Prediction

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0%2B-lightgrey)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

An interactive web dashboard that visualizes global plastic waste data and predicts coastal waste risk levels using machine learning. This project combines data visualization, statistical analysis, and predictive modeling to help understand and combat plastic pollution worldwide.

## ✨ Features

- 📊 **Interactive Visualizations**
  - Country-wise plastic waste distribution
  - Recycling rate analysis
  - Per capita waste comparison
  - Risk level mapping
  - Anomaly detection

- 🎯 **Risk Prediction**
  - Machine learning-based risk assessment
  - Multiple feature analysis
  - Real-time predictions
  - Probability distribution

- 🎨 **Modern UI/UX**
  - Dark/Light mode support
  - Responsive design
  - Interactive filters
  - Smooth animations
  - Accessibility features

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Plastic-waste-web.git
   cd Plastic-waste-web
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**
   ```bash
   python app.py
   ```

4. **Access the dashboard**
   Open your browser and visit `http://localhost:5000`

## 🛠️ Installation

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Detailed Setup

1. **Create a virtual environment** (recommended)
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install required packages**
   ```bash
   pip install flask pandas scikit-learn xgboost joblib
   ```

3. **Download the model files**
   - Place the trained model files in the project root:
     - `best_model_pipeline.pkl`
     - `le_coastal_risk.pkl`

## 📊 Usage

### Dashboard Features

1. **Data Visualization**
   - Use filters to analyze specific countries or risk levels
   - Interact with charts to explore data relationships
   - Toggle between different visualization types

2. **Risk Prediction**
   - Input country data:
     - Total Plastic Waste (MT)
     - Main Sources
     - Recycling Rate (%)
     - Per Capita Waste (KG)
   - Get instant risk predictions with confidence scores

3. **Anomaly Detection**
   - Select metrics to analyze
   - Adjust sensitivity threshold
   - View detected anomalies

## 📸 Demo

### Dashboard Interface
![image](https://github.com/user-attachments/assets/c0c7f075-fb43-46c9-8e3e-c831cb8737a2)

### Risk Prediction
![image](https://github.com/user-attachments/assets/39f5238c-b447-4dd3-83a9-f96ae3c9cc63)

### Interactive Maps
![Interactive Maps](path_to_map_screenshot.png)

*Note: Replace the image paths with actual screenshots of your application*

## 🧠 Machine Learning Model

The project uses a machine learning pipeline that includes:
- Feature preprocessing
- Multiple model comparison (XGBoost, Random Forest, SVM)
- Automated model selection
- Risk level prediction

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Data source: Global Plastic Waste Dataset
- Icons and UI elements: Various open-source libraries
- Machine learning models: scikit-learn, XGBoost

## 📧 Contact

 Name - [Shahidatul Hidayah]

Project Link: [https://github.com/hfsha/Plastic-waste-web](https://github.com/yourusername/Plastic-waste-web)

---

⭐️ If you like this project, please give it a star on GitHub! 
