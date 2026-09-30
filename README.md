# 🖐️ Silent Signals - AI Hand Gesture Detection Engine

Silent Signals is a high-performance, real-time AI hand gesture detection web application built with Python, Streamlit, MediaPipe, and OpenCV. It translates hand finger gestures into spoken voice alerts and instant WhatsApp notifications in multiple languages.

---

## ⚡ Features

- 🖐️ **Real-Time Hand Gesture Recognition:** Detects raised finger counts (1 to 5) with high precision using MediaPipe 3D landmark geometric vector analysis.
- 🌐 **Multilingual Voice Speech Alerts:** Supports 20+ languages (English, Tamil, Hindi, Spanish, French, German, Japanese, etc.) via gTTS & pyttsx3 with both local speaker and client browser audio playback.
- 💬 **WhatsApp Notification Alerts:** Dispatches instant alert messages over WhatsApp with web direct link fallback.
- 📷 **Dual Camera Source Support:** Works with local hardware webcams (`Webcam 0`) and uploaded video files for cloud server deployment.
- 📊 **Activity History & Export:** Real-time CSV logging with instant download capability.
- 🎨 **Modern Dark UI & Live Dashboard:** Displays live FPS, active gesture status, and event counters.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
Ensure Python 3.9+ is installed on your system.

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/your-username/paavai.git
cd paavai

# Install Python requirements
pip install -r requirements.txt
```

### 3. Run Application
```bash
python -m streamlit run app.py
```
Open your browser at `http://localhost:8501`.

---

## ☁️ Deployment Instructions

### Option 1: Streamlit Community Cloud (Recommended & Free)
1. Push your repository to GitHub.
2. Sign in to [share.streamlit.io](https://share.streamlit.io/).
3. Click **"New App"**.
4. Select your repository, branch (`main`), and set **Main file path** to `app.py`.
5. Click **"Deploy"**. Streamlit Cloud will automatically detect `requirements.txt`, `packages.txt`, and `.streamlit/config.toml`.

---

### Option 2: Hugging Face Spaces (Streamlit SDK)
1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Select **Streamlit** as the Space SDK.
3. Upload all files (`app.py`, `requirements.txt`, `packages.txt`, `.streamlit/`).
4. Hugging Face will automatically build and launch the app.

---

### Option 3: Render / Railway / Docker
1. Use the build command:
   ```bash
   pip install -r requirements.txt
   ```
2. Set the start command:
   ```bash
   streamlit run app.py --server.port $PORT --server.address 0.0.0.0
   ```

---

## 📁 Repository Structure

```
paavai/
├── app.py                # Main Streamlit application
├── requirements.txt      # Python package dependencies
├── packages.txt          # Linux C++ shared libraries for cloud servers
├── .streamlit/
│   └── config.toml       # Production Streamlit configuration
├── gesture_log.csv       # Activity log storage
└── README.md             # Project documentation & deployment guide
```
