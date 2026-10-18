# ha-fusion

A fast, highly customizable, modern dashboard for [Home Assistant](https://www.home-assistant.io/), built with SvelteKit and Svelte 5.

Connects to Home Assistant over WebSocket for instant real-time updates and optimistic state toggling, featuring an intuitive drag-and-drop editor, custom card support, Mattias Persson `button-card` template engine, bills management with AI OCR, and waste collection tracking.

[![Docker Image](https://img.shields.io/badge/docker-islamek%2Fha--fusion-blue.svg?logo=docker)](https://hub.docker.com/r/islamek/ha-fusion)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-Compatible-41BDF5.svg?logo=homeassistant)](https://www.home-assistant.io/)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-FF3E00.svg?logo=svelte)](https://svelte.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🌟 Key Features

### 🎨 Modular Drag-and-Drop Dashboard
- **Visual Layout Editor**: Drag, drop, sort, and resize cards across sections without touching YAML by hand.
- **Persistent Storage**: All views, sections, and items are automatically serialized and saved to clean, human-readable YAML (`dashboard.yaml`).
- **Horizontal & Vertical Stacks**: Nest sections and stacks to build complex multi-dimensional layouts for tablets, mobile, and wall-mounted touchscreens.

---

### 🔲 3-Tier Responsive Card Sizing & Dynamic Grid
Every section column accommodates a 3-row grid structure, allowing cards of different heights to snap and align seamlessly:

| Size | Height | Grid Rows | Description |
| :--- | :--- | :--- | :--- |
| **Standard (1/3)** | `~61px` | `span 1` | Compact horizontal button displaying icon, name, and live state. |
| **Medium (2/3)** | `~129px` | `span 2` | Vertical card with top icon, optional circular brightness ring, and bottom title/state. |
| **Square (Full / 3/3)** | `~197px` | `span 3` | Full 1:1 aspect ratio card based on the signature Mattias Persson design aesthetic. |

> **Column Snapping**: Stack a **1/3 Standard** button and a **2/3 Medium** button in the same column to cleanly match a neighboring **Square** card. Drag cards freely between columns with real-time horizontal pointer tracking.

---

### 🧩 Native Lovelace Custom Card Support
Run community Home Assistant custom cards (Web Components) natively inside ha-fusion:
- **One-Click Installer**: Download cards directly from GitHub repositories (e.g. `piitaya/lovelace-mushroom`, `Clooos/Bubble-Card`, `artem-sedykh/mini-climate-card`, `wm_animated_ha_card`) or direct `.js` URLs.
- **Home Assistant Polyfills**: Built-in support for `<ha-card>`, `<ha-icon>`, `<ha-state-icon>`, `<ha-svg-icon>`, `<ha-relative-time>`, and Material Web Components (`mwc-*`).
- **Resilient State Mocking**: Proxy-based state layer prevents crashes when previewing unconfigured cards or entities that haven't loaded yet.
- **Live Preview & Visual Config**: Configure cards using an interactive visual preview, entity dropdowns, and an inline YAML configuration editor.
- **Multi-Card Discovery**: Automatically indexes card bundles containing multiple components (e.g., all 17 Mushroom sub-cards and 8 Bubble Card variants).

---

### 🪄 `custom:button-card` Template Compatibility Engine
Bring your existing Home Assistant button templates into ha-fusion:
- **Template Inheritance**: Resolves nested template hierarchies (e.g., `light` inheriting from `base`, `circle`, and `loader`).
- **Embedded JavaScript Evaluation**: Evaluates custom button-card JS snippets enclosed in `[[[ ... ]]]` with live `entity`, `state`, `states`, and `variables` context.
- **SVG Circular Progress Indicators**: Native rendering of circular percentage gauges for brightness, battery, or progress rings.
- **Dynamic Icons & Styling**: Evaluates template-driven custom SVG icons, states, and CSS variables.

---

### 💳 Household Bills & Expense Tracker
Keep track of household utility bills and recurring expenses directly from your dashboard:
- **Overview & Totals**: View monthly and yearly summaries, track total spent, and monitor pending vs. paid bills.
- **Receipt & Invoice Attachments**: Upload and store PDF/image bills with integrated viewing.
- **AI-Powered Bill Scanning**: Extract vendor name, due date, invoice amount, currency, and payment reference numbers automatically using AI.
- **Filters & Categories**: Filter by status (Paid / Unpaid) and categorize expenses (Electricity, Internet, Water, Heating, etc.).

---

### ♻️ Waste Collection Schedule
Never miss trash collection day:
- **Countdown & Highlighting**: Displays upcoming collection dates with waste-type icons (Mixed, Paper, Plastic, Bio).
- **AI Schedule Extraction**: Upload an image or PDF of your local municipal collection calendar to extract dates and schedules automatically.

---

### 🪟 Custom Popups & Gesture Controls
- **YAML Custom Popups**: Open custom popup dialogs loaded from `/data/popup/*.yaml` (similar to `browser_mod`).
- **Gesture Actions**: Configure **Tap**, **Hold**, or **Double Tap** actions to toggle devices, open domain modals, or trigger custom popups.
- **Slide to Dim**: Drag horizontally across any light button to adjust brightness smoothly with optimistic real-time feedback.

---

### 🎵 Media & Spotify Integration
- **Full Spotify Player**: Album artwork, track progress, volume control, and source selection.
- **Quick-Play Shortcuts**: Add one-tap playlists, albums, and radio stations to your dashboard.
- **Camera Streaming**: Live video feeds with responsive scaling, WebRTC, and HLS support.

---

## 🚀 Installation & Deployment

### Recommended: Docker Compose

Create a `docker-compose.yml` file:

```yaml
services:
  ha-fusion:
    container_name: ha-fusion
    image: islamek/ha-fusion:latest
    ports:
      - '5050:5050'
    volumes:
      # Persistent dashboard configs, custom cards, templates, and bills
      - ./data:/app/data
      # Optional: Read-only mount to your Home Assistant config for direct template access
      # - /path/to/homeassistant/config:/config:ro
    environment:
      - TZ=Europe/Zagreb
      - HASS_URL=http://192.168.1.100:8123   # Your Home Assistant URL
      - PORT=5050
      - NODE_ENV=production
      - BODY_SIZE_LIMIT=25M
    restart: always
```

Start the container:

```bash
docker compose up -d
```

Access your dashboard at `http://<your-server-ip>:5050`.

---

### Docker Run (Standalone)

```bash
docker run -d \
  --name ha-fusion \
  -p 5050:5050 \
  -v $(pwd)/data:/app/data \
  -e TZ=Europe/Zagreb \
  -e HASS_URL=http://192.168.1.100:8123 \
  -e PORT=5050 \
  --restart always \
  islamek/ha-fusion:latest
```

---

## 📂 Directory Structure (`/app/data`)

When mounted, `./data` persists all your custom settings and assets:

```text
data/
├── dashboard.yaml              # Dashboard layout, views, and cards
├── configuration.yaml          # Global dashboard configuration
├── custom_cards.json           # Registry of installed Lovelace custom cards
├── custom_cards/               # Downloaded .js custom card files
│   ├── mushroom.js
│   ├── bubble-card.js
│   └── mini-climate-card-bundle.js
├── button_card_templates/      # Custom button-card template YAMLs
│   ├── base.yaml
│   ├── circle.yaml
│   └── light.yaml
├── popup/                      # Custom popup definitions (*.yaml)
│   └── climate_popup.yaml
├── bills.json                  # Bills database
├── bills_files/                # Uploaded bill invoices and receipts
├── waste_collection.json       # Waste collection schedule
└── custom_css.css              # Custom user stylesheets
```

---

## ⚙️ Configuration & Environment Variables

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `HASS_URL` | **Yes** | — | Home Assistant base URL (e.g., `http://192.168.1.100:8123`) |
| `PORT` | No | `5050` | Port on which the dashboard server listens |
| `TZ` | No | `UTC` | Timezone (e.g. `Europe/Zagreb`, `America/New_York`) |
| `BODY_SIZE_LIMIT` | No | `25M` | Upload limit for bill invoices and calendar images |
| `NODE_ENV` | No | `production`| Runtime environment mode |

### URL Query Parameters
- `?view=<ViewName>`: Automatically opens a specific view on load (e.g., `?view=LivingRoom`).
- `?menu=false`: Hides the sidebar and menu button (ideal for wall-mounted kiosks and tablets).

### Keyboard Shortcuts
- <kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>S</kbd>: Save dashboard changes
- <kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>Z</kbd>: Undo last action
- <kbd>Cmd</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd>: Redo
- <kbd>F</kbd>: Quick entity filter
- <kbd>Esc</kbd>: Close modal or exit edit mode

---

## 🛠️ Development & Contributing

### Prerequisites
- [Node.js](https://nodejs.org) (v20+ or v22)
- [pnpm](https://pnpm.io)

### Local Setup

```bash
# Clone repository
git clone https://github.com/slamek10/ha-fusion.git
cd ha-fusion

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env and specify your HASS_URL

# Start development server
pnpm dev -- --open
```

### Code Quality & Validation

```bash
# Svelte diagnostics and typecheck
pnpm check

# Linter and formatting
pnpm lint
pnpm format

# Production build
pnpm build
```

---

## 📜 Credits

- Original ha-fusion creator: [matt8707](https://github.com/matt8707) ([Original Repository](https://github.com/matt8707/ha-fusion)).
- Maintained and extended by [slamek10](https://github.com/slamek10/ha-fusion) with custom card support, button template compatibility, multi-size cards, bills management, and AI scheduling.
