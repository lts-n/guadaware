from bottle import run as runapi
from bottle import route, response, request, hook
from urllib.parse import unquote, quote
import json
import os
import re
import subprocess

MUSIC_ROOT = os.path.expanduser("~/Music")
AUDIO_EXTS = (".mp3", ".flac", ".ogg", ".oga", ".opus", ".wav", ".m4a", ".aac", ".wma")


@hook("after_request")
def allow_cors():
    allowed_origins = {
        "http://localhost:8000",
        "http://localhost:8080"
    }

    origin = request.headers.get("Origin")

    if origin in allowed_origins:
        response.headers["Access-Control-Allow-Origin"] = origin

    response.headers["Accept-Ranges"] = "bytes"

@route("/safariProxy/<url:path>")
def safariProxy(url):
    url = unquote(url)
    if not url:
        return "no URL", 400
    result = subprocess.run(f"curl -A 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' {url}", shell=True, capture_output=True, text=True)
    return result.stdout

def run_cmd(cmd, timeout=15):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return result.stdout.strip(), result.stderr.strip(), result.returncode

def get_modem_index():
    stdout, _, _ = run_cmd("mmcli -L")
    for line in stdout.splitlines():
        if line.startswith("/org/freedesktop/ModemManager1/Modem/"):
            return line.split("/")[-1]
    return None

def get_sim_index(modem=None):
    if modem is None:
        modem = get_modem_index()
    if not modem:
        return None
    stdout, _, _ = run_cmd(f"mmcli -m {modem}")
    for line in stdout.splitlines():
        line = line.strip()
        if "sim path:" in line:
            sim_path = line.split("sim path:")[-1].strip().rstrip("]")
            if sim_path.endswith("/"):
                sim_path = sim_path.rstrip("/")
            sim_idx = sim_path.split("/")[-1]
            if sim_idx.isdigit():
                return sim_idx
    return None

@route("/installApp/<name>")
def install_app(name):
    pass

@route("/getSIMStatus")
def get_sim_status():
    modem = get_modem_index()
    if not modem:
        return "no-modem"
    stdout, _, _ = run_cmd(f"mmcli -m {modem}")
    for line in stdout.splitlines():
        line = line.strip()
        if line.startswith("state:"):
            state = line.split(":", 1)[1].strip().strip("()")
            if " " in state:
                state = state.split(" ", 1)[0]
            return state
    return "unknown"

@route("/postSIM-PIN/<pin>")
def post_simpin(pin):
    modem = get_modem_index()
    if not modem:
        return "no-modem"
    sim = get_sim_index(modem)
    if not sim:
        return "no-sim"
    _, stderr, code = run_cmd(f"mmcli -i {sim} --pin={pin}")
    if code == 0 or "already unlocked" in stderr.lower() or "already unblocked" in stderr.lower():
        return "ok"
    if "pin required" in stderr.lower() or "sim-pin" in stderr.lower():
        return "pin-required"
    if "puk" in stderr.lower():
        return "puk-required"
    return stderr or "failed"

@route("/getSIMPinStatus")
def get_sim_pin_status():
    modem = get_modem_index()
    if not modem:
        return "no-modem"
    sim = get_sim_index(modem)
    if not sim:
        return "no-sim"
    stdout, _, _ = run_cmd(f"mmcli -i {sim}")
    for line in stdout.splitlines():
        line = line.strip()
        if "pin" in line.lower() and "puk" in line.lower():
            if "blocked" in line.lower():
                return "puk-blocked"
            if "required" in line.lower():
                return "pin-required"
        if "sim pin" in line.lower() and "state" in line.lower():
            if "blocked" in line.lower():
                return "puk-blocked"
            return "pin-required"
    stdout_full, _, _ = run_cmd(f"mmcli -i {sim} --pin-status")
    if "pin" in stdout_full.lower() and "required" in stdout_full.lower():
        return "pin-required"
    if "puk" in stdout_full.lower() and "blocked" in stdout_full.lower():
        return "puk-blocked"
    return "unlocked"

@route("/postSIM-PUK/<puk>/<newpin>")
def post_simpuk(puk, newpin):
    modem = get_modem_index()
    if not modem:
        return "no-modem"
    sim = get_sim_index(modem)
    if not sim:
        return "no-sim"
    _, stderr, code = run_cmd(f"mmcli -i {sim} --puk={puk} --pin={newpin}")
    if code == 0 or "already unblocked" in stderr.lower():
        return "ok"
    if "incorrect" in stderr.lower() or "wrong" in stderr.lower():
        if "puk" in stderr.lower():
            return "puk-wrong"
        return "failed"
    if "blocked" in stderr.lower():
        return "puk-blocked"
    return stderr or "failed"

