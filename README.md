# Kreeda — Premium Tournament Management & Bracket Scheduler

Kreeda is a premium, full-stack tournament management and scheduling platform designed for single-elimination (knockout) tournaments. It features a sleek, obsidian dark-themed user interface enhanced with golden glow accents, real-time live match ticker updates, and dynamic bracket generation across multiple independent sport categories.

---

##  Key Features

### 1. Multi-Sport Tournament Architecture
- **Flexible Sports Configurations**: Tournaments can be created with only a name initially. Sport categories can be configured at creation or added dynamically later (e.g. Football, Basketball, Tennis) inline on the tournament dashboard.
- **Isolated Brackets**: Each sport under the same tournament has its own independent team roster, bracket generator, scheduled fixtures, completed results, and champion.
- **Sport-Specific Locking**: Seeding and roster modifications are locked per sport category only when matches/brackets for that specific sport have been generated.

### 2. Live Arena Tab & Real-Time Scoring
- **Live Arena**: A homepage dashboard tab that lists all active live matches across all tournaments and sports categories on the platform.
- **Ongoing Score Updates**: Admins can edit and save current match scores for active games in real time using the **Save Current Scores** button, updating brackets instantly without prematurely completing the match.
- **Flexible Score Formatting**: Scores are stored as string values, allowing custom formats like tennis sets (`6-4, 7-5`), table tennis points, or half-time statuses (`30/40`, `3-2`).

### 3. Smart Seed & Excel Parser
- **SheetJS Roster Imports**: Bulk import team rosters from Excel/CSV templates.
- **Validation**: Automatically validates column headers, checks for duplicate team names within the upload file, and cross-references existing database entries to prevent conflicts.

### 4. Professional PDF Exports
- **PDFKit Engine**: Generates professional PDF match fixtures documents filtering schedules by selected sport categories.

---

##  Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React (Icons), SheetJS (XLSX).
- **Backend**: Node.js, Express, TypeScript, Mongoose (MongoDB).
- **Testing**: Vitest (backend unit testing).

---

##  Credentials & Environment Setup

- **Default Admin Account**:
  - **User ID**: `admin`
  - **Password**: `santaclaus@2512`

Ensure your MongoDB instance is running. The server connects to the database specified in your environment variables or defaults to:
`mongodb://localhost:27017/kreeda`

---

##  Setup & Execution

### 1. Installation
Install all monorepo dependencies from the project root:
```bash
npm install
```

### 2. Run in Development Mode
Start both the React frontend dev server and the Express backend concurrently:
```bash
npm run dev
```
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

### 3. Execute Server Unit Tests
Run backend test suites for the single-elimination bracket generation and bye advancement math:
```bash
npm run test:server
```

### 4. Build for Production
To bundle the frontend and compile the Express server into Javascript:
```bash
# Build React Client
npm run build:client

# Build Express Server
npm run build:server
```
