# Digital Product Passport (DPP) — E-Waste Lifecycle Traceability System

**Course:** BACSE202 - Database Systems  
**Institution:** Vellore Institute of Technology (VIT), Vellore  
**Team Members:**  
- **Aditya Priyan C** (Reg No: 25BCE0662)  
- **Amaan Abdullah Karuthedath** (Reg No: 25BCE2701)  
**Faculty Guide:** Prof. Saritha Murali  

---

## 🌟 Overview

This project implements a full-stack, normalized relational SQL-based **Digital Product Passport (DPP)** system for consumer electronics lifecycle traceability and e-waste circularity management. 

It implements a full-stack, normalized relational SQL-based **Digital Product Passport (DPP)** system for consumer electronics lifecycle traceability and e-waste circularity management. 

The system tracks physical electronics from **Manufacturing ➔ Retail Purchase & Ownership ➔ Maintenance & Service ➔ Secondary Resale/Transfers ➔ End-of-Life Decommissioning & Recycling (Parts Salvage & Critical Material Recovery)**.

---

## 🚀 Quick Start (Running on Localhost)

The application is already running at:
👉 **[http://localhost:3000](http://localhost:3000)**

To run or restart manually at any time:

```bash
# Navigate to project directory
cd "C:\Users\Aditya Priyan\.gemini\antigravity\scratch\dpp-ewaste-traceability"

# Start the Node.js Express server
npm start
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## 🗄️ Relational Database Architecture & ER Model

The database implements a normalized 3NF Entity-Relationship (ER) model designed for electronics circularity:

1. **`STAKEHOLDER`** (Generalization / ISA Hierarchy)
   - Specialized into `MANUFACTURER`, `OWNER`, `SERVICE_CENTRE`, and `RECYCLING_FACILITY`.
2. **`PRODUCT_MODEL`** (Shared Specifications)
   - Stores brand, model number, category, carbon footprint (kg CO2e), energy ratings, and disassembly manual links. Entered once and reused by thousands of physical units.
3. **`PRODUCT_ITEM`** (Serialized Physical DPP Unit)
   - Stores `Product_ID`, unique hardware serial number, manufacturing date, status (`In Use`, `Under Repair`, `Recycled`), State of Health (`SOH %`), and current owner.
4. **`COMPONENT` & `MATERIAL`** (`Is Made Of` Composition)
   - Tracks modular replaceable parts (Battery, Motherboard, Display, RAM, SSD, Chassis) and their chemical composition (Lithium, Cobalt, Copper, Gold, Silver, Aluminium, Rare Earths), recyclability %, and RoHS/REACH compliance.
5. **`REPAIR`**
   - Logs service events, maintenance dates, diagnostic details, repair costs, technician notes, and replaced components.
6. **`OWNERSHIP_HISTORY`**
   - Audits custody transfers across retail buyers, institutions, and enterprises.
7. **`RECYCLING_EVENT`, `SALVAGE` & `RECOVERY`**
   - End-of-life intake, salvage of reusable Grade A/B/C components, and hydrometallurgical extraction of critical raw materials (with yield quantity in grams and purity percentage).
8. **`LIFECYCLE_EVENT`**
   - Unified chronological timeline logging every verified action.

---

## 🖥️ Website Features

### 1. Product Catalogue
- Browse electronic devices (Laptops, Smartphones, Monitors, Tablets).
- Filter by category, lifecycle status, brand, or search by Product ID / Serial Number.
- High-level overview cards displaying current owner, State of Health (SOH) progress bar, and carbon footprint.

### 2. Digital Product Passport (DPP) Page
Enter any Item ID (e.g., `PROD-LOQ-001`, `PROD-LOQ-002`, `PROD-IPH-001`) or scan its QR code:
- **Identity & Specifications:** Brand, model number, manufacturing date, energy label, and disassembly guide.
- **Scannable QR Code:** Dynamically generated high-resolution QR code encoding the product's passport payload.
- **Custody Information:** Current owner details and full ownership transfer history.
- **Hardware Component Tree:** Monitored serialized sub-assemblies.
- **Bill of Materials (BoM):** Comprehensive chemical breakdown, recyclability %, and hazardous substance warnings.
- **Service History:** Chronological log of repairs and costs.
- **Recycling Certificate (for end-of-life devices):** Facility permit, salvaged reusable parts (Grade A/B/C), and recovered raw materials (Lithium, Gold, Copper, Cobalt, Aluminium).
- **Print / Export Button:** Clean certificate formatting for PDF printing.

### 3. Lifecycle Timeline Trace
- Step-by-step interactive vertical timeline illustrating cradle-to-grave traceability.
- Distinct color-coded nodes for Manufacturing, Purchase, Repairs, Transfers, and E-Waste Recycling.

### 4. Stakeholder Operations Hub
Automates all data entry via backend SQL forms (no manual database editing needed):
- **Manufacturer:** Register new Product Models & Issue new serialized Product Items.
- **Service Centre:** Record maintenance/repairs, replacement parts, cost, and restore health grade.
- **Owner:** Transfer product ownership to another entity.
- **Recycling Facility:** Record e-waste intake, log salvaged parts, and log recovered raw materials.

### 5. Circularity & E-Waste Analytics
- Real-time KPI aggregate cards (Tracked devices, Active, Under repair, Recycled, Salvaged parts, Extracted material weight).
- Interactive Chart.js visualizations:
  - Critical Raw Material Extraction Yield (bar chart).
  - Lifecycle Phase Distribution (doughnut chart).
  - Material Recovery & Purity Audit table.

### 6. Interactive SQL Query Studio (Academic Demo Feature)
Built specifically for coursework BACSE202 evaluation:
- Run custom SQL queries directly against the live database with real-time tabular output.
- **Preset Academic Queries:**
  1. Complete DPP Multi-Table Relational JOIN
  2. Bill of Materials & Hazardous Substance Audit
  3. Repair Cost Breakdown per Model
  4. Raw Material Recovery Yield by Facility
  5. Product Circularity & Health Ranking
- **Export Database Button:** Downloads a standalone `.sql` dump containing schema and seed data compatible with MySQL Workbench, PostgreSQL, and SQLite.

---

## 🧪 Preloaded Test Units

| Product ID | Device | Lifecycle Status | Owner / Location | Key Highlight |
|---|---|---|---|---|
| **`PROD-LOQ-001`** | Lenovo LOQ 15 Gaming Laptop | **In Use** (SOH 94%) | Aditya Priyan C | 1 Repair (RAM Upgrade), active components |
| **`PROD-LOQ-002`** | Lenovo LOQ 15 Gaming Laptop | **Recycled** (SOH 0%) | EcoRecycle Solutions Hub | Salvaged RAM & SSD, Extracted Gold, Copper, Lithium |
| **`PROD-LOQ-003`** | Lenovo LOQ 15 Gaming Laptop | **Under Repair** (SOH 78%) | TechCare Hub Bangalore | Battery replacement in progress |
| **`PROD-IPH-001`** | Apple iPhone 15 Pro | **In Use** (SOH 98%) | Amaan Abdullah Karuthedath | Recycled cobalt battery & gold logic board |
| **`PROD-IPH-002`** | Apple iPhone 15 Pro | **In Use** (SOH 89%) | Dr. Neha Sharma | Transferred from enterprise, display repair |
| **`PROD-DEL-001`** | Dell XPS 13 Plus | **In Use** (SOH 91%) | VIT SCOPE Lab | Institutional deployment |
| **`PROD-DEL-002`** | Dell XPS 13 Plus | **Recycled** (SOH 0%) | GreenCircuits Pune | Aluminium & Copper recovery |
| **`PROD-SAM-001`** | Samsung Galaxy S24 Ultra | **Recycled** (SOH 0%) | EcoRecycle Solutions Hub | Salvaged Dynamic AMOLED display |
| **`PROD-ASU-001`** | ASUS ROG Swift 27" Monitor | **In Use** (SOH 96%) | VIT SCOPE Lab | High-efficiency OLED display |

---

## 📁 Project Structure

```
dpp-ewaste-traceability/
├── db.js                   # Database layer using native node:sqlite with foreign keys & transactions
├── server.js               # Express API backend with REST endpoints & QR generation
├── schema.sql              # Normalized 3NF DDL schema defining all tables and constraints
├── seed.sql                # Comprehensive realistic dataset of models, units, stakeholders, materials
├── dpp_database.sqlite     # Live SQLite database file
├── package.json            # Node project configuration
├── README.md               # Complete project documentation
└── public/                 # Modern responsive frontend
    ├── index.html          # Web interface layout & modals
    ├── styles.css          # Custom styling & timeline layouts
    └── app.js              # State management, API bindings, Charts, SQL console runner
```
