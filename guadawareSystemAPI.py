from bottle import run as runapi
from bottle import route, response, hook
import subprocess

@hook("after_request")
def allow_cors():
    response.headers["Access-Control-Allow-Origin"] = "*"

@route("/safariProxy/<url:path>")
def safariProxy(url):
    result = subprocess.run(f"curl -A 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' {url}", shell=True, capture_output=True, text=True)
    return result.stdout

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

runapi(host="localhost", port=8080, debug=True)