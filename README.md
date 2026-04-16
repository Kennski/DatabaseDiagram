# DatabaseDiagram

An interactive web-based tool for visualizing and analyzing database schemas. Connect to a live **MySQL**, **PostgreSQL**, or **SQL Server** database — or paste / upload a SQL dump — to instantly generate searchable table lists, draggable visual diagrams, automated schema quality analysis, and shareable exports.

---

## Features

### Connection & Import
- **Live Database Connection** — Connect directly to MySQL / MariaDB, PostgreSQL, or Microsoft SQL Server and generate diagrams on the fly
- **SQL Import** — Paste or upload a `.sql` dump file (up to 50 MB) without needing a live database. Supports MySQL, PostgreSQL, and SQL Server dump syntax, including `ALTER TABLE ... ADD FOREIGN KEY` statements
- **SQL Dialect Auto-Detection** — Automatically detects MySQL, PostgreSQL, or SQL Server syntax when you paste or upload SQL, updating the dialect selector with a confidence-based scoring system. Manual override always available
- **Image Re-Import** — Drag a previously exported PNG or SVG (with embedded schema metadata) onto the upload area to instantly reload the schema
- **Password Optional** — Password field is optional for all database types; SQL Server also supports Windows Authentication (no username)
- **Recent Connections** — Previously used database connections are saved in localStorage for quick access

### Views & Navigation
- **Global Navigation Bar** — Consistent top nav across all pages with tab-style page links (Table List, Visual Diagram, Analysis), active page indicator, database context badge showing the connected database name and version, and centralized Export/Share dropdown
- **Table List View** — Searchable, filterable list of all tables with columns, types, keys, and foreign key relationships
- **Visual Diagram** — Interactive canvas with draggable table boxes and curved FK arrows showing relationships
- **Schema Analysis** — Automated analysis page that flags design issues (missing PKs, broken FKs, missing indexes), warnings (orphaned tables, nullable FKs, wide tables), and best-practice tips (naming conventions, timestamps, unbounded text columns). Includes an overall letter grade

### Diagram Features
- **Auto-Categorization** — Tables are automatically grouped into color-coded categories (ASP.NET Identity, Hangfire, EF Migrations, and prefix-based groups)
- **Pan & Zoom** — Navigate large schemas with mouse wheel zoom, click-and-drag panning, and keyboard shortcuts
- **Minimap** — Overview panel for quick navigation across the entire diagram
- **Category Legend** — Click a category to focus/highlight its tables
- **Non-Overlapping Layout** — Tables are automatically arranged in a grid layout with no overlaps, while still allowing manual repositioning by dragging

### Export & Sharing
- **Share Link** — Generate a compressed URL with the full schema embedded in the hash. Anyone with the link can view the diagram without a database connection
- **HTML Export** — Download a self-contained interactive HTML file with searchable table list, category filters, and collapsible cards. Works offline — just open in any browser
- **PDF Export** — Print-optimized layout with cover page, table of contents, column details, relationship summary, and schema analysis grade. Uses the browser's built-in print-to-PDF
- **Markdown Export** — GitHub-Flavored Markdown documentation with tables grouped by category, column details, indexes, and FK relationships. Ready for wikis (GitHub, Confluence, Notion)
- **PNG Export** — Visual diagram as PNG with footer bar and embedded schema metadata (re-importable)
- **SVG Export** — Visual diagram as SVG with footer bar and embedded schema metadata (re-importable)
- **Mermaid Export** — Download or copy a Mermaid `erDiagram` block for embedding in GitHub READMEs, Notion, or any Mermaid-compatible tool

### Schema Comparison
- **Schema Diff** — Compare two schemas side-by-side from any combination of live connections, SQL files, or the currently loaded schema. Shows added, removed, and modified tables with column-level change details
- **Diff Export** — Download the comparison as a Markdown report or share via compressed URL

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (included with Node.js)
- A supported database (optional — only needed for live connections):
  - MySQL or MariaDB
  - PostgreSQL
  - Microsoft SQL Server

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

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Choose a connection method:
   - **Live Connection** — Select your database type (MySQL, PostgreSQL, or SQL Server), enter the connection details, and click **Connect & Generate**. The port updates automatically when you switch database types. Password is optional for all types. A built-in guide shows connection details and export instructions for each database type.
   - **SQL File / Paste** — Paste CREATE TABLE statements or drag and drop a `.sql` file. The dialect is auto-detected (or select manually). Also accepts `.png` and `.svg` files exported from this tool for re-import.
3. You will be taken to the **Table List** view showing all tables, columns, and relationships
4. Use the **navigation tabs** at the top to switch between Table List, Visual Diagram, and Analysis views
5. Use the **Export / Share** dropdown in the nav bar to share or download the schema

### Keyboard Shortcuts (Visual Diagram)

| Key | Action |
|-----|--------|
| `R` | Reset zoom and position |
| `+` / `-` | Zoom in / out |
| Arrow keys | Pan the canvas |

---

## Project Structure

```
├── server.js                    # Express backend (API + static file serving + SQL parser)
├── package.json                 # Node.js project configuration
├── test-schema.sql              # 35-table e-commerce stress test schema
├── public/
│   ├── index.html               # Connection form (entry point) + SQL auto-detection
│   ├── dynamic-list.html        # Table list view
│   ├── dynamic-visual.html      # Visual diagram
│   ├── dynamic-analysis.html    # Schema analysis & tips
│   └── dynamic-diff.html        # Schema diff / comparison
├── docs/
│   └── superpowers/
│       ├── specs/               # Design specifications
│       └── plans/               # Implementation plans
└── .gitignore
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/schema` | Connect to a live database and return its schema. Send `dbType` (`mysql`, `postgres`, or `mssql`), `host`, `port`, `user`, `password` (optional), and `database` |
| `POST` | `/api/schema-from-sql` | Parse a SQL dump string and return the schema. Handles CREATE TABLE and ALTER TABLE ... ADD FOREIGN KEY statements |

---

## License

ISC
