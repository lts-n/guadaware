# Guadaware

**Guadaware** is the desktop environment for **Guadafón**, an open mobile device project made in Andalusia. It provides a touch-first, graphical shell with a lock screen, home screen, control center, and a growing collection of built-in applications — all running on top of standard Linux tools.

Guadaware is architected to be portable: although it is the native desktop of the Guadafón, it is designed so it can be ported to other mobile platforms based on **Android** or **Ubuntu Touch**.

## Layout

Guadaware follows the Filesystem Hierarchy Standard, so the whole system can be deployed simply by installing the `usr/` tree onto the root filesystem:

| Path | Contents |
| --- | --- |
| `usr/bin/startguadaware` | Single launcher that starts the whole desktop |
| `usr/lib/libguadaware/` | System API, startup scripts and GUI |

## Architecture

The system is divided into three cooperating layers:

### 1. GUI (`usr/lib/libguadaware/guadawareGUI/`)

The user interface is a collection of **static web apps** (HTML/CSS/JavaScript) served over HTTP. The shell (status bar, gesture bar, and control center) lives in `index.html`, and each app is its own folder under `apps/`.

Shared UI styling for apps is provided by the **Guadaware Universal Framework** (`guadawareGUI/guadawareUniversalFramework/style.css`).

The GUI is served by a tiny static server:

- `guadawareGUI/guadawareGUIServer` — starts `python3 -m http.server 8000` (serves on port `8000`).

### 2. System API (`usr/lib/libguadaware/guadawareSystemAPI.py`)

A lightweight **Bottle (Python)** HTTP API on `localhost:8080` that exposes device functionality to the web UI as REST endpoints:

| Endpoint | Purpose |
| --- | --- |
| `/safariProxy/<url:path>` | Proxy remote web content into the Safari app (via `curl`) |
| `/getGuadawareBuild` | Read the build/version from `/etc/guadaware-build` |
| `/setWallpaper/<number>` | Copy a wallpaper into place |
| `/poweroff` | Power the device off |
| `/sh/<cmd:path>` | Execute a shell command and return output |
| `/getBatteryPercentage` | Read battery capacity from sysfs |
| `/getCellularDataStatus`, `/setCellularDataStatus/<s>` | Query / toggle cellular data (`nmcli`) |
| `/getAirplanemode`, `/setAirplanemode/<s>` | Query / toggle airplane mode (`nmcli`) |
| `/getRAMUsage` | Report memory usage (`free`) |
| `/getDiskUsage` | Report disk usage (`df`) |
| `/getPCModel` | Report device model from DMI |
| `/getCPUModel` | Report CPU model (`lscpu`) |
| `/getGPUModel` | Report GPU model (`lspci`) |

Networking and radio control is delegated to **NetworkManager** (`nmcli`).

### 3. Startup / Display layer

The GUI is displayed full-screen in a kiosk-mode web view managed by the Wayland compositor **Cage**:

- `usr/lib/libguadaware/clientstart` — launches `cage` to provide the Wayland session.
- `usr/lib/libguadaware/chromiumstart` — clears browser state and launches **Chromium** in `--kiosk` app mode pointing at `http://localhost:8000`.

## Dependencies

- **Python 3** with the **Bottle** micro-framework (`python3 -m pip install bottle`)
- **cage** — Wayland kiosk compositor
- **Chromium** — Web view engine
- **NetworkManager** (`nmcli`) — Wi-Fi, cellular and airplane-mode control
- **curl** — used by the Safari proxy
- Common CLI utilities: `poweroff`, `free`, `df`, `lscpu`, `lspci`

## Running

### One-shot launcher

The whole desktop — system API, GUI server and Cage session — is started with a single command.

Run it straight from this repository:

```sh
./usr/bin/startguadaware
```

Or install it system-wide first:

```sh
sudo cp -r usr/lib /usr/
sudo install -m 755 usr/bin/startguadaware /usr/bin/
/usr/bin/startguadaware
```

### Running the services individually

For debugging, each layer can be started on its own:

Start the system API (must run from `usr/lib/libguadaware/`, it uses relative paths):

```sh
cd usr/lib/libguadaware
python3 guadawareSystemAPI.py
```

Start the GUI server:

```sh
./usr/lib/libguadaware/guadawareGUI/guadawareGUIServer
```

Launch the desktop:

```sh
./usr/lib/libguadaware/clientstart
```

## License

Guadaware is licensed under the **GNU General Public License version 3 (GPL-3.0)**. See the [LICENSE](LICENSE) file for details.

The bundled Calculator app is a third-party component licensed under the **MIT License** (see `guadawareGUI/apps/calculator/LICENSE`).