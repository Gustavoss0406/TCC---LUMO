import time
import subprocess
import io
import os
import json
import sys
from urllib.parse import urlparse
from datetime import datetime, date

# Bibliotecas macOS (instalar: pip install pyobjc-framework-Quartz pyobjc-framework-AppKit Pillow openai supabase)
from Quartz import CGWindowListCopyWindowInfo, kCGWindowListOptionOnScreenOnly, kCGNullWindowID
from AppKit import NSWorkspace
from PIL import Image

from openai import OpenAI
from supabase import create_client

# =========================================================
# CONFIGURAÇÃO
# =========================================================

# URL do seu projeto
SUPABASE_URL = "https://xshsxwbfqzkdukdsxgry.supabase.co"
# Chave anon pública
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaHN4d2JmcXprZHVrZHN4Z3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODAxOTUsImV4cCI6MjA4ODU1NjE5NX0.2YQoXe1ehGXdtH2hUj3xOXqwvpxNfAcA6Dd6o1uGCJA"

# CÓDIGO DO DISPOSITIVO (Deve ser o mesmo cadastrado no site)
DEVICE_CODE = "FB-060404"

# Intervalos
SEND_INTERVAL = 5   # Envia estado a cada 5s
LOG_INTERVAL = 60   # Salva histórico a cada 1min
LOOP_INTERVAL = 1   # Checa janela a cada 1s

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

# Cache
icon_cache = set()
domain_cache = {}

# Contadores
time_productive = 0
time_neutral = 0
time_distracting = 0
app_usage_seconds = {} # {'Google Chrome': 120, 'Code': 300}

last_send_time = time.time()
last_log_time = time.time()
device_id = None

# =========================================================
# FUNÇÕES DE SISTEMA (MACOS)
# =========================================================

def get_active_window_app():
    """Retorna o nome do app da janela ativa."""
    try:
        windows = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID)
        for window in windows:
            # Layer 0 geralmente é a janela principal ativa
            if window.get("kCGWindowLayer", 0) == 0:
                return window.get("kCGWindowOwnerName")
    except Exception:
        pass
    return None

def get_chrome_url():
    """Pega URL e Título do Chrome via AppleScript."""
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
    """Descobre onde o .app está instalado."""
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
    """Loop infinito até encontrar o dispositivo no banco."""
    print(f"🔎 Procurando dispositivo com código: {DEVICE_CODE}")
    print(f"👉 Acesse o app e cadastre um novo dispositivo com este código.")
    
    while True:
        try:
            response = supabase.table("devices").select("id").eq("device_code", DEVICE_CODE).execute()
            if response.data and len(response.data) > 0:
                d_id = response.data[0]['id']
                print(f"✅ Dispositivo conectado! ID: {d_id}")
                return d_id
        except Exception as e:
            pass
        
        sys.stdout.write(".")
        sys.stdout.flush()
        time.sleep(3)

def extract_and_upload_icon(app_name):
    """Gerencia ícones: extrai, sobe pro Storage e registra no banco."""
    if app_name in icon_cache:
        return

    # 1. Verifica se já existe no banco
    try:
        res = supabase.table("app_icons").select("id").eq("name", app_name).execute()
        if res.data:
            icon_cache.add(app_name)
            return
    except:
        pass

    # 2. Extrai ícone do sistema
    app_path = get_app_path(app_name)
    if not app_path: return

    try:
        icon = NSWorkspace.sharedWorkspace().iconForFile_(app_path)
        icon.setSize_((128,128))
        tiff_data = icon.TIFFRepresentation()
        image = Image.open(io.BytesIO(tiff_data))
        
        # Salva temp
        temp_path = f"/tmp/{app_name}.png"
        image.save(temp_path)

        # 3. Upload para Supabase Storage
        file_name = f"icons/{app_name}_{int(time.time())}.png"
        with open(temp_path, "rb") as f:
            supabase.storage.from_("avatars").upload(file_name, f, {"content-type": "image/png"})
        
        public_url = supabase.storage.from_("avatars").get_public_url(file_name)

        # 4. Registra na tabela
        supabase.table("app_icons").insert({
            "name": app_name,
            "icon_url": public_url,
            "type": "app"
        }).execute()
        
        icon_cache.add(app_name)
        os.remove(temp_path)
    except Exception as e:
        # Silencia erros de ícone para não poluir o log
        pass

