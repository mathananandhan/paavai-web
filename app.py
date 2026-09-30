import streamlit as st
import cv2
import mediapipe as mp
import time
import re
import os
import urllib.parse
import pandas as pd
import numpy as np
from datetime import datetime
import threading
import tempfile
import glob
from concurrent.futures import ThreadPoolExecutor

# ------------------- Cleanup Leftover Audio Files -------------------
def cleanup_temp_audio():
    try:
        temp_dir = tempfile.gettempdir()
        leftover_files = glob.glob(os.path.join(temp_dir, "paavai_tts_*.mp3")) + glob.glob("output_*.mp3")
        for f in leftover_files:
            try:
                os.remove(f)
            except Exception:
                pass
    except Exception:
        pass

cleanup_temp_audio()

# ------------------- Module Imports & Environment Detection -------------------
try:
    from googletrans import Translator
    TRANSLATOR_AVAILABLE = True
except Exception:
    TRANSLATOR_AVAILABLE = False

try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except Exception:
    PYTTSX3_AVAILABLE = False

try:
    from gtts import gTTS
    import pygame
    GTTS_AVAILABLE = True
except Exception:
    GTTS_AVAILABLE = False

# ------------------- Global Locks & Async Executors -------------------
audio_lock = threading.Lock()
csv_lock = threading.Lock()
whatsapp_lock = threading.Lock()
executor = ThreadPoolExecutor(max_workers=3)

last_whatsapp_time = 0
last_gesture_time = 0

# ------------------- Page Setup & Modern CSS -------------------
st.set_page_config(
    page_title="Silent Signals - AI Gesture Detection",
    page_icon="🖐️",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }
    
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    .metric-card {
        background-color: #1e293b;
        border-radius: 12px;
        padding: 16px;
        border: 1px solid #334155;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        text-align: center;
    }
    .metric-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #38bdf8;
    }
    .metric-label {
        font-size: 0.85rem;
        color: #94a3b8;
        margin-top: 4px;
    }
    
    div.stButton > button {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        border-radius: 10px;
        border: none;
        padding: 10px 20px;
        font-weight: 600;
        letter-spacing: 0.3px;
        transition: all 0.25s ease;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }
    div.stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
    }
    
    div.stButton > button[kind="secondary"] {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
    }
    div.stButton > button[kind="secondary"]:hover {
        box-shadow: 0 6px 16px rgba(220, 38, 38, 0.35);
    }

    [data-testid="stSidebar"] {
        background-color: #0f172a;
    }
    [data-testid="stSidebar"] * {
        color: #f8fafc !important;
    }
    </style>
