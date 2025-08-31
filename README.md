# OrderCraft

A fast, offline desktop app for managing orders, built with **Tauri (Rust + SQLite)** and a **React + TypeScript** UI. OrderCraft keeps your workflow focused: create and track orders, flip between the ones you’re working on, review a live dashboard, and tune the look & feel — all in a tiny, local app.

> **Why Tauri?** It gives you a native desktop shell with a very small footprint, secure Rust backend, and instant startup — perfect for an operations tool that you can trust on low‑power machines or in spotty network conditions.

---

## Highlights

- **Zero‑cloud, privacy‑friendly**: Data lives locally in SQLite (WAL mode). No server required.
- **“Opened orders” bar**: VS Code–style chips for quick context switching; only the active chip is underlined.
- **Left panel workflow**: Scrollable list with quick “done / edit / delete”, smart keyboard handling, and bulk-friendly layout.
- **Order drawer**: Create / edit without leaving context; right‑side panel with smooth focus management.
- **Dashboard**: Aggregates totals, weekly trends, company & article leaders, lead‑time distribution, upcoming schedule, activity heatmap, and overdue table.
- **Settings**: Choose Light / Dark / Custom themes, edit token palette, and configure a **confetti** color set for celebrations. Manage **Delivery companies** (add/rename/activate). 
- **Accessible by default**: ARIA labels, focus visible styles, Escape to close panels, and reduced‑motion awareness.
- **Performant**: Optimistic updates, WAL journaling, prepared statements, indexes, and a lightweight state store.

---

## Tech Stack

- **Frontend:** React + TypeScript, styled‑components, Zustand, Font Awesome, (Recharts for charts), canvas‑confetti.
- **Desktop shell:** Tauri.
- **Backend:** Rust (`rusqlite`) with SQLite (WAL, busy timeout, triggers, indexes).
- **Data model:** `orders`, `opened_orders`, `delivery_companies`, `settings`, `theme` tables; WAL + `synchronous=NORMAL` for speed and safety.

> The store wiring uses Zustand to switch Right Panel modes (Dashboard • Settings • Order content). Settings are persisted through Tauri commands to SQLite. Confetti respects OS reduced‑motion and your custom palette.

---

## Screenshots
### Order Content
<img width="1920" height="1080" alt="2025-08-31_17-40" src="https://github.com/user-attachments/assets/c0f64e81-f4d4-483c-a644-24a30194222e" />

### Left Panel
<img width="1920" height="1080" alt="2025-08-31_17-40_1" src="https://github.com/user-attachments/assets/c7b183d0-3eba-4525-8f86-bf7f9cd0451b" />

### Create Order
<img width="1920" height="1080" alt="2025-08-31_17-40_2" src="https://github.com/user-attachments/assets/04f9bbc2-8d12-4b21-9947-878d6a8c5aa9" />

### Dashboard
<img width="1920" height="1080" alt="2025-08-31_17-40_3" src="https://github.com/user-attachments/assets/8bd24570-0f23-467a-bd98-cf6b5f11f526" />

<img width="1920" height="1080" alt="2025-08-31_17-41" src="https://github.com/user-attachments/assets/c610eca1-08fa-4512-94a0-a580e705d1ad" />

### Delivery Companies
<img width="1920" height="1080" alt="2025-08-31_17-41_1" src="https://github.com/user-attachments/assets/151e0f46-a358-40fc-b32a-07a0999cd491" />

### Custom Theme
<img width="1920" height="1080" alt="2025-08-31_18-36" src="https://github.com/user-attachments/assets/01fd1dbe-019a-436a-a7a2-a14285789e40" />
<img width="1920" height="1080" alt="2025-08-31_18-35" src="https://github.com/user-attachments/assets/0a4e5c9d-7b25-40d1-83e3-a544e3f26f0d" />


### Custom Confetti
<img width="1920" height="1080" alt="2025-08-31_18-36_1" src="https://github.com/user-attachments/assets/96b245a0-da09-473d-89d5-cc7994205ca2" />


---

## Getting Started

### Prerequisites
- **Node.js** ≥ 18 and a package manager (npm / pnpm / yarn)
- **Rust** toolchain (stable) + **Tauri** prerequisites for your OS  
  See: https://tauri.app/start/prerequisites/
- (Optional) `sqlite3` CLI for manual DB inspection

### Install
```bash
# clone
git clone https://github.com/husseinhareb/OrderCraft.git
cd OrderCraft

# install frontend deps
npm install
# or: pnpm install / yarn
```

### Run (development)
```bash
# launches Vite dev server + Tauri window
npm run tauri dev
```

### Build (production)
```bash
npm run tauri build
# binary will be in src-tauri/target/<os>-<arch>/release
```

---

## Database

SQLite is initialized on app start with:

- **WAL mode** + `busy_timeout=5000ms`
- Foreign keys enabled
- Schema migrations guarded by `pragma_table_info` checks
- Useful indexes (status/date/company/article)
- Triggers to keep `orders.delivery_company` text in sync when a company is renamed or when `delivery_company_id` changes

### Core tables
- `orders(id, client_name, article_name, phone, city, address, delivery_company, delivery_date, description, done, created_at, delivery_company_id)`
- `opened_orders(order_id PRIMARY KEY, position)` — keeps “opened” stack stable and ordered
- `delivery_companies(id, name UNIQUE, active)` — canonical list for selection + analytics
- `settings(key, value)`, `theme(key, value)` — simple KV stores for app options & theme tokens


## App Architecture (high‑level)

- **Tauri commands** wrap DB reads/writes (`get_setting`, `set_setting`, `get_theme_colors`, `save_theme_colors`, `list_orders`, `open_order`, `remove_opened_order`, etc.).
- **Zustand store**: one source of truth for UI state (theme, opened stack, active order, modal/drawer toggles). Optimistic updates; server reconciliation with `fetchOpened()` after writes.
- **RightPanel** switches between **Dashboard**, **Settings**, or the **Order content** (form + details) based on store flags.
- **OpenedOrders** renders chips; mouse‑wheel converts vertical scroll to horizontal for a VS Code feel.
- **Settings** provides: theme radio (Light/Dark/Custom), per‑token palette editor (hex or rgba for overlay/hover/shadow), confetti palette (up to 5), and Delivery companies CRUD.

---


## Theming & Confetti

- Themes: **Light**, **Dark**, or **Custom** (with a Light/Dark base scaffold)
- Token editor for: `bg`, `surface`, `text`, `textMuted`, `border`, `borderStrong`, `line`, `lineFaint`, `overlay`, `hover`, `softShadow`, `primary`, `danger`, `warning`, `success`, `subtleBg`
- Confetti palette (up to 5 colors) is persisted, de‑duplicated, and used when marking orders **done** (unless reduced‑motion is on)

---

## Project Structure (excerpt)

```
src/
  components/
    LeftPanel/
      Styles/style.tsx
      LeftPanel.tsx
    RightPanel/
      Styles/style.tsx
      RightPanel.tsx
    Settings/
    OpenedOrders/
    OrderForm/
    OrderContent/
    Dashboard/
  store/
    store.ts                 # Zustand state
  styles/ GlobalStyle.ts
  theme/ theme.ts
src-tauri/
  src/
    commands/
    models/  
    db.rs
    lib.rs                  
    main.rs  
```

---


## Contributing

Contributions are welcome! If you'd like to contribute:

    Fork the repository.
    Create your branch: git checkout -b feature/YourFeature.
    Commit your changes: git commit -m 'Add some feature'.
    Push to the branch: git push origin feature/YourFeature.
    Submit a pull request.


## License

This project is open-source. See **LICENSE** for details.
