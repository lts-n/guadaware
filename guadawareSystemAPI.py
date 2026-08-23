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
    
runapi(host="localhost", port=8080, debug=True)
