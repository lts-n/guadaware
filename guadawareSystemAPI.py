from bottle import run as runapi
from bottle import route, response, hook
import subprocess

@hook("after_request")
def allow_cors():
    response.headers["Access-Control-Allow-Origin"] = "*"

@route("/poweroff")
def poweroff():
    subprocess.run(["poweroff"])

@route("/sh/<cmd:path>")
def sh(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout + result.stderr

@route("/getStatusbarUser")
def get_statusbaruser():
    return "<DOCTYPE html><html><head><style>body { color: #000000; font-size: clamp(11px, 1.6vw, 14px); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4); font-family: -apple-system, \"Helvetica Neue\", Helvetica, Arial, sans-serif; }</style></head><body>" + subprocess.run(["whoami"], shell=True, capture_output=True, text=True).stdout + "</body></html>"

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

@route("/getCPUModel")
def get_cpu_model():
    result = subprocess.run("lscpu | awk -F: '/Model name/ {print $2}'", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/getGPUModel")
def get_gpu_model():
    result = subprocess.run("lspci | grep -i 'vga\|3d\|2d' | awk -F: '{print $3}'", shell=True, capture_output=True, text=True)
    return result.stdout.strip()
runapi(host="localhost", port=8080, debug=True)
