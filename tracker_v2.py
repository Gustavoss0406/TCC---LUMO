import time
import subprocess
import io
import os
import json
import sys
from urllib.parse import urlparse
from datetime import datetime, date

# Bibliotecas macOS
from Quartz import CGWindowListCopyWindowInfo, kCGWindowListOptionOnScreenOnly, kCGNullWindowID
from AppKit import NSWorkspace
from PIL import Image

from openai import OpenAI
from supabase import create_client

# =========================================================
# CONFIGURAÇÃO
# =========================================================

SUPABASE_URL = "https://xshsxwbfqzkdukdsxgry.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHN4d2JmcXprZHVrZHN4Z3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODAxOTUsImV4cCI6MjA4ODU1NjE5NX0.2YQoXe1ehGXdtH2hUj3xOXqwvpxNfAcA6Dd6o1uGCJA"

# CÓDIGO DO DISPOSITIVO (Case Sensitive: Use exatamente como no banco)
DEVICE_CODE = "FB-060404"

# Intervalos
SEND_INTERVAL = 5
LOG_INTERVAL = 60
LOOP_INTERVAL = 1

# =========================================================
# CLIENTES
# =========================================================

try:
    client = OpenAI() 
except:
    client = None

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# =========================================================
# ESTADO GLOBAL
# =========================================================

icon_cache = set()
domain_cache = {}

time_productive = 0
time_neutral = 0
time_distracting = 0
app_usage_seconds = {}

last_send_time = time.time()
last_log_time = time.time()
device_id = None

# =========================================================
# FUNÇÕES DE SISTEMA
# =========================================================

def get_active_window_app():
    try:
        windows = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID)
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
        result = subprocess.check_output(["osascript", "-e", script], stderr=subprocess.DEVNULL)
        data = result.decode("utf-8").strip()
        if "|||" in data:
            return data.split("|||")
    except:
        pass
    return None, None

def get_app_path(app_name):
    script = f'''
    tell application "System Events"
        try
            set appPath to POSIX path of (file of application process "{app_name}")
            return appPath
        on error
            return ""
        end try
    end tell
    '''
    try:
        result = subprocess.check_output(["osascript", "-e", script], stderr=subprocess.DEVNULL)
        return result.decode().strip()
    except:
        return None

# =========================================================
# FUNÇÕES DO TRACKER
# =========================================================

def wait_for_device_registration():
    """Busca ou cria o dispositivo no banco."""
    print(f"🔎 Conectando ao dispositivo: {DEVICE_CODE}")
    
    while True:
        try:
            # 1. Tentar encontrar dispositivo existente
            response = supabase.table("devices") \
                .select("id") \
                .eq("device_code", DEVICE_CODE) \
                .limit(1) \
                .execute()
                
            if response.data and len(response.data) > 0:
                d_id = response.data[0]['id']
                print(f"✅ Dispositivo Encontrado! ID: {d_id}")
                return d_id
            
            # 2. Se não encontrar, criar novo (Auto-Provisioning)
            print("   ↳ Dispositivo não encontrado. Criando novo registro...")
            
            # Nome padrão inclui timestamp para unicidade visual se necessário
            device_name = f"Mac-{int(time.time())}"
            
            new_device = supabase.table("devices").insert({
                "device_code": DEVICE_CODE,
                "name": device_name,
                "created_at": datetime.utcnow().isoformat()
                # user_id deixamos NULL para ser reivindicado pelo App depois
            }).execute()
            
            if new_device.data and len(new_device.data) > 0:
                d_id = new_device.data[0]['id']
                print(f"✅ Dispositivo Criado! ID: {d_id}")
                print(f"👉 Agora vá no App e adicione um dispositivo com o código: {DEVICE_CODE}")
                return d_id

        except Exception as e:
            # Se der erro de duplicidade (pode acontecer em race condition), tenta buscar de novo
            if "duplicate key" in str(e):
                print("   ↻ Conflito de criação, tentando buscar novamente...")
                time.sleep(1)
                continue
            
            print(f"⚠️ Erro de conexão: {e}")
        
        sys.stdout.write(".")
        sys.stdout.flush()
        time.sleep(3)