""", unsafe_allow_html=True)

# Header Section
st.title("🖐️ Silent Signals")
st.markdown("##### ⚡ Deployment-Ready AI Hand Gesture Detection Engine")
st.caption("Multilingual Speech Alerts • Cloud & Local Support • High Performance")

# ------------------- Session State Initialization -------------------
if "detecting" not in st.session_state:
    st.session_state.detecting = False

if "last_whatsapp_url" not in st.session_state:
    st.session_state.last_whatsapp_url = ""

if "client_audio_bytes" not in st.session_state:
    st.session_state.client_audio_bytes = None

base_messages = {
    1: "I need food!",
    2: "I need to go to the toilet!",
    3: "I need water!",
    4: "Help needed!",
    5: "Come here!"
}

if "custom_messages" not in st.session_state:
    st.session_state.custom_messages = base_messages.copy()

# ------------------- Translation Cache -------------------
@st.cache_resource
def get_translator():
    if not TRANSLATOR_AVAILABLE:
        return None
    try:
        return Translator()
    except Exception:
        return None

translator_instance = get_translator()

@st.cache_data(show_spinner=False)
def cached_translate(text, dest_lang):
    if dest_lang == "en" or not text:
        return text
    if not translator_instance:
        return text
    try:
        res = translator_instance.translate(text, dest=dest_lang)
        return res.text if res and hasattr(res, 'text') else text
    except Exception:
        return text

def get_translated_messages(messages_dict, target_lang):
    translated = {}
    for k, v in messages_dict.items():
        translated[k] = cached_translate(v, target_lang)
    return translated

# ------------------- Thread-Safe Dual Audio (Server + Client Browser) -------------------
def _speak_gtts(message, lang):
    with audio_lock:
        temp_dir = tempfile.gettempdir()
        file_idx = int(time.time() * 1000) + np.random.randint(0, 1000)
        filename = os.path.join(temp_dir, f"paavai_tts_{file_idx}.mp3")
        try:
            tts = gTTS(text=message, lang=lang)
            tts.save(filename)

            with open(filename, "rb") as f:
                st.session_state.client_audio_bytes = f.read()

            try:
                if not pygame.mixer.get_init():
                    pygame.mixer.init()
                pygame.mixer.music.load(filename)
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy():
                    time.sleep(0.05)
                pygame.mixer.music.unload()
            except Exception:
                pass
        except Exception as e:
            print(f"gTTS playback error: {e}")
            if PYTTSX3_AVAILABLE:
                _speak_pyttsx3(message)
        finally:
            if os.path.exists(filename):
                try:
                    os.remove(filename)
                except Exception:
                    pass

def _speak_pyttsx3(message):
    with audio_lock:
        try:
            try:
                import pythoncom
                pythoncom.CoInitialize()
            except ImportError:
                pass
            engine = pyttsx3.init()
            engine.setProperty('rate', 150)
            engine.say(message)
            engine.runAndWait()
        except Exception as e:
            print(f"pyttsx3 playback error: {e}")

def speak_message(message, lang, use_offline=False):
    if use_offline and PYTTSX3_AVAILABLE:
        executor.submit(_speak_pyttsx3, message)
    elif GTTS_AVAILABLE:
        executor.submit(_speak_gtts, message, lang)
    elif PYTTSX3_AVAILABLE:
        executor.submit(_speak_pyttsx3, message)

# ------------------- Cloud-Safe WhatsApp Integration -------------------
def _send_whatsapp_task(message, phone):
    with whatsapp_lock:
        try:
            encoded_msg = urllib.parse.quote(message)
            clean_num = phone.replace("+", "").replace(" ", "").strip()
            wa_url = f"https://api.whatsapp.com/send?phone={clean_num}&text={encoded_msg}"
            st.session_state.last_whatsapp_url = wa_url

            try:
                import pywhatkit as kit
                import pyautogui
                kit.sendwhatmsg_instantly(phone, message, wait_time=10, tab_close=True, close_time=3)
                time.sleep(1.0)
                pyautogui.press("enter")
            except Exception:
                pass
        except Exception as e:
            print(f"WhatsApp alert error: {e}")

def send_whatsapp_message(message, phone):
    global last_whatsapp_time
    clean_phone = re.sub(r'[^\d+]', '', phone)
    if not clean_phone.startswith("+") or len(clean_phone) < 10:
        return
    now = time.time()
    if now - last_whatsapp_time < 25:
        return
    last_whatsapp_time = now
    executor.submit(_send_whatsapp_task, message, clean_phone)

# ------------------- Thread-Safe CSV Logging -------------------
def log_gesture_action(gesture_type, message):
    with csv_lock:
        try:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            df = pd.DataFrame([{"Time": now, "Gesture": gesture_type, "Message": message}])
            file_exists = os.path.exists("gesture_log.csv") and os.path.getsize("gesture_log.csv") > 0
            df.to_csv("gesture_log.csv", mode='a', header=not file_exists, index=False)
        except Exception as e:
            print(f"Logging error: {e}")

def load_log_df():
    with csv_lock:
        if os.path.exists("gesture_log.csv") and os.path.getsize("gesture_log.csv") > 0:
            try:
                df = pd.read_csv("gesture_log.csv")
                if not df.empty:
                    return df.iloc[::-1].reset_index(drop=True)
            except Exception:
                pass
    return None

# ------------------- Robust Multi-Hand Finger Counter -------------------
def count_raised_fingers(hand_landmarks):
    landmarks = hand_landmarks.landmark
    raised = 0

    thumb_tip = np.array([landmarks[4].x, landmarks[4].y])
    thumb_mcp = np.array([landmarks[2].x, landmarks[2].y])
    pinky_mcp = np.array([landmarks[17].x, landmarks[17].y])

    dist_tip_pinky = np.linalg.norm(thumb_tip - pinky_mcp)
    dist_mcp_pinky = np.linalg.norm(thumb_mcp - pinky_mcp)

    if dist_tip_pinky > dist_mcp_pinky * 1.25:
        raised += 1

    finger_tips = [8, 12, 16, 20]
    finger_pips = [6, 10, 14, 18]

    for tip_idx, pip_idx in zip(finger_tips, finger_pips):
        if landmarks[tip_idx].y < landmarks[pip_idx].y:
            raised += 1

    return raised

# ------------------- Sidebar Configuration -------------------
lang_code_map = {
    "English": "en", "Tamil": "ta", "Hindi": "hi", "Spanish": "es", "French": "fr",
    "German": "de", "Italian": "it", "Portuguese": "pt", "Malayalam": "ml", "Telugu": "te",
    "Kannada": "kn", "Gujarati": "gu", "Marathi": "mr", "Bengali": "bn", "Urdu": "ur",
    "Punjabi": "pa", "Arabic": "ar", "Chinese (Simplified)": "zh-cn", "Japanese": "ja",
    "Korean": "ko", "Russian": "ru"
}

with st.sidebar:
    st.title("⚙️ Config Panel")

    st.subheader("1. Video Input Source")
    camera_mode = st.selectbox("📹 Input Mode", ["💻 Local Webcam (Webcam 0)", "📁 Upload Video File"])

    st.divider()

    st.subheader("2. Alert Settings")
    language_choice = st.selectbox("🌏 Alert Language", list(lang_code_map.keys()))
    lang_code = lang_code_map.get(language_choice, "en")
    use_offline_tts = st.checkbox("Use Offline Voice (Faster, Offline)", value=False)

    st.divider()

    st.subheader("3. Notification Channels")
    alert_method = st.radio(
        "🎯 Alert Mode",
        ("🔊 Voice Only", "💬 WhatsApp Only", "✅ WhatsApp + Voice"),
        horizontal=False
    )

    phone_number = ""
    if "WhatsApp" in alert_method:
        phone_number = st.text_input("📞 WhatsApp Number", value="+91 ")
        if not phone_number.strip().startswith("+"):
            st.error("Phone number must start with '+' and country code (e.g. +919876543210)")

    st.divider()

    st.subheader("4. Custom Meanings")
    with st.expander("✏️ Customize Gesture Meanings", expanded=True):
        for i in range(1, 6):
            st.session_state.custom_messages[i] = st.text_input(
                f"{i} Finger(s):",
                value=st.session_state.custom_messages[i],
                key=f"msg_{i}"
            )
        if st.button("🔄 Reset to Default"):
            st.session_state.custom_messages = base_messages.copy()
            for i in range(1, 6):
                if f"msg_{i}" in st.session_state:
                    st.session_state[f"msg_{i}"] = base_messages[i]
            st.rerun()

# ------------------- Cached Translations Hook -------------------
translated_messages = get_translated_messages(st.session_state.custom_messages, lang_code)

def start_detecting():
    st.session_state.detecting = True

def stop_detecting():
    st.session_state.detecting = False

# ------------------- Main App UI -------------------
colC1, colC2, _ = st.columns([1, 1, 3])
with colC1:
    st.button("▶️ Start Detection", on_click=start_detecting, use_container_width=True)
with colC2:
    st.button("⏹ Stop Detection", on_click=stop_detecting, type="secondary", use_container_width=True)

# Metric Dashboard Row
m1, m2, m3 = st.columns(3)
metric_gesture = m1.empty()
metric_fps = m2.empty()
metric_logs = m3.empty()

def update_metrics(gesture="None", fps="0", logs="0"):
    metric_gesture.markdown(f'''<div class="metric-card"><div class="metric-value">{gesture}</div><div class="metric-label">Active Gesture</div></div>''', unsafe_allow_html=True)
    metric_fps.markdown(f'''<div class="metric-card"><div class="metric-value">{fps}</div><div class="metric-label">Live FPS</div></div>''', unsafe_allow_html=True)
    metric_logs.markdown(f'''<div class="metric-card"><div class="metric-value">{logs}</div><div class="metric-label">Logged Events</div></div>''', unsafe_allow_html=True)

update_metrics()

# WhatsApp Direct Web Alert Banner if triggered
if st.session_state.last_whatsapp_url:
    st.info(f"💬 **WhatsApp Alert Ready:** [Click here to send alert on WhatsApp]({st.session_state.last_whatsapp_url})")

col1, col2 = st.columns([2, 1])

with col1:
    st.markdown("### 📷 Live Camera Stream")
    video_container = st.empty()
    status_msg = st.empty()
    uploaded_file = None

    if "Upload Video" in camera_mode:
        uploaded_file = st.file_uploader("Upload a video clip for gesture analysis (.mp4, .avi, .mov)", type=["mp4", "avi", "mov"])

    if not st.session_state.detecting:
        video_container.info("🎥 Detection offline. Select camera source and click **Start Detection**.")

with col2:
    st.markdown("### 📜 Activity History")
    log_container = st.empty()
    df_log = load_log_df()
    log_count = len(df_log) if df_log is not None else 0
    if df_log is not None:
        log_container.dataframe(df_log, use_container_width=True, height=400)
    else:
        log_container.info("No activity logged yet.")

    c3, c4 = st.columns([1, 1])
    with c3:
        if df_log is not None:
            st.download_button("⬇️ Export Log", data=df_log.to_csv(index=False).encode(), file_name="gesture_log.csv", mime="text/csv", use_container_width=True)
    with c4:
        if st.button("🧹 Clear Log", use_container_width=True):
            with csv_lock:
                if os.path.exists("gesture_log.csv"):
                    try:
                        os.remove("gesture_log.csv")
                    except Exception:
                        pass
            st.rerun()

# Audio playback output container for web browsers
audio_output_container = st.empty()

# ------------------- High-Performance Camera Processing Loop -------------------
if st.session_state.detecting:
    status_msg.success("🟢 Detection Engine Active...")

    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.65,
        min_tracking_confidence=0.65
    )
    mp_draw = mp.solutions.drawing_utils

    cap = None
    temp_video_path = None

    if "Upload Video" in camera_mode:
        if uploaded_file is not None:
            tfile = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
            tfile.write(uploaded_file.read())
            tfile.close()
            temp_video_path = tfile.name
            cap = cv2.VideoCapture(temp_video_path)
        else:
            status_msg.warning("⚠️ Please upload a video file to run detection.")
            st.session_state.detecting = False
    else:
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if cap is not None and not cap.isOpened():
        status_msg.error("❌ Unable to access video input stream. Check webcam permissions or camera source.")
        st.session_state.detecting = False
    elif cap is not None:
        gesture_buffer = []
        buffer_size = 7
        detected_finger = None

        frame_counter = 0
        no_hand_frames = 0

        fps_start_time = time.time()
        fps_frame_count = 0
        current_fps_display = "30"

        try:
            while st.session_state.detecting:
                ret, frame = cap.read()
                if not ret:
                    if "Upload Video" in camera_mode:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        continue
                    else:
                        status_msg.error("❌ Camera stream disconnected.")
                        st.session_state.detecting = False
                        break

                frame_counter += 1
                fps_frame_count += 1

                now_time = time.time()
                if now_time - fps_start_time >= 0.5:
                    current_fps_display = str(int(fps_frame_count / (now_time - fps_start_time)))
                    fps_start_time = now_time
                    fps_frame_count = 0

                frame = cv2.flip(frame, 1)
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                results = hands.process(rgb)

                total_finger_count = 0
                if results.multi_hand_landmarks:
                    no_hand_frames = 0
                    for hand_landmarks in results.multi_hand_landmarks:
                        count = count_raised_fingers(hand_landmarks)
                        total_finger_count += count
                        mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

                    gesture_buffer.append(total_finger_count)
                    if len(gesture_buffer) > buffer_size:
                        gesture_buffer.pop(0)

                    if gesture_buffer.count(total_finger_count) >= buffer_size - 1:
                        curr_time = time.time()
                        if total_finger_count != detected_finger and (curr_time - last_gesture_time > 2.0):
                            if total_finger_count in translated_messages:
                                detected_finger = total_finger_count
                                last_gesture_time = curr_time
                                msg = translated_messages[total_finger_count]

                                log_gesture_action(f"{total_finger_count} Fingers", msg)

                                if "Voice" in alert_method:
                                    speak_message(msg, lang_code, use_offline=use_offline_tts)
                                if "WhatsApp" in alert_method:
                                    send_whatsapp_message(msg, phone_number)

                                updated_df = load_log_df()
                                if updated_df is not None:
                                    log_container.dataframe(updated_df, use_container_width=True, height=400)
                                    log_count = len(updated_df)
                else:
                    no_hand_frames += 1
                    if no_hand_frames >= 5:
                        detected_finger = None
                        gesture_buffer.clear()

                if st.session_state.client_audio_bytes:
                    audio_output_container.audio(st.session_state.client_audio_bytes, format="audio/mp3", autoplay=True)
                    st.session_state.client_audio_bytes = None

                active_gest_str = f"{detected_finger} Finger(s)" if detected_finger else "None"
                update_metrics(gesture=active_gest_str, fps=current_fps_display, logs=str(log_count))

                video_container.image(frame, channels="BGR", use_container_width=True)

        finally:
            if 'hands' in locals():
                hands.close()
            if 'cap' in locals() and cap is not None and cap.isOpened():
                cap.release()
            if temp_video_path and os.path.exists(temp_video_path):
                try:
                    os.remove(temp_video_path)
                except Exception:
                    pass
            cv2.destroyAllWindows()