def classify_activity(app, url=None, title=None):
    """Define se é Produtivo, Neutro ou Distração."""
    
    productive_apps = ["Code", "Visual Studio Code", "Figma", "Terminal", "iTerm2", "Cursor", "Trae", "Xcode", "FocusBuddy"]
    
    if app in productive_apps: return "produtivo"
    
    if url:
        domain = urlparse(url).netloc.replace("www.", "")
        
        if domain in domain_cache: return domain_cache[domain]
        
        distracting_domains = ["instagram.com", "tiktok.com", "twitter.com", "x.com", "facebook.com", "youtube.com", "netflix.com"]
        productive_domains = ["github.com", "stackoverflow.com", "docs.google.com", "notion.so", "figma.com", "localhost"]
        
        for d in distracting_domains:
            if d in domain: 
                domain_cache[domain] = "distração"
                return "distração"
                
        for d in productive_domains:
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
                if "produtivo" in res: result = "produtivo"
                elif "distracao" in res or "distração" in res: result = "distração"
                else: result = "neutro"
                
                domain_cache[domain] = result
                return result
            except:
                pass
                
    return "neutro"

# =========================================================
# LOOP PRINCIPAL
# =========================================================

def main():
    global time_productive, time_neutral, time_distracting, last_send_time, last_log_time, device_id

    # 1. Vincular Dispositivo
    device_id = wait_for_device_registration()

    print("\n� RASTREADOR INICIADO!")
    print("Pressione Ctrl+C para parar.")

    while True:
        try:
            # Coleta dados
            app_name = get_active_window_app()
            if not app_name:
                time.sleep(LOOP_INTERVAL)
                continue

            url = None
            title = None
            if app_name == "Google Chrome":
                url, title = get_chrome_url()

            # Classifica
            status = classify_activity(app_name, url, title)

            # Contabiliza Tempo
            if status == "produtivo": time_productive += LOOP_INTERVAL
            elif status == "distração": time_distracting += LOOP_INTERVAL
            else: time_neutral += LOOP_INTERVAL

            # Registra Uso do App
            key = app_name
            if url:
                key = urlparse(url).netloc.replace("www.", "")
            
            if key not in app_usage_seconds:
                app_usage_seconds[key] = 0
            app_usage_seconds[key] += LOOP_INTERVAL

            # Ícone
            if not url:
                extract_and_upload_icon(app_name)

            # Score
            total = time_productive + time_neutral + time_distracting
            score = (time_productive / total * 100) if total > 0 else 0

            # Feedback Visual
            sys.stdout.write(f"\r[{status[:4].upper()}] {key[:20]:<20} | Score: {int(score)}% | Prod: {time_productive}s")
            sys.stdout.flush()

            now = time.time()

            # Sincronizar Estado (Realtime)
            if now - last_send_time >= SEND_INTERVAL:
                payload = {
                    "state": "active",
                    "productivity": score,
                    "current_activity": key,
                    "productive_time": time_productive,
                    "neutral_time": time_neutral,
                    "distracting_time": time_distracting,
                    "app_usage": app_usage_seconds,
                    "last_sync": datetime.utcnow().isoformat()
                }
                supabase.table("device_state").update(payload).eq("device_id", device_id).execute()
                last_send_time = now

            # Salvar Log (Histórico)
            if now - last_log_time >= LOG_INTERVAL:
                today = str(date.today())
                log_data = {
                    "device_id": device_id,
                    "device_code": DEVICE_CODE,
                    "date": today,
                    "productivity_score": score,
                    "productive_time": time_productive,
                    "neutral_time": time_neutral,
                    "distracting_time": time_distracting,
                    "app_usage": app_usage_seconds
                }
                supabase.table("productivity_logs").upsert(
                    log_data, on_conflict="device_id,date"
                ).execute()
                print(" [Salvo]")
                last_log_time = now

        except KeyboardInterrupt:
            print("\n� Parando...")
            break
        except Exception as e:
            # Não para o loop em caso de erro de rede
            pass
        
        time.sleep(LOOP_INTERVAL)

if __name__ == "__main__":
    main()
