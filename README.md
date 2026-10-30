# Aurelia Horizon — 3D Tropical Alien Planet & Moon Explorer

A zero-build, web-based 3D space exploration prototype built with **Three.js (ES Modules)** for instant deployment on **GitHub Pages**.

## Gameplay Overview

1. **Explore the Tropical Alien Planet (`Aurelia Prime`) in 3rd Person**
   - Built on a **6-face procedural cube-sphere mesh** with seeded fractal simplex/ridged hills, coral beaches, a translucent turquoise ocean, glowing bioluminescent mushroom trees, alien spiral palm fronds, floating spore orbs, and crystalline mineral spires.
   - Walk, sprint, jump, and jetpack-boost across the entire spherical world with pole-safe spherical gravity.
2. **Find & Install 5 Ship Components**
   - Follow the glowing vertical sky beacons and the top compass bar to collect all 5 scattered components (`Quantum Fusion Core`, `Plasma Thruster Manifold`, `Astronavigation Matrix`, `Graviton Hull Stabilizer`, `Pulse Cannon Capacitor`).
   - Return to your crashed Starfighter and press **`E`** to install the parts and bring the ship online.
3. **Board, Take Off, Orbit, Boost & Fire Weapons**
   - Press **`E`** to board the Starfighter, hold **`Space` + `W`** to lift off through the tropical atmosphere into space, and press **`O`** to engage **Arcade Orbit-Assist** for a smooth circular orbit viewing the planet below.
   - Hold **`Shift`** for high-speed **Plasma Afterburner Boost** and click **`Left Mouse`** (or hold **`F`**) to fire **Twin Pulse Cannons** at orbital asteroids and rogue sentinel drones.
4. **Land on 3 Moons of Varying Size**
   - **Moon I — `Lumen` (Small, R=65)**: Low-gravity cyan-quartz & ice satellite.
   - **Moon II — `Pyra` (Medium, R=105)**: Amber-basalt volcanic ridges and craters.
   - **Moon III — `Goliath` (Large, R=155)**: Massive violet-ringed outer titan moon.
   - Touch down gently (`< 95 m/s`) on any moon and press **`E`** to disembark and walk around in low gravity!

---

## Controls

| Mode | Action | Keys / Mouse |
| :--- | :--- | :--- |
| **On Foot (3rd Person)** | Move / Strafe | `W` `A` `S` `D` or Arrow Keys |
| | Sprint | Hold `Shift` |
| | Jump / Jetpack Boost | Tap `Space` to Jump, Hold `Space` in mid-air for Jetpack |
| | Look / Zoom Camera | `Mouse` (click canvas to lock pointer, `Esc` to unlock) / `Scroll Wheel` |
| | Collect Part / Install / Board Ship | `E` |
| **Starfighter (Flight & Orbit)** | Forward / Reverse Thrust | `W` / `S` |
| | Ascend (Takeoff) / Descend (Land) | `Space` / `Left Ctrl` or `C` |
| | Strafe Left / Right | `A` / `D` |
| | Pitch & Yaw Steering | `Mouse` (or Arrow Keys / Look Stick) |
| | **6DoF Axial Roll** | `Q` (Roll Left) / `E` (Roll Right in flight) / Mobile Touch `ROLL` buttons |
| | **Afterburner Boost** | Hold `Shift` + `W` |
| | **Arcade Orbit-Assist Toggle** | `O` |
| | **Fire Chin Pulse Cannons** | `Left Click` or `F` |
| | Disembark onto Planet or Moon | `E` (when landed or hovering low < 16 m) |
| **Quick Test Shortcuts** | Instant Repair + Board / Orbit / Moons | Keys `1`, `2`, `3`, `4`, `5` (or click left HUD buttons) |
| **Settings & Updates** | Open UI Color Schemes, Touch Controls & GitHub Updater | Key `P` (or click `⚙ Settings & Updates [P]` on HUD) |

### Mobile & Touchscreen Controls (Auto-detected on Touchscreens / WebAPK)

