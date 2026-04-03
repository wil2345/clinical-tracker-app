# Clinical Tracker Pro

A premium, PWA-enabled, offline-first clinical tracking application designed for B-ALL (B-cell Acute Lymphoblastic Leukemia) management. Built with modern ES6+ JavaScript, HTML5, and Tailwind CSS.

![Version](https://img.shields.io/badge/version-1.0.1-indigo)
![License](https://img.shields.io/badge/license-MIT-slate)
![PWA](https://img.shields.io/badge/PWA-Ready-success)

## ✨ Features

- **PWA Infrastructure**: Installable standalone app with offline support via Service Workers.
- **High-Capacity Storage**: Uses IndexedDB for reliable, asynchronous storage of large data sets, including clinical photos.
- **Multi-Cycle Management**: Define and track multiple overlapping treatment cycles (e.g., Induction, Pulse).
- **Latest Blood Count Markers**: Real-time dashboard showing the latest ANC, Platelets, and WBC counts.
- **Clinical Photo Support**: Integrated camera/gallery access with smart compression for tracking skin or mouth checks.
- **Dynamic Insights**: Interactive charts for monitoring clinical trends over time.
- **Data Portability**: Export your data to CSV for clinical reviews or JSON for full backups.
- **Emergency Logic**: Instant visual alerts for critical thresholds (Temperature >= 38.0°C or ANC < 0.5).

## 🛠️ Tech Stack

- **Frontend**: Pure ES6+ JavaScript, HTML5, Vanilla CSS.
- **Styling**: Tailwind CSS.
- **Charts**: Chart.js.
- **Storage**: IndexedDB (Browser-based).
- **Testing**: Playwright E2E Framework.

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Safari, Edge).
- (Optional) A local server for development (e.g., `python -m http.server`).

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/clinical-tracker.git
   ```
2. Open `index.html` in your browser or serve it via a local server.
3. To install as a PWA, click the "Install" icon in your browser's address bar (Chrome/Edge) or "Add to Home Screen" (Safari).

## 🧪 Testing

The project includes a comprehensive E2E test suite using Playwright.

```bash
npm install
npx playwright test
```

## 🔒 Privacy & Security

- **Offline-First**: All data is stored locally on your device in IndexedDB.
- **No Cloud Sync**: Your clinical data never leaves your device unless you manually export it.
- **Open Source**: Transparent codebase for clinical trust.

## 📄 License

This project is licensed under the MIT License.
