# DatabaseDiagram

An interactive web-based tool for visualizing database schemas. Connect to a live MySQL/MariaDB database or paste a SQL dump to instantly generate searchable table lists and draggable visual diagrams.

---

## Features

- **Live Database Connection** — Connect directly to any MySQL or MariaDB database and generate diagrams on the fly
- **SQL Import** — Paste or upload a `.sql` dump file (up to 50 MB) without needing a live database
- **Table List View** — Searchable, filterable list of all tables with columns, types, keys, and foreign key relationships
- **Visual Diagram** — Interactive canvas with draggable table boxes and curved FK arrows showing relationships
- **Auto-Categorization** — Tables are automatically grouped into color-coded categories (ASP.NET Identity, Hangfire, EF Migrations, and prefix-based groups)
- **Pan & Zoom** — Navigate large schemas with mouse wheel zoom, click-and-drag panning, and keyboard shortcuts
- **Minimap** — Overview panel for quick navigation across the entire diagram
- **Export** — Download the visual diagram as PNG or SVG
- **Category Legend** — Click a category to focus/highlight its tables
- **Recent Connections** — Previously used database connections are saved in localStorage for quick access
- **Non-Overlapping Layout** — Tables are automatically arranged in a grid layout with no overlaps, while still allowing manual repositioning by dragging

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (included with Node.js)
- A MySQL or MariaDB database (optional — only needed for live connections)

---

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Kennski/DatabaseDiagram.git
   cd DatabaseDiagram
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the server**

   ```bash
   npm start
   ```

   The server starts on port `3000` by default. Set the `PORT` environment variable to change it.

4. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Usage

### Dynamic Tool (recommended)

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Choose a connection method:
   - **Live Connection** — Enter your database host, port, username, password, and database name, then click **Connect & Generate**
   - **SQL File / Paste** — Drag and drop a `.sql` file onto the upload area, or paste SQL content into the text box, then click **Parse & Generate**
3. You will be taken to the **Table List** view showing all tables, columns, and relationships
4. Click **Visual Diagram** in the navigation bar to see the interactive visual diagram
5. Use the diagram controls:
   - **Scroll** to zoom in/out
   - **Click and drag** on the background to pan
   - **Drag a table** to reposition it
   - Click a **category** in the legend to focus on that group
   - Use the **Download** buttons (PNG / SVG) to export the diagram

### Static Diagrams

Pre-generated static diagrams are also available if you have a `schema.json` file:

- [http://localhost:3000/database_diagram.html](http://localhost:3000/database_diagram.html) — Static table list
- [http://localhost:3000/visual_diagram.html](http://localhost:3000/visual_diagram.html) — Static visual diagram

To regenerate the static diagrams from a `schema.json` file:

```bash
node generate_diagram.js
node generate_visual_diagram.js
```

### Keyboard Shortcuts (Visual Diagram)

| Key | Action |
|-----|--------|
| `R` | Reset zoom and position |
| `+` / `-` | Zoom in / out |
| Arrow keys | Pan the canvas |

---

## Project Structure

```
├── server.js                    # Express backend (API + static file serving)
├── package.json                 # Node.js project configuration
├── schema.json                  # Pre-parsed schema data (for static diagrams)
├── generate_diagram.js          # Generates static table list HTML
├── generate_visual_diagram.js   # Generates static visual diagram HTML
├── database_diagram.html        # Static table list page
├── visual_diagram.html          # Static visual diagram page
├── public/
│   ├── index.html               # Dynamic tool — connection form
│   ├── dynamic-list.html        # Dynamic tool — table list view
│   └── dynamic-visual.html      # Dynamic tool — visual diagram
└── .gitignore
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/schema` | Connect to a live database and return its schema |
| `POST` | `/api/schema-from-sql` | Parse a SQL dump string and return the schema |

---

## License

ISC
