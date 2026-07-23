import streamlit as st
import cv2
import mediapipe as mp
import os
import time
import pandas as pd
import numpy as np
from datetime import datetime
from deepface import DeepFace
from googletrans import Translator
import threading
import pyautogui
import pyttsx3
from gtts import gTTS
import pygame
import queue

# ------------------- Page Setup -------------------
st.set_page_config(page_title="Silent Signals", page_icon="🖐️", layout="wide", initial_sidebar_state="expanded")

# Custom CSS for advanced, modern UI
st.markdown("""
    <style>
    /* Sleek background and fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
ṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀ    }
    
    /* Hide Streamlit default marks */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}ṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀ<ṀṀṀṀṀṀṀṀṀṀṀŚṀṀṀṀṀṀṀṀṀṀṀṀṀŚṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀ
    header {visibility: hidden;}
    
    /* Modern sleek buttons */
    div.stButton > button:ṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀ-child {
        background: linear-gradient(135deg, #4CAF50, #2E7D32);
        color: white;
        border-radius: 12px;ṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀ§ṀṀṀĒṀṀṀṀṀṀṀṀṀṀṀṀṀṀĒṀŪṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀ
        border: none;
        padding: 12px 24px;
        font-weight: 600;
        letter-spacing: 0.5px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
    }ṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀṀ
    div.stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
    }
    
    /* Stop button styling overrides */
    div.stButton > button:first-child[kind="secondary"] {
        background: linear-gradient(135deg, #f44336, #c62828);
        box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
    }
    div.stButton > button:first-child[kind="secondary"]:hover {
        box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4);
    }

    /* Sidebar elegant styling */
    [data-testid="stSidebar"] {
        background-color: #1a1e23;
    }
    [data-testid="stSidebar"] * {
        color: #e0e0e0 !important;
    }
    </style>
""", unsafe_allow_html=True)

st.title("🖐️ Silent Signals")
st.markdown("### ⚡ AI-Powered Gesture & Emotion Detection")
st.caption("Multilingual Voice + WhatsApp Alerts • Privacy-First Local Processing • Optimized Performance")

# ------------------- Init State -------------------
if "detecting" not in st.session_state:
    st.session_state.detecting = False

@st.cache_resource
def get_translator():
    return Translator()

translator = get_translator()

try:
    pygame.mixer.init()
except Exception:
    pass

# ------------------- Multilingual Setup -------------------
lang_code_map = {
    "English": "en", "Tamil": "ta", "Hindi": "hi", "Spanish": "es", "French": "fr",
    "German": "de", "Italian": "it", "Portuguese": "pt", "Malayalam": "ml", "Telugu": "te",
    "Kannada": "kn", "Gujarati": "gu", "Marathi": "mr", "Bengali": "bn", "Urdu": "ur",
    "Punjabi": "pa", "Arabic": "ar", "Chinese (Simplified)": "zh-cn", "Japanese": "ja", 
    "Korean": "ko", "Russian": "ru"
}

base_messages = {
    1: "I need food!",
    2: "I need to go to the toilet!",
    3: "I need water!",
    4: "Help needed!",
    5: "Come here!"
}
base_emotion_alert = "Urgent emotion: {}"

if "custom_messages" not in st.session_state:
    st.session_state.custom_messages = base_messages.copy()

if "translated_msgs" not in st.session_state:
    st.session_state.translated_msgs = {}

# ------------------- Thread-safe Audio -------------------
def _speak_gtts(message, lang, file_idx):
    try:
        tts = gTTS(text=message, lang=lang)
        filename = f"output_{file_idx}.mp3"
        tts.save(filename)
        
        pygame.mixer.music.load(filename)
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy():
            time.sleep(0.1)
        pygame.mixer.music.unload()
        try:
            os.remove(filename)
        except OSError:
            pass
    except Exception as e:
        print(f"gTTS Error: {e}")

def _speak_pyttsx3(message):
    try:
        engine = pyttsx3.init()
        engine.say(message)
        engine.runAndWait()
    except Exception as e:
        print(f"pyttsx3 Error: {e}")

def speak_message(message, lang, use_offline=False):
    if use_offline:
        threading.Thread(target=_speak_pyttsx3, args=(message,), daemon=True).start()
    else:
        file_idx = int(time.time() * 1000) + np.random.randint(0, 1000)
        threading.Thread(target=_speak_gtts, args=(message, lang, file_idx), daemon=True).start()