- **3 Selectable Layouts** (in Settings `[P]`):
  1. **Dual Virtual Joysticks (Default)**: Left thumbstick for analog movement / thrust; Right thumbstick for smooth camera look / ship steering.
  2. **Floating Stick + Look Area**: Left half of screen spawns a floating stick dynamically under thumb; Right half is a touch-drag look trackpad.
  3. **Virtual D-Pad + Look Area**: Tactile 8-way directional pad on left; Touch-drag look trackpad on right.
- **Context-Aware Action Buttons**:
  - **On-Foot Exploration**: `RUN` (sprint lock toggle), `JUMP / JET` (tap jump / hold jetpack), `ACT [E]` (collect / install / board).
  - **Starfighter Flight**: `FIRE` (chin pulse cannons), `BOOST` (afterburner), `UP ▲` / `DN ▼` (ascend/descend), `ROLL ⟲` / `ROLL ⟳` (axial barrel roll), `ORBIT [O]` (arcade orbit assist), `EXIT [E]` (disembark).
- **Collapsible HUD**: Tap the `−`/`+` button on Telemetry and Radar panels on mobile screens to minimize HUD clutter.

---

## Running Locally (Zero Dependencies)

Browsers require an HTTP server to load ES modules (`type="module"`). Because this project uses zero external build tools, a built-in PowerShell server is included:

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Then open **`http://localhost:8080/`** in Microsoft Edge or Chrome.
- To run the automated unit tests, open **`http://localhost:8080/tests/index.html`**.

---

## Step-by-Step Guide: Deploying to GitHub Pages

You haven't created a remote GitHub repository yet. Follow these steps to publish and play the game online via GitHub Pages:

### 1. Stage and Commit Your Files Locally
Open PowerShell or Git Bash in this project folder and run:

```powershell
git add .
git commit -m "Add Aurelia Horizon 3D planet, ship repair, orbit, and 3 moons prototype"
```

### 2. Create a New Repository on GitHub (`p4kk4s4n/aurelia-horizon`)
1. Go to [https://github.com/new](https://github.com/new).
2. Enter the repository name: **`aurelia-horizon`**.
3. Choose **Public** (required for free GitHub Pages on personal accounts).
4. **Do NOT** check "Add a README file" or ".gitignore" (we already have them here).
5. Click **Create repository**.

### 3. Push This Repository to GitHub
Run these commands in PowerShell or Git Bash from this project folder:

```powershell
git branch -M main
git remote add origin https://github.com/p4kk4s4n/aurelia-horizon.git
git push -u origin main
```

### 4. Enable GitHub Pages
1. On your GitHub repository page (`https://github.com/p4kk4s4n/aurelia-horizon`), click **Settings** (top tab bar).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions** (this repo includes [`.github/workflows/pages.yml`](.github/workflows/pages.yml)) — *or* select **Deploy from a branch** → branch `main` / `/ (root)` and click **Save**.
4. Wait ~30–60 seconds, refresh the **Pages** settings page, and open your live game link:
   **`https://p4kk4s4n.github.io/aurelia-horizon/`**

---

## Unique WebAPK / PWA Identity (`p4kk4s4n-aurelia-horizon`)

Because all project sites on a GitHub account share the same root origin (`https://p4kk4s4n.github.io`), this project includes a dedicated Web App Manifest ([`manifest.webmanifest`](manifest.webmanifest)) and Service Worker ([`sw.js`](sw.js)) configured with:
- **`"id": "p4kk4s4n-aurelia-horizon"`** (resolves to `https://p4kk4s4n.github.io/aurelia-horizon/p4kk4s4n-aurelia-horizon`)
- **`"scope": "./"`** and **`"start_url": "./"`** (scoped strictly to `/aurelia-horizon/`)
- **`CACHE_NAME = "p4kk4s4n-aurelia-horizon-v1"`**

This guarantees that Android Chrome/Edge and desktop PWA installers generate a standalone **WebAPK** uniquely bound to `p4kk4s4n` and `aurelia-horizon`, without colliding with any other repositories hosted under `p4kk4s4n.github.io`.
