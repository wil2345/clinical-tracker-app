# Clinical Tracker Specification

## 1. Project Overview
A premium, **PWA-enabled**, offline-first clinical tracking application designed for B-ALL (B-cell Acute Lymphoblastic Leukemia) management. Built with ES6+ JavaScript, HTML5, and Tailwind CSS, featuring **high-capacity IndexedDB storage** for large data sets including clinical photos.

---

## 2. Design Principles (Midnight Slate Clinical)

### Visual Aesthetic
- **Theme:** Midnight Slate & Indigo.
- **Header/Footer:** Fixed `bg-slate-900` with `backdrop-blur` (Glassmorphism).
- **Safe Areas:** Full support for iOS/Android status bars and home indicators (`env(safe-area-inset)`).
- **Elevation:** High-depth `shadow-premium` for cards and modals.
- **Typography:** Inter font family. High-contrast hierarchy for clinical clarity.

### Interaction Design
- **Social-Post Cards:** Records styled like social media posts with "Observations" priority.
- **Fixed Navigation:** Top-fixed dynamic header displaying current view context and active cycle badges. Primary actions are unified in the sidebar/bottom-nav to maintain a clean header.
- **Dynamic Content:** Header title and cycle badges update instantly based on active view and treatment dates.
- **Smart Learning:** Automatic suggestion engine for medications, foods, and units.

---

## 3. Current Implementation (Status: Production Ready - v1.2.0)

### Core PWA & Storage
- [x] **PWA Infrastructure:** Installable standalone app with Service Worker (`sw.js`) for offline support.
- [x] **Auto-Update:** Non-disruptive Toast Notification update logic (prevents data loss from forced reloads when new versions are deployed).
- [x] **IndexedDB Migration:** High-capacity, asynchronous storage replacing the 5MB localStorage limit.
- [x] **Source Tracking:** Every record is tagged as `manual`, `generated`, or `import` for clinical audit.

### Clinical Management
- [x] **Historical Blood Counts:** The dashboard badges for **ANC**, **PLT**, and **WBC** dynamically query the database to always display the absolute latest values from the patient's entire clinical history.
- [x] **Multi-Cycle Management:** Support for defining multiple overlapping treatment cycles (e.g., Induction, Pulse).
- [x] **Dynamic Day Counter:** Automatic calculation of "Day X" for all active cycles, displayed side-by-side in the top header.
- [x] **Clinical Photo Support:** Native camera/gallery integration with smart resizing (800px) and compression (max 5 photos per record).
- [x] **Emergency Logic:** Temperature >= 38.0°C or ANC < 0.5 triggers real-time red UI alerts.

### Data Portability
- [x] **Export CSV:** Generation of spreadsheet-compatible clinical reports for medical review.
- [x] **Full Backup (JSON):** Export/Import logic for total data preservation and device migration.
- [x] **Maintenance Tools:** Targeted clearing of "Generated" test data while preserving manual clinical records.

---

## 4. Quality Assurance & Testing

### Validation Framework
- **E2E Automation:** 22 comprehensive Playwright test cases covering Desktop and Mobile environments.
- **Asynchronous Integrity:** All tests validated against the new IndexedDB storage layer and async orchestrator.
- **PWA Verification:** Functional validation of header persistence, safe-area padding, update toasts, and dynamic routing logic.

---

## 5. Data Schema

### `Entry` Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Unique identifier. |
| `timestamp` | ISO String | Local device time. |
| `source` | String | `manual`, `generated`, or `import`. |
| `photos` | Array (B64) | Up to 5 compressed JPEG strings. |
| `notes` | String | Clinical observations. |
| `temp` | Number | Body temperature (rounded to 1 decimal). |
| `anc` | Number | ANC count (rounded to 2 decimals). |
| `platelets` | Number | Platelet count. |
| `wbc` | Number | White Blood Cell count. |
| `hb` | Number | Hemoglobin count. |
| `meds_items` | Array of Obj | `{ label, value, unit }`. |
| `food_items` | Array of Obj | `{ label, value, unit }`. |
| `fluid_items`| Array of Obj | `{ label, value, unit }`. |

### `Settings` Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `cycles` | Array of Obj | `{ id, name, startDate, endDate }`. |
| `emergency_temp`| Number | User-defined threshold (default 38.0). |
| `emergency_anc` | Number | User-defined threshold (default 0.5). |

---

## 6. Project Roadmap

### Future Phases
- [ ] **Data Visualization:** Integration of more advanced multi-cycle trend analysis.
- [ ] **Medication Reminders:** Local notification support via PWA APIs.
- [ ] **Multi-Patient Support:** Profile switching for families managing multiple treatment paths.