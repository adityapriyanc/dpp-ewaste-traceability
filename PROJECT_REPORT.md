# DIGITAL PRODUCT PASSPORT-BASED E-WASTE LIFECYCLE TRACEABILITY SYSTEM

**Course:** BACSE202 — Database Systems  
**Institution:** Vellore Institute of Technology (VIT), Vellore  
**Faculty Guide:** Prof. Saritha Murali  
**Project Team:**  
* **Aditya Priyan C** (Registration No: 25BCE0662)  
* **Amaan Abdullah Karuthedath** (Registration No: 25BCE2701)  
**Date:** October 2026  

---

## 1. Introduction & Aim

1. **Aim 1:** To develop an SQL-based Digital Product Passport (DPP) that tracks consumer electronic products throughout their entire lifecycle, from manufacturing to end-of-life recycling and disposal.
2. **Aim 2:** To organize critical product metadata such as product identity, modular components, raw materials used, ownership history, maintenance & repairs, reuse, and recycling details.
3. **Aim 3:** To demonstrate how a normalized relational database can easily store, retrieve, and analyze product lifecycle data.

---

## 2. Abstract

E-waste management is severely impaired because electronic product data is fragmented across manufacturers, consumers, service centres, and informal recyclers. Critical parameters like hazardous material presence, modular parts, and previous repairs are lost at the disposal stage. 

This project implements a normalized relational SQL database operating as a **Digital Product Passport (DPP)**. The database captures events across five primary lifecycle phases:
1. **Manufacturing & Factory Provisioning:** Linking serialized units to shared model specifications and modular bill of materials (BoM).
2. **Purchase & Ownership:** Tracking customer commissioning and custody transfers.
3. **Maintenance & Repairs:** Auditing service history, replaced parts, and diagnostic costs.
4. **Reuse & Redistribution:** Secondary sales and certified refurbished deployment.
5. **End-of-Life Recycling:** Controlled intake, salvaging of Grade A/B/C components, and hydrometallurgical recovery of critical raw materials (Lithium, Cobalt, Copper, Gold, Aluminium).

---

## 3. Sustainable Development Goals (SDGs)
* **SDG 9 (Industry, Innovation & Infrastructure):** Digitizing electronics manufacturing supply chains.
* **SDG 11 (Sustainable Cities & Communities):** Diverting municipal electronic waste away from toxic landfills.
* **SDG 12 (Responsible Consumption & Production):** Ensuring closed-loop raw material recovery and product longevity.
* **SDG 13 (Climate Action):** Monitoring embedded carbon footprints and reducing primary resource extraction.

---

## 4. Relational Database Design & Entity-Relationship Architecture

### 4.1 Entities and Attributes

| Entity | Primary Key | Key Attributes | Relational Role |
|---|---|---|---|
| **STAKEHOLDER** | `Stakeholder_ID` | `Name`, `Phone`, `Email`, `Address`, `Stakeholder_Type` | Supertype entity (ISA hierarchy) |
| **MANUFACTURER** | `Stakeholder_ID` | `Registration_Number`, `Country_of_Origin` | Subtype entity (Produces product models) |
| **OWNER** | `Stakeholder_ID` | `Owner_Type` (Individual / Enterprise / Institution) | Subtype entity (Possesses physical units) |
| **SERVICE_CENTRE** | `Stakeholder_ID` | `License_Number` | Subtype entity (Performs repairs) |
| **RECYCLING_FACILITY** | `Stakeholder_ID` | `Processing_Capacity`, `Environmental_Permit_ID` | Subtype entity (Processes e-waste) |
| **PRODUCT_MODEL** | `Model_ID` | `Manufacturer_ID`, `Model_Number`, `Name`, `Product_Type`, `Energy_Rating`, `Carbon_Footprint` | Shared specifications template |
| **PRODUCT_ITEM** | `Product_ID` | `Model_ID`, `Serial_Number`, `Manufacturing_Date`, `Status`, `State_of_Health`, `Current_Owner_ID` | Central physical passport instance |
| **COMPONENT** | `Component_ID` | `Product_ID`, `Serial_Number`, `Component_Type`, `Status` | Monitored hardware sub-assemblies |
| **MATERIAL** | `Material_ID` | `Name`, `Recyclability`, `Hazardous`, `RoHS_REACH_Compliant` | Master material catalog |
| **COMPONENT_MATERIAL** | (`Component_ID`, `Material_ID`) | `Quantity`, `Unit` | Associative composition entity (*Is Made Of*) |
| **REPAIR** | `Repair_ID` | `Product_ID`, `Service_Centre_ID`, `Repair_Date`, `Description`, `Repair_Cost`, `Replace_Parts` | Servicing and maintenance records |
| **OWNERSHIP_HISTORY** | `Transfer_ID` | `Product_ID`, `Previous_Owner_ID`, `New_Owner_ID`, `Transfer_Date`, `Transfer_Reason` | Audit trail of custody transfers |
| **RECYCLING_EVENT** | `Recycling_Event_ID` | `Product_ID`, `Recycling_Facility_ID`, `Intake_Date`, `Decommission_Status`, `Notes` | End-of-life intake record |
| **SALVAGE** | `Salvage_ID` | `Recycling_Event_ID`, `Component_ID`, `Salvage_Date`, `Condition_Grade` | Reusable diverted components |
| **RECOVERY** | `Recovery_ID` | `Recycling_Event_ID`, `Material_ID`, `Recovery_Date`, `Quantity`, `Unit`, `Purity` | Reclaimed elemental raw materials |
| **LIFECYCLE_EVENT** | `Event_ID` | `Product_ID`, `Stage`, `Event_Type`, `Event_Date`, `Stakeholder_ID`, `Title`, `Description` | Unified chronological audit log |