def extract_and_upload_icon(app_name):
    if app_name in icon_cache: return

    try:
        # Check cache banco
        res = supabase.table("app_icons").select("id").eq("name", app_name).execute()
        if res.data:
            icon_cache.add(app_name)
            return
    except:
        pass

    app_path = get_app_path(app_name)
    if not app_path: return

    try:
        icon = NSWorkspace.sharedWorkspace().iconForFile_(app_path)
        icon.setSize_((128,128))
        tiff_data = icon.TIFFRepresentation()
        image = Image.open(io.BytesIO(tiff_data))
        
        temp_path = f"/tmp/{app_name}.png"
        image.save(temp_path)

        file_name = f"icons/{app_name}_{int(time.time())}.png"
        with open(temp_path, "rb") as f:
            supabase.storage.from_("avatars").upload(file_name, f, {"content-type": "image/png"})
        
        public_url = supabase.storage.from_("avatars").get_public_url(file_name)

        supabase.table("app_icons").insert({
            "name": app_name,
            "icon_url": public_url,
            "type": "app"
        }).execute()
        
        icon_cache.add(app_name)
        os.remove(temp_path)
    except:
        pass

def classify_activity(app, url=None, title=None):
    productive_apps = ["Code", "Visual Studio Code", "Figma", "Terminal", "iTerm2", "Cursor", "Trae", "Xcode", "FocusBuddy"]
    
    if app in productive_apps: return "produtivo"
    
    if url:
        domain = urlparse(url).netloc.replace("www.", "")
        if domain in domain_cache: return domain_cache[domain]
        
        distracting = ["instagram.com", "tiktok.com", "twitter.com", "x.com", "facebook.com", "youtube.com", "netflix.com"]
        productive = ["github.com", "stackoverflow.com", "docs.google.com", "notion.so", "figma.com", "localhost"]
        
        for d in distracting:
            if d in domain: 
                domain_cache[domain] = "distração"
                return "distração"
        for d in productive:
            if d in domain: 
                domain_cache[domain] = "produtivo"
                return "produtivo"

        if client:
            try:
                prompt = f"Classifique '{url}' ({title}) em uma palavra: PRODUTIVO, DISTRACAO ou NEUTRO."
                resp = client.chat.completions.create(
                    model="gpt-4o-mini", 
                    messages=[{"role":"user", "content": prompt}], 
                    max_tokens=10
                )
                res = resp.choices[0].message.content.strip().lower()
                if "produtivo" in res: r = "produtivo"
                elif "distracao" in res or "distração" in res: r = "distração"
                else: r = "neutro"
                domain_cache[domain] = r
                return r
            except:
                pass
                
    return "neutro"

# =========================================================
# LOOP PRINCIPAL
# =========================================================

def main():
    global time_productive, time_neutral, time_distracting, last_send_time, last_log_time, device_id

    device_id = wait_for_device_registration()

    print("\n🚀 RASTREADOR INICIADO!")
    print(f"📡 Código do Dispositivo: {DEVICE_CODE}")

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

            if status == "produtivo": time_productive += LOOP_INTERVAL
            elif status == "distração": time_distracting += LOOP_INTERVAL
            else: time_neutral += LOOP_INTERVAL

            key = app_name
            if url: key = urlparse(url).netloc.replace("www.", "")
            
            if key not in app_usage_seconds: app_usage_seconds[key] = 0
            app_usage_seconds[key] += LOOP_INTERVAL

            if not url: extract_and_upload_icon(app_name)

            total = time_productive + time_neutral + time_distracting
            score = (time_productive / total * 100) if total > 0 else 0

            sys.stdout.write(f"\r[{status[:4].upper()}] {key[:20]:<20} | Score: {int(score)}% | Prod: {time_productive}s")
            sys.stdout.flush()

            now = time.time()

            # Sync State
            if now - last_send_time >= SEND_INTERVAL:
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
                # Upsert na tabela device_state usando device_id como chave
                supabase.table("device_state").upsert(payload, on_conflict="device_id").execute()
                last_send_time = now

            # Log History
            if now - last_log_time >= LOG_INTERVAL:
                today = str(date.today())
                log_data = {
                    "device_id": device_id,
                    "device_code": DEVICE_CODE, # Coluna importante no novo schema
                    "date": today,
                    "productivity_score": score,
                    "productive_time": time_productive,
                    "neutral_time": time_neutral,
                    "distracting_time": time_distracting,
                    "app_usage": app_usage_seconds
                }
                # Upsert usando (device_id, date) como constraint
                # Se o banco tiver constraint unique(device_id, date), isso funciona
                supabase.table("productivity_logs").upsert(log_data, on_conflict="device_id,date").execute()
                print(" [Salvo]")
                last_log_time = now

        except KeyboardInterrupt:
            print("\n👋 Parando...")
            break
        except Exception as e:
            # Ignora erros de rede momentâneos
            pass
        
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    main()
