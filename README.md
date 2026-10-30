# Aurelia Horizon — 3D Tropical Alien Planet & Moon Explorer

A zero-build, web-based 3D space exploration prototype built with **Three.js (ES Modules)** for instant deployment on **GitHub Pages**.

## Gameplay Overview

1. **Explore the Tropical Alien Planet (`Aurelia Prime`) in 3rd Person**
   - Built on a **6-face procedural cube-sphere mesh** with seeded fractal simplex/ridged hills, coral beaches, a translucent turquoise ocean, glowing bioluminescent mushroom trees, alien spiral palm fronds, floating spore orbs, and crystalline mineral spires.
   - Walk, sprint, jump, and jetpack-boost across the entire spherical world with pole-safe spherical gravity.
2. **Find & Install 5 Ship Components**
   - Follow the glowing vertical sky beacons and the top compass bar to collect all 5 scattered components (`Quantum Fusion Core`, `Plasma Thruster Manifold`, `Astronavigation Matrix`, `Graviton Hull Stabilizer`, `Pulse Cannon Capacitor`).
   - Return to your crashed Starfighter and press **`E`** to install the parts and bring the ship online.
3. **Board, Take Off, Full Newtonian Orbit, Boost & Fire Weapons**
   - Press **`E`** (or tap **`ACT`** on touch) to board the Starfighter, hold **`Space` + `W`** to punch through the dense atmosphere into the vacuum of space ($h > 140\text{ m}$).
   - **Full Newtonian Orbital Mechanics**: Gravity scales with pure inverse-square spherical physics ($g = \mu / r^2$), and space vacuum has zero artificial drag ($C_d = 0$). Momentum is fully conserved in orbit.
   - **SAS Flight Computer Modes**: Press **`O`** (or tap **`SAS`** on touch) to cycle 5 SAS autopilot modes:
     - `STABILITY`: Dampens angular rotational rates while preserving orbital velocity vector.
     - `PROGRADE`: Automatically aligns starfighter nose along velocity vector ($\mathbf{v}$).
     - `RETROGRADE`: Aligns engine nozzle along velocity vector ($-\mathbf{v}$) for de-orbit burns.
     - `CIRCULARIZE`: Uses orbital telemetry ($Ap, Pe, v_{circ}$) to calculate and steer toward instantaneous circular velocity.
     - `OFF`: Pure unassisted Newtonian drift.
   - **Real-Time Keplerian Orbit Telemetry**: Live readouts of Apoapsis ($Ap$), Periapsis ($Pe$), Eccentricity ($e$), and Target Circular Velocity ($v_{circ}$) on the HUD.
   - **Instant Afterburner Boost**: Hold **`Shift`** (or touch **`BOOST`**) to immediately unleash $180\text{ m/s}^2$ plasma afterburners without needing forward stick/W key.
   - Click **`Left Mouse`** (or hold **`F`** / tap **`FIRE`**) to fire **Twin Under-Nose Pulse Cannons** at orbital asteroids and rogue sentinel drones.
4. **Land on 3 Moons of Varying Size**
   - **Moon I — `Lumen` (Small, R=65)**: Low-gravity cyan-quartz & ice satellite.
   - **Moon II — `Pyra` (Medium, R=105)**: Amber-basalt volcanic ridges and craters.
   - **Moon III — `Goliath` (Large, R=155)**: Massive violet-ringed outer titan moon.
   - Touch down gently (`< 95 m/s`) on any moon and press **`E`** to disembark and walk around in low gravity!

---

## Controls

| Mode | Action | Keys / Mouse | Touchscreen |
| :--- | :--- | :--- | :--- |
| **On Foot (3rd Person)** | Move / Strafe | `W` `A` `S` `D` or Arrow Keys | Left Virtual Thumbstick / D-Pad |
| | Sprint | Hold `Shift` | `RUN` Toggle Button |
| | Jump / Jetpack Boost | Tap `Space` to Jump, Hold `Space` for Jetpack | `JUMP / JET` Button |
| | Look / Zoom Camera | `Mouse` / `Scroll Wheel` | Right Thumbstick / Look Touchpad |
| | Collect Part / Install / Board Ship | `E` | `ACT` Button |
| **Starfighter (Flight & Orbit)** | Forward / Reverse Thrust | `W` / `S` | Left Virtual Thumbstick (Y-axis) |
| | Ascend (Takeoff) / Descend (Land) | `Space` / `Left Ctrl` or `C` | `UP ▲` / `DN ▼` Buttons |
| | Strafe Left / Right | `A` / `D` | Left Virtual Thumbstick (X-axis) |
| | Pitch & Yaw Steering | `Mouse` (or Arrow Keys) | Right Thumbstick / Look Touchpad |
| | **6DoF Axial Roll** | `Q` (Roll Left) / `E` (Roll Right in flight) | `ROLL ⟲` / `ROLL ⟳` Buttons |
| | **Instant Afterburner Boost** | Hold `Shift` | `BOOST` Button (fires forward immediately) |
| | **SAS Flight Computer Toggle** | `O` | `SAS` Button (cycles Stability, Prograde, Retrograde, Circularize, Off) |
| | **Fire Chin Pulse Cannons** | `Left Click` or `F` | `FIRE` Button |
| | Disembark onto Planet or Moon | `E` (when landed or hovering low < 16 m) | `EXIT` Button |
| **Quick Test Shortcuts** | Instant Repair + Board / Orbit / Moons | Keys `1`, `2`, `3`, `4`, `5` | Top-Left Quick Orbit & Moon Buttons |
| **Settings & Updates** | Open UI Color Schemes, Touch Controls & GitHub Updater | Key `P` | `⚙ Settings & Updates` HUD Button |

