from bottle import run as runapi
from bottle import route, response, request, hook, HTTPResponse
from urllib.parse import unquote, quote, urlsplit, urljoin
import json
import os
import re
import subprocess
import gzip
import http.client

@route("/getBatteryPercentage")
def get_battery_percentage():
    result = subprocess.run("cat /sys/class/power_supply/BAT0/capacity", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

@route("/getBatteryStatus")
def get_battery_status():
    result = subprocess.run("cat /sys/class/power_supply/BAT0/status", shell=True, capture_output=True, text=True)
    return result.stdout.strip()

runapi(host="localhost", port=8081, debug=True)