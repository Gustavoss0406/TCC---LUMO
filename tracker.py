import time
import subprocess
import os
import json
import hashlib
import uuid
from urllib.parse import urlparse
from datetime import datetime, date

print("PYTHON: Iniciando imports...", flush=True)

# =========================================================
# CONFIG
# =========================================================

SUPABASE_URL = "https://xshsxwbfqzkdukdsxgry.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHN4d2JmcXprZHVrZHN4Z3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODAxOTUsImV4cCI6MjA4ODU1NjE5NX0.2YQoXe1ehGXdtH2hUj3xOXqwvpxNfAcA6Dd6o1uGCJA"


SEND_INTERVAL = 5
LOG_INTERVAL = 60
LOOP_INTERVAL = 1

# =========================================================
# DEVICE IDENTIFIER
# =========================================================

def generate_device_code():

    mac = uuid.getnode()

    raw = f"{mac}-FOCUSBUDDY-V1"

    hashed = hashlib.sha256(raw.encode()).hexdigest()

    code = "FB-" + hashed[:6].upper()

    print(f"PYTHON: Código gerado: {code}", flush=True)

    return code


DEVICE_CODE = "FB-TEST123"  # Para teste, usar código fixo

# =========================================================
# SUPABASE
# =========================================================

supabase = None

def init_supabase():

    global supabase

    try:

        from supabase import create_client

        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        print("PYTHON: Supabase conectado", flush=True)

    except Exception as e:

        print("Erro ao iniciar Supabase:", e)

def get_or_create_device():
    global supabase
    if not supabase:
        return None
    
    try:
        # 1. Tentar encontrar dispositivo existente
        response = supabase.table("devices") \
            .select("id") \
            .eq("device_code", DEVICE_CODE) \
            .limit(1) \
            .execute()
            
        if response.data and len(response.data) > 0:
            d_id = response.data[0]['id']
            print(f"PYTHON: Dispositivo encontrado! ID: {d_id}", flush=True)
            return d_id
        
        # 2. Se não encontrar, criar novo
        print("PYTHON: Dispositivo não encontrado. Criando novo registro...", flush=True)
        
        device_name = f"Mac-{int(time.time())}"
        
        new_device = supabase.table("devices").insert({
            "device_code": DEVICE_CODE,
            "name": device_name,
            "created_at": datetime.utcnow().isoformat()
            # user_id deixamos NULL para ser reivindicado pelo App depois
        }).execute()
        
        if new_device.data and len(new_device.data) > 0:
            d_id = new_device.data[0]['id']
            print(f"PYTHON: Dispositivo criado! ID: {d_id}", flush=True)
            print(f"PYTHON: Agora vá no App e adicione um dispositivo com o código: {DEVICE_CODE}", flush=True)
            return d_id

    except Exception as e:
        print("Erro ao obter/criar dispositivo:", e)
        return None

# =========================================================
# ESTADO
# =========================================================

time_productive = 0
time_neutral = 0
time_distracting = 0

app_usage_seconds = {}

last_send_time = time.time()
last_log_time = time.time()

# =========================================================
# PERSISTÊNCIA LOCAL
# =========================================================

STATE_FILE = "tracker_state.json"


def load_state():

    global time_productive
    global time_neutral
    global time_distracting
    global app_usage_seconds

    if not os.path.exists(STATE_FILE):
        return

    try:

        with open(STATE_FILE, "r") as f:
            data = json.load(f)

        if data.get("date") != str(date.today()):
            return

        time_productive = data.get("productive_time", 0)
        time_neutral = data.get("neutral_time", 0)
        time_distracting = data.get("distracting_time", 0)
        app_usage_seconds = data.get("app_usage", {})

        print("Estado anterior carregado", flush=True)

    except:
        pass


def save_state():

    try:

        data = {

            "date": str(date.today()),
            "productive_time": time_productive,
            "neutral_time": time_neutral,
            "distracting_time": time_distracting,
            "app_usage": app_usage_seconds

        }

        with open(STATE_FILE, "w") as f:

            json.dump(data, f)

    except:
        pass


# =========================================================
# SISTEMA
# =========================================================