### Dynamic Keybindings & Custom Controls (Configurable in Settings `[P]`)

All keyboard controls are **dynamically assignable** in the Settings modal (`[P]`). You can rebind any action by clicking its key button and pressing your desired key:
- **On-Foot Exploration**: Move Forward, Backward, Strafe Left, Strafe Right, Sprint / Run, Jump / Jetpack Boost, Interact / Collect / Board.
- **Starfighter Newtonian Flight**: Forward Thrust, Reverse Thrust / Brake, Strafe Left / Right, Ascend / Lift Off, Descend / Land, 6DoF Roll Left / Right, Afterburner Boost, Cycle SAS Autopilot, Fire Pulse Cannons, Disembark (Landed).
- **System & Shortcuts**: Open Settings, Quick Repair & Board, Quick Orbit, Quick Moons I, II, III.
- **Dynamic UI Propagation**: All in-game HUD prompt banners (`Press [Key] to collect/board/disembark`), mission guidance objectives, quick buttons, and bottom controls guides automatically adapt in real-time to reflect your custom key assignments.
- **Persistence & Reset**: Custom keybindings are saved to `localStorage` automatically, with a one-click **"Reset to Defaults"** button.

### Mobile & Touchscreen Controls (Auto-detected on Touchscreens / WebAPK)

- **Ergonomic, Non-Overlapping Mobile Layouts**:
  - **Portrait Viewports**: Virtual thumbsticks are anchored to the bottom corners with dedicated thumb reach. Action buttons (`RUN`, `JUMP/JET`, `ACT`) are elevated with a 14px buffer above the right stick, preventing accidental thumb collisions.
  - **Landscape Viewports**: The right thumbstick and the context action buttons maintain a generous 15px clearance buffer with zero overlap.
  - **Starfighter 4x2 Button Grid**: When piloting, the 8 flight buttons (`[DN]`, `[UP]`, `[ROLL ⟲]`, `[ROLL ⟳]`, `[SAS]`, `[BOOST]`, `[FIRE]`, `[EXIT]`) organize into a compact 4-column by 2-row grid beside the steering stick.
  - **Clear Center Sky Prompts**: In-game interaction prompts and status notices are elevated to the upper sky beneath the compass bar, keeping the lower 70% of the screen completely clear for navigation.
  - **Auto-Collapsing Telemetry**: On compact or mobile screens, the telemetry panel automatically collapses into a sleek header pill (`[+]`) on load to maximize screen visibility.
  - **Desktop Legend Auto-Hide**: The desktop keyboard controls footer is automatically hidden whenever touch controls are active.
- **UI Scale & Display Ratio Slider** (Configurable in Settings `[P]`):
  - Global UI scaling from `0.65x` to `1.40x` dynamically adjusts all fonts, HUD panels, radar, thumbsticks, and action buttons.
  - **Aspect Ratio Presets**:
    - `Auto Aspect Fit`: Automatically calculates the optimal UI scale based on window aspect ratio and height (e.g., automatically scales down to 75% on ultrawide or narrow phone viewports).
    - `Compact (75%)`, `Standard (100%)`, `Large (120%)` presets with real-time percentage badge and slider readout.
    - Automatic responsive adaptation on window resize events, persisted to `localStorage`.
- **Idle Auto-Hide**: All on-screen touchscreen buttons and joysticks automatically fade out after **3 seconds of inactivity**, offering an unobstructed panoramic view of space and planets. Any touch instantly wakes the controls up.
- **Clean Mobile Prompts**: No confusing desktop keyboard key letters on mobile buttons or in-game interaction prompts. Action buttons display clear names (`ACT`, `EXIT`, `SAS <mode>`, `BOOST`, `FIRE`).
- **Pointer Capture & Reliable Hold**: Action buttons use pointer capture so rapid tapping or thumb drags do not lose contact or drop afterburner thrust.
- **3 Selectable Touch Layouts** (in Settings `[P]`):
  1. **Dual Virtual Joysticks (Default)**: Left thumbstick for analog movement / thrust; Right thumbstick for smooth camera look / ship steering.
  2. **Floating Stick + Look Area**: Left half of screen spawns a floating stick dynamically under thumb; Right half is a touch-drag look trackpad.
  3. **Virtual D-Pad + Look Area**: Tactile 8-way directional pad on left; Touch-drag look trackpad on right.

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