# ------------------- Background WhatsApp -------------------
def _send_whatsapp_task(message, phone):
    try:
        import pywhatkit as kit
        print(f"Sending WhatsApp message to {phone} in background...")
        # wait_time is 15s to let browser load
        kit.sendwhatmsg_instantly(phone, message, wait_time=15, tab_close=True, close_time=5)
        time.sleep(2)
        pyautogui.press("enter")
        print("WhatsApp message sent!")
    except Exception as e:
        print(f"WhatsApp Error: {e}")

def send_whatsapp_message(message, phone):
    if not phone.startswith("+") or len(phone) < 10:
        return
    threading.Thread(target=_send_whatsapp_task, args=(message, phone), daemon=True).start()

# ------------------- Fast CSV Logging -------------------
def log_gesture_action(gesture_type, message):
    try:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        df = pd.DataFrame([{"Time": now, "Gesture": gesture_type, "Message": message}])
        df.to_csv("gesture_log.csv", mode='a', header=not os.path.exists("gesture_log.csv"), index=False)
    except Exception as e:
        print(f"Logging error: {e}")

# ------------------- DeepFace Cache -------------------
def classify_emotion_from_face(face_roi):
    try:
        result = DeepFace.analyze(img_path=face_roi, actions=['emotion'], enforce_detection=False, silent=True)
        if result and isinstance(result, list):
            return result[0]['dominant_emotion'].capitalize()
        return ""
    except Exception:
        return ""

def pre_translate_messages(lang_code):
    """Pre-translates all messages to avoid network lag in the video loop."""
    translated = {}
    for key, msg in st.session_state.custom_messages.items():
        if lang_code == "en":
            translated[key] = msg
        else:
            try:
                translated[key] = translator.translate(msg, dest=lang_code).text
            except Exception:
                translated[key] = msg
    st.session_state.translated_msgs = translated

def translate_fast(text, lang_code):
    if lang_code == "en": return text
    try:
        return translator.translate(text, dest=lang_code).text
    except Exception:
        return text

# ------------------- Streamlit UI Sidebar -------------------
with st.sidebar:
    st.title("⚙️ Config Panel")
    
    st.subheader("1. General Settings")
    language_choice = st.selectbox("🌏 Alert Language", list(lang_code_map.keys()))
    lang_code = lang_code_map.get(language_choice, "en")
    use_offline_tts = st.checkbox("Use Offline Voice (Faster, No Internet)", value=False)
    
    st.divider()
    
    st.subheader("2. Notifications")
    alert_method = st.radio(
        "🎯 Mode",
        ("🔊 Voice Only", "💬 WhatsApp Only", "✅ WhatsApp + Voice"),
        horizontal=False
    )
    
    phone_number = ""
    if "WhatsApp" in alert_method:
        phone_number = st.text_input("📞 Number (with country code)", value="+91 ")
        if not phone_number.startswith("+"):
            st.error("Number must start with +")

    st.divider()
    
    st.subheader("3. Engine & Meanings")
    use_emotion = st.toggle("🧠 Enable DeepFace Emotion Detection", value=True)
            
    with st.expander("✏️ Gesture Meanings"):
        for i in range(1, 6):
            st.session_state.custom_messages[i] = st.text_input(
                f"{i} Finger(s):", 
                value=st.session_state.custom_messages[i], 
                key=f"msg_{i}"
            )
        if st.button("🔄 Reset"):
            st.session_state.custom_messages = base_messages.copy()
            st.rerun()

# ------------------- Pre-translation Hook -------------------
# Update translations whenever configuration changes
pre_translate_messages(lang_code)

def start_detecting():
    st.session_state.detecting = True
def stop_detecting():
    st.session_state.detecting = False

# ------------------- Main UI Layout -------------------
colC1, colC2, colC3 = st.columns([1, 1, 3])
with colC1:
    st.button("▶️ Start Camera", on_click=start_detecting, use_container_width=True)
with colC2:
    st.button("⏹ Stop Camera", on_click=stop_detecting, type="secondary", use_container_width=True)

col1, col2 = st.columns([2, 1])
with col1:
    st.markdown("### 📷 Live Camera Feed")
    video_container = st.empty()
    status_msg = st.empty()
    if not st.session_state.detecting:
        video_container.info("🎥 Camera is currently offline. Press **Start Camera** to begin detection.")

with col2:
    st.markdown("### 📜 Activity Log")
    log_container = st.empty()
    if os.path.exists("gesture_log.csv"):
        df_log = pd.read_csv("gesture_log.csv")
        df_log = df_log.iloc[::-1].reset_index(drop=True)
        log_container.dataframe(df_log, use_container_width=True, height=450)
        c3, c4 = st.columns([1, 1])
        with c3:
            st.download_button("⬇️ Download", data=df_log.to_csv(index=False).encode(), file_name="gesture_log.csv", mime="text/csv", use_container_width=True)
        with c4:
            if st.button("🧹 Clear", use_container_width=True):
                os.remove("gesture_log.csv")
                st.rerun()
    else:
        log_container.info("No activity recorded yet.")