def get_active_window_app():

    try:

        from Quartz import CGWindowListCopyWindowInfo
        from Quartz import kCGWindowListOptionOnScreenOnly
        from Quartz import kCGNullWindowID

        windows = CGWindowListCopyWindowInfo(
            kCGWindowListOptionOnScreenOnly,
            kCGNullWindowID
        )

        for window in windows:

            if window.get("kCGWindowLayer", 0) == 0:

                return window.get("kCGWindowOwnerName")

    except:
        pass

    return None


def get_chrome_url():

    script = '''
    tell application "Google Chrome"
        if it is running then
            try
                set theUrl to URL of active tab of front window
                set theTitle to title of active tab of front window
                return theUrl & "|||" & theTitle
            on error
                return ""
            end try
        end if
    end tell
    '''

    try:

        result = subprocess.check_output(
            ["osascript", "-e", script],
            stderr=subprocess.DEVNULL
        )

        data = result.decode().strip()

        if "|||" in data:

            return data.split("|||")

    except:
        pass

    return None, None


# =========================================================
# CLASSIFICAÇÃO
# =========================================================

def classify_activity(app, url=None, title=None):

    productive_apps = [
        "Code",
        "Visual Studio Code",
        "Cursor",
        "Terminal",
        "iTerm2",
        "Figma",
        "Xcode",
        "Notion",
        "Obsidian"
    ]

    if app in productive_apps:
        return "produtivo"

    return "neutro"


# =========================================================
# MAIN LOOP
# =========================================================

def main():

    print("PYTHON: Entrando na main...", flush=True)

    global time_productive
    global time_neutral
    global time_distracting
    global last_send_time
    global last_log_time

    print(f"DEVICE_CODE:{DEVICE_CODE}", flush=True)

    device_id = get_or_create_device()
    if not device_id:
        print("PYTHON: Falha ao obter device_id. Saindo.", flush=True)
        return

    load_state()

    while True:

        try:

            app_name = get_active_window_app()

            if not app_name:
                time.sleep(LOOP_INTERVAL)
                continue

            url = None
            title = None

            if app_name == "Google Chrome":

                url, title = get_chrome_url()

            status = classify_activity(app_name, url, title)

            if status == "produtivo":
                time_productive += LOOP_INTERVAL

            elif status == "distração":
                time_distracting += LOOP_INTERVAL

            else:
                time_neutral += LOOP_INTERVAL

            key = app_name

            if url:
                key = urlparse(url).netloc.replace("www.", "")

            app_usage_seconds[key] = app_usage_seconds.get(key, 0) + LOOP_INTERVAL

            total = time_productive + time_neutral + time_distracting

            score = (time_productive / total * 100) if total else 0

            print(f"SCORE:{int(score)}", flush=True)
            print(f"ACTIVE:{key}", flush=True)

            now = time.time()

            # =========================================================
            # UPDATE STATE
            # =========================================================

            if now - last_send_time >= SEND_INTERVAL and supabase:

                payload = {

                    "device_id": device_id,
                    "state": "active",
                    "productivity": score,
                    "current_activity": key,
                    "productive_time": time_productive,
                    "neutral_time": time_neutral,
                    "distracting_time": time_distracting,
                    "app_usage": app_usage_seconds,
                    "last_sync": datetime.utcnow().isoformat()

                }

                supabase.table("device_state") \
                    .upsert(payload, on_conflict="device_id") \
                    .execute()

                last_send_time = now

                save_state()

            # =========================================================
            # DAILY LOG
            # =========================================================

            if now - last_log_time >= LOG_INTERVAL and supabase:

                log_data = {

                    "device_id": device_id,
                    "device_code": DEVICE_CODE,
                    "date": str(date.today()),
                    "productivity_score": score,
                    "productive_time": time_productive,
                    "neutral_time": time_neutral,
                    "distracting_time": time_distracting,
                    "app_usage": app_usage_seconds

                }

                supabase.table("productivity_logs") \
                    .insert(log_data) \
                    .execute()

                last_log_time = now

        except Exception as e:

            print("Loop error:", e)

        time.sleep(LOOP_INTERVAL)


# =========================================================

if __name__ == "__main__":

    print("PYTHON: Script iniciado.", flush=True)

    init_supabase()

    main()

    