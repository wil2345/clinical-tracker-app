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
- **Unified Emergency Alerts:** Full-width rectangular red alert bar for the Add Entry Modal, sticky to the top of the viewport.
- **Mobile Optimized:** Disabled horizontal swipe-to-navigate gestures (`overscroll-behavior-x: none`).
- **Smart Learning:** Automatic suggestion engine for medications, foods, and units.
- **UX Efficiency:** Automatic population of the first row when opening Food, Fluid, Meds, or Event sections in the entry modal.

---

## 3. Current Implementation (Status: Production Ready - v1.4.1)

### Core PWA & Storage
- [x] **PWA Infrastructure:** Installable standalone app with Service Worker (`sw.js`) for offline support.
- [x] **Auto-Update:** Non-disruptive Toast Notification update logic (v1.4.1 cache).
- [x] **IndexedDB Migration:** High-capacity, asynchronous storage.
- [x] **Data Management:** Export to CSV/JSON and full JSON data import for backups.

### Clinical Management
- [x] **Comprehensive Vitals:** Tracking for Temperature, Weight, **Height (cm)**, Pulse, BP, and SpO2.
- [x] **Blood Work:** Dynamic scorecards and history for ANC, PLT, WBC, and Hb.
- [x] **Intake & Output:** Real-time counters and historical logs for Water (mL), Stool, Pee, and Vomit.
- [x] **Clinical Events:** chronological history of discrete medical events with detailed remarks.
- [x] **Emergency Thresholds:** User-configurable alerts for Temp, ANC, Platelets, Hb, WBC, and BP Systolic.
- [x] **Smart Cycle Management:** Duration-based end date calculation with Day X counters and overlapping cycle support.
- [x] **Clinical Photo Support:** Up to 5 compressed JPEG strings per entry.

### Advanced Insights (v1.4.1)
- [x] **Interactive Time Ranges:** "Stock Chart" style selectors (7D, 14D, 1M, 6M, YTD, MAX) with a 1M default.
- [x] **Treatment Overview:** High-level metrics for "Days Elapsed" (earliest start) and "Days Remaining" (latest end).
- [x] **Blood Profile Progression:** Unified line chart for ANC, PLT, WBC, and HB with dual Y-axes.
- [x] **Blood Pressure Range:** Combined floating bars (range) and trend lines (SYS/DIA).
- [x] **Growth Progression:** Dual-axis chart for Weight (kg) and Height (cm).
- [x] **Daily Logs:** Specialized bar charts for Poo/Pee counts and Fluid intake (ml).
- [x] **Full Event History:** Unfiltered chronological list of all clinical events.

---

## 4. Quality Assurance & Testing

### Validation Framework
- **E2E Automation:** 12 comprehensive Playwright test cases covering core workflows.
- **Threshold Verification:** Automated testing of custom threshold configuration.
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
| `temp` | Number | Body temperature (°C). |
| `weight` | Number | Body weight (kg). |
| `height` | Number | Body height (cm). |
| `hr` | Number | Pulse (bpm). |
| `anc` | Number | ANC count. |
| `platelets` | Number | Platelet count. |
| `wbc` | Number | White Blood Cell count. |
| `hb` | Number | Hemoglobin count. |
| `bp_sys` | Number | Systolic Blood Pressure. |
| `bp_dia` | Number | Diastolic Blood Pressure. |
| `spo2` | Number | Oxygen Saturation (%). |
| `urine_out` | Number | Urine output in mL. |
| `stool_freq` | Number | Stool amount/frequency. |
| `meds_items` | Array of Obj | `{ label, value, unit }`. |
| `food_items` | Array of Obj | `{ label, value, unit }`. |
| `fluid_items`| Array of Obj | `{ label, value, unit }`. |
| `event_items`| Array of Obj | `{ label, remarks }`. |

---

## 6. Project Roadmap

### Future Phases
- [ ] **Advanced Data Export:** PDF report generation for clinical consultations.
- [ ] **Medication Reminders:** Local notification support via PWA APIs.
- [ ] **Multi-Patient Support:** Profile switching for families.