# ------------------- Core Vision Logic -------------------
if st.session_state.detecting:
    status_msg.success("🟢 System Active & Monitoring...")
    
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(min_detection_confidence=0.8, min_tracking_confidence=0.8)
    mp_draw = mp.solutions.drawing_utils
    mp_face = mp.solutions.face_mesh
    face_mesh = mp_face.FaceMesh(static_image_mode=False, max_num_faces=1)

    cap = cv2.VideoCapture(0)
    
    gesture_buffer = []
    buffer_size = 8  # Increased buffer for stability
    detected_finger = None
    detected_emotion = None
    frame_counter = 0
    last_emotion_text = ""
    
    try:
        while st.session_state.detecting:
            ret, frame = cap.read()
            if not ret:
                status_msg.error("❌ Camera error or unavailable.")
                break
                
            frame_counter += 1
            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            results = hands.process(rgb)
            face_results = face_mesh.process(rgb)

            # Gesture Detection
            finger_count = 0
            if results.multi_hand_landmarks:
                for hand in results.multi_hand_landmarks:
                    thumb_tip = hand.landmark[4]
                    thumb_base = hand.landmark[2]
                    if thumb_tip.x < thumb_base.x:
                        finger_count += 1
                    finger_count += sum(1 for i in [8, 12, 16, 20] if hand.landmark[i].y < hand.landmark[i - 2].y)

                    gesture_buffer.append(finger_count)
                    if len(gesture_buffer) > buffer_size:
                        gesture_buffer.pop(0)

                    # Trigger alert on stable reading
                    if gesture_buffer.count(finger_count) >= buffer_size - 1 and finger_count != detected_finger and finger_count in st.session_state.translated_msgs:
                        detected_finger = finger_count
                        msg = st.session_state.translated_msgs[finger_count]
                        
                        log_gesture_action(f"{finger_count} Fingers", msg)
                        
                        if "Voice" in alert_method:
                            speak_message(msg, lang_code, use_offline=use_offline_tts)
                        if "WhatsApp" in alert_method:
                            send_whatsapp_message(msg, phone_number)

                    mp_draw.draw_landmarks(frame, hand, mp_hands.HAND_CONNECTIONS)

            # Emotion Detection (Throttled for Performance)
            if use_emotion and face_results.multi_face_landmarks:
                for face_landmarks in face_results.multi_face_landmarks:
                    ih, iw, _ = frame.shape
                    x_coords = [int(lm.x * iw) for lm in face_landmarks.landmark]
                    y_coords = [int(lm.y * ih) for lm in face_landmarks.landmark]
                    x_min, x_max = max(0, min(x_coords)), min(iw, max(x_coords))
                    y_min, y_max = max(0, min(y_coords)), min(ih, max(y_coords))

                    if frame_counter % 20 == 0:  # Check every 20 frames
                        face_roi = frame[max(0, y_min-10):min(ih, y_max+10), max(0, x_min-10):min(iw, x_max+10)]
                        if face_roi.size > 0:
                            emotion = classify_emotion_from_face(face_roi)
                            if emotion:
                                last_emotion_text = emotion

                            if emotion in ["Angry", "Fear", "Sad"] and emotion != detected_emotion:
                                detected_emotion = emotion
                                en_msg = base_emotion_alert.format(emotion)
                                translated_msg = translate_fast(en_msg, lang_code)
                                
                                log_gesture_action("Emotion", translated_msg)
                                
                                if "Voice" in alert_method:
                                    speak_message(translated_msg, lang_code, use_offline=use_offline_tts)
                                if "WhatsApp" in alert_method:
                                    send_whatsapp_message(translated_msg, phone_number)

                    cv2.rectangle(frame, (x_min, y_min), (x_max, y_max), (0, 255, 100), 2)
                    if last_emotion_text:
                        cv2.putText(frame, last_emotion_text, (x_min, y_min - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 100), 2)

            # Render frame
            video_container.image(frame, channels="BGR", use_container_width=True)
            
            # Very short sleep to yield control to Streamlit events (e.g. Stop button)
            time.sleep(0.01)

    finally:
        # Crucial for preventing camera locks when script is interrupted!
        if 'cap' in locals() and cap.isOpened():
            cap.release()
        cv2.destroyAllWindows()
