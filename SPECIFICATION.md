# Clinical Tracker Specification

## 1. Project Overview
A premium, **PWA-enabled**, offline-first clinical tracking application designed for B-ALL (B-cell Acute Lymphoblastic Leukemia) management. Built with ES6+ JavaScript, HTML5, and Tailwind CSS, featuring **high-capacity IndexedDB storage** for large data sets including clinical photos.

---

## 2. Design Principles (Midnight Slate Clinical)

### Visual Aesthetic
- **Theme:** Midnight Slate & Indigo.
- **Header/Footer:** Sticky `bg-slate-900` with `backdrop-blur` (Glassmorphism).
- **Safe Areas:** Full support for iOS/Android status bars and home indicators (`env(safe-area-inset)`).
- **Elevation:** High-depth `shadow-premium` for cards and modals.
- **Typography:** Inter font family. High-contrast hierarchy for clinical clarity.

### Interaction Design
- **Social-Post Cards:** Records styled like social media posts with "Observations" priority.
- **Fixed Navigation:** Top-sticky dynamic header displaying current view context and active cycle badges.
- **Unified Emergency Alerts:** Full-width rectangular red alert bar for the Add Entry Modal, sticky to the top of the viewport. (Dashboard alert disabled for clarity).
- **Mobile Optimized:** Disabled horizontal swipe-to-navigate gestures (`overscroll-behavior-x: none`) to prevent accidental browser navigation and ensure a robust PWA experience.
- **Smart Learning:** Automatic suggestion engine for medications, foods, and units.

---

## 3. Current Implementation (Status: Production Ready - v1.3.1)

### Core PWA & Storage
- [x] **PWA Infrastructure:** Installable standalone app with Service Worker (`sw.js`) for offline support.
- [x] **Auto-Update:** Non-disruptive Toast Notification update logic.
- [x] **IndexedDB Migration:** High-capacity, asynchronous storage replacing the 5MB localStorage limit.
- [x] **Settings Migration:** Automatic merging of new default settings with existing user data.

### Clinical Management
- [x] **Recent Blood Counts:** Dashboard scorecards for **ANC**, **PLT**, and **WBC** dynamically display the absolute latest values recorded across all entries.
- [x] **Intake & Output Tracking:** Real-time dashboard counters for **Water (mL)**, **Poo Count**, and **Pee Count** for the current day.
- [x] **Clinical Events:** Support for recording discrete events (e.g., Vomiting, Fever, Seizure) with a searchable label and multi-line remarks.
- [x] **Flexible Emergency Thresholds:** User-configurable `<` and `>=` thresholds for Temperature, ANC, Platelets, Hb, WBC, and BP Systolic.
- [x] **Real-time Diagnostic Alerts:** Sticky red UI bars that identify specific problematic metrics during entry creation.
- [x] **Multi-Cycle Management:** Support for defining multiple overlapping treatment cycles with dynamic "Day X" counters in the header.
- [x] **Clinical Photo Support:** Native camera/gallery integration with resizing and compression.

### Data & Insights
- [x] **Clinical Events History:** A dedicated table in the Insights view listing all recorded events by date/time, featuring expandable rows for detailed remarks.
- [x] **Enhanced CSV Export:** Data exports include a dedicated "Events" column concatenating all event labels and remarks for clinical review.
- [x] **Data Visualization:** Integration of multi-cycle trend analysis for ANC, Platelets, Temperature, and Weight.

---

## 4. Quality Assurance & Testing

### Validation Framework
- **E2E Automation:** 12 comprehensive Playwright test cases covering core workflows and emergency logic.
- **Threshold Verification:** Automated testing of custom threshold configuration and alert triggering.
- **Asynchronous Integrity:** Validated against the IndexedDB storage layer.

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
| `temp` | Number | Body temperature. |
| `anc` | Number | ANC count. |
| `platelets` | Number | Platelet count. |
| `wbc` | Number | White Blood Cell count. |
| `hb` | Number | Hemoglobin count. |
| `bp_sys` | Number | Systolic Blood Pressure. |
| `urine_out` | Number | Urine output in mL. |
| `stool_freq` | Number | Stool frequency/amount. |
| `meds_items` | Array of Obj | `{ label, value, unit }`. |
| `food_items` | Array of Obj | `{ label, value, unit }`. |
| `fluid_items`| Array of Obj | `{ label, value, unit }`. |
| `event_items`| Array of Obj | `{ label, remarks }`. |

### `Settings` Object
| Field | Type | Description |
| :--- | :--- | :--- |
| `cycles` | Array of Obj | `{ id, name, startDate, endDate }`. |
| `emergency_thresholds`| Object | `{ [metric]: { min, max } }` for Temperature, ANC, PLT, Hb, WBC, BP Sys. |

---

## 6. Project Roadmap

### Future Phases
- [ ] **Data Visualization:** Integration of more advanced multi-cycle trend analysis.
- [ ] **Medication Reminders:** Local notification support via PWA APIs.
- [ ] **Multi-Patient Support:** Profile switching for families managing multiple treatment paths.