### 4.2 Normalization Analysis (3NF Compliance)
1. **First Normal Form (1NF):** All attributes contain atomic values. Multi-valued components and materials are separated into discrete normalized relations (`COMPONENT`, `COMPONENT_MATERIAL`).
2. **Second Normal Form (2NF):** No partial dependencies. In composite keys like `COMPONENT_MATERIAL(Component_ID, Material_ID)`, attributes `Quantity` and `Unit` depend fully on both composite key columns.
3. **Third Normal Form (3NF):** No transitive functional dependencies exist. Model-level attributes (`Carbon_Footprint`, `Energy_Rating`) reside exclusively in `PRODUCT_MODEL`, preventing duplication across individual physical units in `PRODUCT_ITEM`.

---

## 5. Key SQL Queries & Academic Results

### Query 1: Complete Digital Product Passport Multi-Table Relational JOIN
```sql
SELECT 
    p.Product_ID,
    p.Serial_Number,
    p.Status AS Lifecycle_Status,
    p.State_of_Health AS SOH_Percentage,
    m.Name AS Model_Name,
    m.Product_Type,
    mfg_s.Name AS Manufacturer_Company,
    mfg.Country_of_Origin,
    IFNULL(own_s.Name, 'None (At Facility)') AS Current_Owner
FROM PRODUCT_ITEM p
JOIN PRODUCT_MODEL m ON p.Model_ID = m.Model_ID
JOIN MANUFACTURER mfg ON m.Manufacturer_ID = mfg.Stakeholder_ID
JOIN STAKEHOLDER mfg_s ON mfg.Stakeholder_ID = mfg_s.Stakeholder_ID
LEFT JOIN OWNER own ON p.Current_Owner_ID = own.Stakeholder_ID
LEFT JOIN STAKEHOLDER own_s ON own.Stakeholder_ID = own_s.Stakeholder_ID
ORDER BY p.Product_ID;
```
*Result:* Returns unified product identity, current legal owner, origin, and health percentage across all physical products.

### Query 2: Bill of Materials & Hazardous Substances Compliance Audit
```sql
SELECT 
    p.Product_ID,
    c.Component_Type,
    m.Name AS Material_Name,
    cm.Quantity,
    cm.Unit,
    m.Recyclability,
    CASE WHEN m.Hazardous = 1 THEN '⚠️ HAZARDOUS' ELSE 'SAFE' END AS Hazard_Status
FROM PRODUCT_ITEM p
JOIN COMPONENT c ON p.Product_ID = c.Product_ID
JOIN COMPONENT_MATERIAL cm ON c.Component_ID = cm.Component_ID
JOIN MATERIAL m ON cm.Material_ID = m.Material_ID
WHERE p.Product_ID = 'PROD-LOQ-001'
ORDER BY m.Hazardous DESC, cm.Quantity DESC;
```
*Result:* Identifies hazardous components (e.g., Lithium and Cobalt in battery packs) requiring specialized recycling procedures.

---

## 6. System Architecture & Implementation

* **Database Engine:** Relational SQL Engine with foreign key enforcement and transactional integrity.
* **Backend:** Node.js + Express REST API with automated QR code generator and interactive SQL console.
* **Frontend:** Modern Single Page Application (SPA) with responsive Tailwind styling, Chart.js analytics, and mobile camera QR scanner.
* **Localhost URL:** `http://localhost:3000`