@route("/getGuadawareBuild")
def get_guadaware_build():
    result = subprocess.run("cat /etc/guadaware-build", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/setWallpaper/<number>")
def set_wallpaper(number):
    subprocess.run(["cp", f"guadawareGUI/wallpapers/{number}.webp", "guadawareGUI/wallpaper.webp"])

@route("/poweroff")
def poweroff():
    subprocess.run(["poweroff"])

@route("/sh/<cmd:path>")
def sh(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout + result.stderr

@route("/getBatteryPercentage")
def get_battery_percentage():
    result = subprocess.run("cat /sys/class/power_supply/BAT0/capacity", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/getBatteryStatus")
def get_battery_status():
    result = subprocess.run("cat /sys/class/power_supply/BAT0/status", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/getCellularDataStatus")
def get_cellular_data_status():
    result = subprocess.run("nmcli radio wwan", shell=True, capture_output=True, text=True)
    if "disabled" in result.stdout:
        return "0"
    else:
        return "1"

@route("/setCellularDataStatus/<switch>")
def set_cellular_data_status(switch):
    if switch=="0":
        subprocess.run(["nmcli", "radio", "wwan", "off"])
    elif switch=="1":
        subprocess.run(["nmcli", "radio", "wwan", "on"])

@route("/getAirplanemode")
def get_airplanemode():
    result = subprocess.run(["nmcli", "radio", "all"], capture_output=True, text=True)
    if "disabled" in result.stdout:
        return "1"
    else:
        return "0"

@route("/setAirplanemode/<switch>")
def set_airplanemode(switch):
    if switch=="0":
        subprocess.run(["nmcli", "radio", "all", "on"])
    elif switch=="1":
        subprocess.run(["nmcli", "radio", "all", "off"])
        subprocess.run(["nmcli", "radio", "wwan", "off"], capture_output=True)

@route("/getRAMUsage")
def get_ramusage():
    result = subprocess.run("free -h | awk '/Mem:/ {print $3 \"/\" $2}'", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/getDiskUsage")
def get_diskusage():
    result = subprocess.run("df -h / | awk 'NR==2 {print $3 \"/\" $2}'", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/getPCModel")
def get_pc_model():
    result = subprocess.run("cat /sys/devices/virtual/dmi/id/product_name", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/getCPUModel")
def get_cpu_model():
    result = subprocess.run("lscpu | awk -F: '/Model name/ {print $2}'", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/getGPUModel")
def get_gpu_model():
    result = subprocess.run(r"lspci | grep -i 'vga\|3d\|2d' | awk -F: '{print $3}'", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/makeCall/<number>")
def make_call(number):
    try:
        subprocess.Popen(["gnome-calls", "-l", number], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return "ok"
    except FileNotFoundError:
        return "gnome-calls-not-found"
    except Exception as e:
        return f"error: {str(e)}"

@route("/sendSMS/<number>/<msg>")
def send_sms(number, msg):
    modem = get_modem_index()
    if not modem:
        return "no-modem"
    msg_escaped = msg.replace("'", "'\\''")
    stdout, stderr, code = run_cmd(f"mmcli -m {modem} --messaging-create-sms=\"number='{number}',text='{msg_escaped}'\"")
    if code != 0:
        return f"create-failed: {stderr}"
    sms_path = None
    for line in stdout.splitlines():
        line = line.strip()
        if "/org/freedesktop/ModemManager1/SMS/" in line:
            sms_path = line.split("/org/freedesktop/ModemManager1/SMS/")[-1].split()[0]
            break
    if not sms_path:
        return "sms-path-not-found"
    _, stderr, code = run_cmd(f"mmcli -s {sms_path} --send")
    if code == 0:
        run_cmd(f"mmcli -m {modem} --messaging-delete-sms={sms_path}")
        return "ok"
    return f"send-failed: {stderr}"

@route("/getSMSList")
def get_sms_list():
    modem = get_modem_index()
    if not modem:
        response.content_type = "application/json"
        return json.dumps([])
    stdout, _, _ = run_cmd(f"mmcli -m {modem} --messaging-list-sms")
    messages = []
    for line in stdout.splitlines():
        line = line.strip()
        if "/org/freedesktop/ModemManager1/SMS/" in line:
            sms_idx = line.split("/org/freedesktop/ModemManager1/SMS/")[-1].split()[0]
            state = line.split("(")[-1].rstrip(")") if "(" in line else "unknown"
            sms_data = get_sms_data(sms_idx)
            if sms_data:
                sms_data["index"] = sms_idx
                sms_data["state"] = state
                messages.append(sms_data)
    response.content_type = "application/json"
    return json.dumps(messages, ensure_ascii=False)

def get_sms_data(sms_idx):
    stdout, _, _ = run_cmd(f"mmcli -s {sms_idx}")
    data = {}
    for line in stdout.splitlines():
        line = line.strip()
        if line.startswith("number:"):
            data["number"] = line.split(":", 1)[1].strip()
        elif line.startswith("text:"):
            data["text"] = line.split(":", 1)[1].strip()
        elif line.startswith("state:"):
            data["state"] = line.split(":", 1)[1].strip()
    return data if data else None

@route("/deleteSMS/<sms_idx>")
def delete_sms(sms_idx):
    modem = get_modem_index()
    if not modem:
        return "no-modem"
    _, stderr, code = run_cmd(f"mmcli -m {modem} --messaging-delete-sms={sms_idx}")
    if code == 0:
        return "ok"
    return f"delete-failed: {stderr}"

def audio_mime(path):
    ext = os.path.splitext(path)[1].lower()
    return {
        ".mp3": "audio/mpeg",
        ".flac": "audio/flac",
        ".ogg": "audio/ogg",
        ".oga": "audio/ogg",
        ".opus": "audio/ogg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".wma": "audio/x-ms-wma",
    }.get(ext, "application/octet-stream")

def clean_title(filename):
    title = os.path.splitext(os.path.basename(filename))[0]
    title = re.sub(r"^\s*\d{1,3}\s*[-._)\]]?\s*", "", title)
    return title.strip()

def guess_music_metadata(parent):
    parts = [p for p in parent.split(os.sep) if p]
    artist = ""
    album = ""
    if len(parts) >= 2:
        artist, album = parts[-2], parts[-1]
    elif len(parts) == 1:
        album = parts[0]
    return artist, album

@route("/getMusicLibrary")
def get_music_library():
    root = os.path.realpath(MUSIC_ROOT)
    songs = []
    if os.path.isdir(root):
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted(d for d in dirnames if not d.startswith("."))
            for fname in sorted(filenames):
                if fname.startswith(".") or not fname.lower().endswith(AUDIO_EXTS):
                    continue
                full = os.path.join(dirpath, fname)
                rel = os.path.relpath(full, root)
                parent = os.path.dirname(rel)
                artist, album = guess_music_metadata(parent)
                try:
                    added = os.path.getmtime(full)
                except OSError:
                    added = 0
                songs.append({
                    "title": clean_title(fname),
                    "artist": artist,
                    "album": album,
                    "path": rel,
                    "url": "/music/" + quote(rel, safe="/ "),
                    "added": added,
                })
    songs.sort(key=lambda s: (s["artist"].lower(), s["album"].lower(), s["title"].lower()))
    response.content_type = "application/json"
    return json.dumps(songs, ensure_ascii=False)

@route("/music/<filepath:path>")
def serve_music(filepath):
    root = os.path.realpath(MUSIC_ROOT)
    full = os.path.realpath(os.path.join(root, unquote(filepath)))
    if not (full == root or full.startswith(root + os.sep)):
        response.status = 403
        return "forbidden"
    if not os.path.isfile(full):
        response.status = 404
        return "not found"
    size = os.path.getsize(full)
    mime = audio_mime(full)
    start, end, status = 0, size - 1, 200
    header_range = request.get_header("Range")
    if header_range:
        match = re.match(r"bytes=(\d*)-(\d*)", header_range)
        if match:
            first, last = match.groups()
            if first:
                start = int(first)
                if last:
                    end = min(int(last), size - 1)
            elif last:
                start = max(0, size - int(last))
        status = 206
    if start >= size:
        response.set_header("Content-Range", f"bytes */{size}")
        response.status = 416
        return ""
    response.status = status
    length = end - start + 1
    response.add_header("Content-Range", f"bytes {start}-{end}/{size}")
    response.content_type = mime
    response.add_header("Content-Length", str(length))
    def stream():
        with open(full, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                chunk = f.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk
    return stream()

runapi(host="localhost", port=8080, debug=True)