"""
Shared test fixtures and utilities for Guadaware API tests.
"""
import os
import sys
import time
import signal
import pytest
import requests
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
API_DIR = PROJECT_ROOT / "usr" / "lib" / "libguadaware"
NOTES_DIR = API_DIR / "guadawareGUI" / "apps" / "notes"
API_PORT = 18080
BATTERY_PORT = 18081
NOTES_PORT = 18082
BASE_URL = f"http://localhost:{API_PORT}"
BATTERY_URL = f"http://localhost:{BATTERY_PORT}"
NOTES_URL = f"http://localhost:{NOTES_PORT}"
TIMEOUT = 5


class APIServer:
    def __init__(self, script_path, port, env_var, cwd=None):
        self.script_path = script_path
        self.port = port
        self.env_var = env_var
        self.cwd = cwd or API_DIR
        self.process = None

    def start(self):
        env = os.environ.copy()
        env["PYTHONDONTWRITEBYTECODE"] = "1"
        env[self.env_var] = str(self.port)
        self.process = subprocess.Popen(
            [sys.executable, str(self.script_path)],
            cwd=str(self.cwd),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        self._wait_for_server()

    def _wait_for_server(self):
        start = time.time()
        while time.time() - start < TIMEOUT:
            try:
                requests.get(f"http://localhost:{self.port}/", timeout=1)
                return
            except (requests.ConnectionError, requests.Timeout):
                time.sleep(0.1)
        raise TimeoutError(f"Server on port {self.port} did not start")

    def stop(self):
        if self.process:
            self.process.send_signal(signal.SIGTERM)
            try:
                self.process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()


@pytest.fixture(scope="session")
def api_server():
    server = APIServer(API_DIR / "guadawareSystemAPI.py", API_PORT, "GUADAWARE_API_PORT")
    server.start()
    yield server
    server.stop()


@pytest.fixture(scope="session")
def battery_server():
    server = APIServer(API_DIR / "guadawareSystemBatteryAPI.py", BATTERY_PORT, "GUADAWARE_BATTERY_PORT")
    server.start()
    yield server
    server.stop()


@pytest.fixture(scope="session")
def notes_server():
    server = APIServer(NOTES_DIR / "app.py", NOTES_PORT, "GUADAWARE_NOTES_PORT", cwd=NOTES_DIR)
    server.start()
    yield server
    server.stop()


class APIClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()

    def get(self, path, **kwargs):
        return self.session.get(f"{self.base_url}{path}", timeout=TIMEOUT, **kwargs)

    def post(self, path, **kwargs):
        return self.session.post(f"{self.base_url}{path}", timeout=TIMEOUT, **kwargs)

    def delete(self, path, **kwargs):
        return self.session.delete(f"{self.base_url}{path}", timeout=TIMEOUT, **kwargs)


@pytest.fixture(scope="session")
def api(api_server):
    return APIClient(BASE_URL)


@pytest.fixture(scope="session")
def battery(battery_server):
    return APIClient(BATTERY_URL)


@pytest.fixture(scope="session")
def notes(notes_server):
    return APIClient(NOTES_URL)
