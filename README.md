# SHG Loan Member Photo & GPS Report Application

A mobile-first, enterprise-grade field verification and loan documentation web application designed for microfinance field officers, credit managers, and administrators.

---

## 🌟 Key Features

### 1. 📷 Live Camera & GPS Watermarking Engine
- **Rear-Camera Priority**: Direct browser video stream (`facingMode: 'environment'`) with device camera app fallback.
- **Real-Time Geotag Acquisition**: Captures Latitude, Longitude, GPS Accuracy (± meters), Timestamp, and reverse-geocoded Village/Taluk address.
- **Canvas-Based Watermark Stamping**: Automatically embeds high-contrast, professional GPS telemetry and verification banners directly onto the photograph canvas without obscuring member faces.
- **Photo Audit Storage**: Stores both original source photographs and stamped reporting assets.

### 2. 🗂️ 10-Member + 1 Group Photo Guided Wizard
- **13-Step Guided Workflow**:
  - **Step 1**: SHG Profile, Loan Account Number, Meeting Date, Location, Sanction Amount.
  - **Steps 2 to 11**: Individual Member 1 to 10 Profiles & Geotagged Photos with live counter (`X/10 Completed`).
  - **Step 12**: Final Group Photograph with all present members.
  - **Step 13**: Mandatory Checklist & Full Dossier Review.
  - **Step 14**: Submission Confirmation & Instant Multi-Page PDF Download.
- **Rapid Testing Tool**: One-click **"Auto-fill Sample"** button to populate 10 member profiles and SHG details instantly.

### 3. 📄 Multi-Page Corporate PDF Report Generation
- **Page 1**: Official Header, Report ID (e.g. `SHG-2026-000101`), SHG Profile Table, Officer Audit Info, 10-Member Summary Roster.
- **Pages 2 to 6**: High-resolution 2-per-page individual member photo cards with stamped GPS overlays, coordinates, customer IDs, and loan amounts.
- **Page 7**: Full-width SHG Group Photo, geofence verification telemetry, legal declaration, and 3 official signature blocks (Field Officer, Branch Operations Manager, SHG President/Secretary).

### 4. 📶 Offline-First Resilience (Zero Data Loss)
- **IndexedDB Local Storage**: All form data, member records, and base64 stamped photos persist locally in the field even without network connectivity.
- **Batch Synchronization**: One-tap **"Sync Pending Reports"** uploads all offline drafts to the central server once back online.

### 5. 🛡️ Executive Admin Control Center
- **Officer Management**: Create, edit, and toggle active/inactive status for field employees.
- **Cross-Branch Report Explorer**: Search and filter by SHG name, Report ID, village, branch, status, and date range.
- **One-Click Data Exports**: Multi-sheet Microsoft Excel (`.xlsx`) and raw CSV (`.csv`) containing complete member GPS telemetry.
- **System Audit Trail**: Immutable logging of logins, submissions, edits, and sync actions.

---

## 🔑 Default Login Credentials

| Role | Employee ID / Username | Password | Branch Allocation |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `ADMIN001` | `admin123` | Central Operations |
| **Field Officer 1** | `EMP001` | `field123` | Mandya Rural Branch |
| **Field Officer 2** | `EMP002` | `field123` | Mysuru North Branch |
| **Field Officer 3** | `EMP003` | `field123` | Dharwad Central Branch |

*(Quick-login buttons are also provided on the login screen for instant one-click authentication).*

---

## 🚀 Running the Application

### 1. Start the Backend API Server
```bash
cd server
npm start
```
*Runs on `http://localhost:5000` with SQLite JSON database and static uploads serving.*

### 2. Start the Frontend Application
```bash
cd client
npm run dev
```
*Runs on `http://localhost:5173` with full camera and geolocation support.*

---

## 📂 Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPanel.jsx             # Executive dashboard, employee CRUD, Excel/CSV exports
│   │   │   ├── CameraCapture.jsx          # Live video stream, GPS acquisition, watermark stamping
│   │   │   ├── Dashboard.jsx              # Employee metrics & quick actions
│   │   │   ├── Login.jsx                  # Secure authentication with quick-fill accounts
│   │   │   ├── Navbar.jsx                 # Responsive header with online/offline status
│   │   │   ├── OfflineBanner.jsx          # Offline indicator & batch sync trigger
│   │   │   ├── ReportHistory.jsx          # Searchable & filterable reports table
│   │   │   ├── ReportViewerModal.jsx      # High-fidelity dossier inspector & lightbox
│   │   │   └── SHGDocumentationWizard.jsx # 13-step guided field documentation wizard
│   │   ├── context/
│   │   │   ├── AuthContext.jsx            # User authentication state
│   │   │   └── OfflineContext.jsx         # Network status & sync manager
│   │   ├── services/
│   │   │   ├── api.js                     # REST API client
│   │   │   └── offlineDb.js               # IndexedDB local storage engine
│   │   └── utils/
│   │       ├── location.js                # Geolocation & reverse geocoding
│   │       ├── pdfGenerator.js            # Multi-page corporate PDF report generator
│   │       └── watermark.js               # HTML5 Canvas GPS watermark stamping
│   └── package.json
└── server/
    ├── data/                              # Database file (shg_app.json)
    ├── uploads/                           # Stored original & stamped photos
    ├── src/
    │   ├── database.js                    # Database storage engine & seeds
    │   ├── server.js                      # Express API server
    │   ├── middleware/auth.js             # JWT authentication & role-based access
    │   ├── routes/
    │   │   ├── auth.js                    # Login & profile endpoints
    │   │   ├── shgs.js                    # SHG documentation, photos, & batch sync
    │   │   └── admin.js                   # Employee management & Excel/CSV export
    │   └── utils/photoStorage.js          # Image disk persistence utility
    └── package.json
```
