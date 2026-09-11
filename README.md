# VertexIS — The Marsh Bites Enterprise Management & POS System

Centralized enterprise management, BIR-compliant POS, Commissary production management, and franchise logistics platform for **The Marsh Bites** (Naga City, Bicol HQ + nationwide franchise branches).

---

## 🏛️ Project Architecture & Repository Structure

This repository contains two cleanly separated, specialized systems:

```
.
├── src/                         # 🌐 React 18 + TypeScript Web & POS System (Primary Web Platform)
│   ├── components/              # Admin, Branch Manager, and POS components
│   │   ├── admin/               # Commissary, Orders, Dispatch, Inventory, Analytics
│   │   ├── branch/              # Requisitions, Inventory, Sales, Announcements
│   │   └── pos/                 # Philippine BIR-Compliant Cashier POS & Reporting
│   ├── context/                 # State management & persistence (DataContext)
│   ├── data/                    # Master branch, product, and financial initial data
│   ├── services/                # Firebase Firestore and database syncing services
│   ├── types/                   # Unified TypeScript schemas & interfaces
│   └── utils/                   # Security validators, BIR tax calculators, audit logs
│
├── public/                      # Static web assets & icons
├── firestore.rules              # Firebase security rules & RBAC enforcement
├── package.json                 # Web project dependencies & scripts
├── vite.config.ts               # Vite configuration with Tailwind CSS
│
└── flutter_app/                 # 📱 Mobile Companion App (Flutter / Dart)
    ├── lib/                     # Cross-platform Flutter source code
    │   ├── models/              # Dart data models
    │   ├── screens/             # Admin & Branch mobile screens
    │   ├── services/            # Local data and cache services
    │   └── widgets/             # Reusable mobile UI components
    ├── android/                 # Android native project configuration
    ├── ios/                     # iOS native project configuration
    ├── pubspec.yaml             # Flutter dependencies
    └── README.md                # Mobile app setup & build guide
```

---

## 🌐 1. Web Application & POS (React + TypeScript)

### Core Modules
- **Philippine BIR Compliance**: Sequential receipts (`BR001-2026-000001`), 12% VAT calculations, Senior Citizen (20% exemption) / PWD discount audits with required ID tracking.
- **Financial Daily Readings**: Structured **X-Reading** (interim shifts) and **Z-Reading** (non-resettable accumulated grand total daily closing).
- **Commissary Requisitions & Orders**: Branch order review, payment verification, stock allocation, and dispatch logistics.
- **Inventory & Waste Control**: Real-time stock-in, stock-out, branch transfers, and spoilage logs with negative-inventory protection.
- **Tender Types**: Cash, GCash, Maya, Bank Transfer, Debit/Credit Cards, and Split Payments.

### Tech Stack
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (Dark/Light mode support)
- **Icons**: Lucide React
- **Animations**: Motion

### Running the Web Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📱 2. Mobile Companion App (Flutter)

The Flutter mobile application is located in `./flutter_app/`. See [`flutter_app/README.md`](./flutter_app/README.md) for mobile deployment instructions.

```bash
cd flutter_app
flutter pub get
flutter run
```
