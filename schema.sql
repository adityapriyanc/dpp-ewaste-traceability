-- ============================================================================
-- DIGITAL PRODUCT PASSPORT (DPP) - E-WASTE LIFECYCLE TRACEABILITY SYSTEM
-- Course: BACSE202 - Database Systems | Vellore Institute of Technology (VIT)
-- Team: Aditya Priyan C (25BCE0662), Amaan Abdullah Karuthedath (25BCE2701)
-- Faculty Guide: Prof. Saritha Murali
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. BASE STAKEHOLDER TABLE (Generalization entity)
CREATE TABLE IF NOT EXISTS STAKEHOLDER (
    Stakeholder_ID VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(150) NOT NULL,
    Phone VARCHAR(50),
    Email VARCHAR(100),
    Address VARCHAR(255),
    Stakeholder_Type VARCHAR(50) NOT NULL CHECK (Stakeholder_Type IN ('MANUFACTURER', 'OWNER', 'SERVICE_CENTRE', 'RECYCLING_FACILITY'))
);

-- 2. SPECIALIZATION: MANUFACTURER
CREATE TABLE IF NOT EXISTS MANUFACTURER (
    Stakeholder_ID VARCHAR(50) PRIMARY KEY,
    Registration_Number VARCHAR(100) NOT NULL,
    Country_of_Origin VARCHAR(100) NOT NULL,
    FOREIGN KEY (Stakeholder_ID) REFERENCES STAKEHOLDER(Stakeholder_ID) ON DELETE CASCADE
);

-- 3. SPECIALIZATION: OWNER
CREATE TABLE IF NOT EXISTS OWNER (
    Stakeholder_ID VARCHAR(50) PRIMARY KEY,
    Owner_Type VARCHAR(50) NOT NULL CHECK (Owner_Type IN ('Individual', 'Enterprise', 'Institution', 'Government')),
    FOREIGN KEY (Stakeholder_ID) REFERENCES STAKEHOLDER(Stakeholder_ID) ON DELETE CASCADE
);

-- 4. SPECIALIZATION: SERVICE CENTRE
CREATE TABLE IF NOT EXISTS SERVICE_CENTRE (
    Stakeholder_ID VARCHAR(50) PRIMARY KEY,
    License_Number VARCHAR(100) NOT NULL,
    FOREIGN KEY (Stakeholder_ID) REFERENCES STAKEHOLDER(Stakeholder_ID) ON DELETE CASCADE
);

-- 5. SPECIALIZATION: RECYCLING FACILITY
CREATE TABLE IF NOT EXISTS RECYCLING_FACILITY (
    Stakeholder_ID VARCHAR(50) PRIMARY KEY,
    Processing_Capacity VARCHAR(100) NOT NULL,
    Environmental_Permit_ID VARCHAR(100) NOT NULL,
    FOREIGN KEY (Stakeholder_ID) REFERENCES STAKEHOLDER(Stakeholder_ID) ON DELETE CASCADE
);

-- 6. PRODUCT MODEL (Shared specifications across physical units)
CREATE TABLE IF NOT EXISTS PRODUCT_MODEL (
    Model_ID VARCHAR(50) PRIMARY KEY,
    Manufacturer_ID VARCHAR(50) NOT NULL,
    Model_Number VARCHAR(100) NOT NULL,
    Name VARCHAR(150) NOT NULL,
    Product_Type VARCHAR(50) NOT NULL CHECK (Product_Type IN ('Laptop', 'Smartphone', 'Monitor', 'Tablet', 'Audio/Wearable', 'Peripherals')),
    Energy_Rating VARCHAR(50) DEFAULT 'Energy Star 8.0',
    Carbon_Footprint REAL NOT NULL, -- in kg CO2 equivalent
    Disassembly_Manual_URL VARCHAR(255),
    FOREIGN KEY (Manufacturer_ID) REFERENCES MANUFACTURER(Stakeholder_ID) ON DELETE RESTRICT
);

-- 7. PRODUCT ITEM (Actual individual physical device tracked via DPP)
CREATE TABLE IF NOT EXISTS PRODUCT_ITEM (
    Product_ID VARCHAR(50) PRIMARY KEY,
    Model_ID VARCHAR(50) NOT NULL,
    Serial_Number VARCHAR(100) UNIQUE NOT NULL,
    Manufacturing_Date DATE NOT NULL,
    Status VARCHAR(50) NOT NULL CHECK (Status IN ('Manufactured', 'In Use', 'Under Repair', 'Refurbished', 'Recycled', 'Decommissioned')),
    State_of_Health INTEGER NOT NULL DEFAULT 100 CHECK (State_of_Health >= 0 AND State_of_Health <= 100),
    Current_Owner_ID VARCHAR(50),
    FOREIGN KEY (Model_ID) REFERENCES PRODUCT_MODEL(Model_ID) ON DELETE RESTRICT,
    FOREIGN KEY (Current_Owner_ID) REFERENCES OWNER(Stakeholder_ID) ON DELETE SET NULL
);

-- 8. COMPONENT (Individual replaceable hardware parts inside a product item)
CREATE TABLE IF NOT EXISTS COMPONENT (
    Component_ID VARCHAR(50) PRIMARY KEY,
    Product_ID VARCHAR(50) NOT NULL,
    Serial_Number VARCHAR(100) NOT NULL,
    Component_Type VARCHAR(100) NOT NULL,
    Status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active', 'Replaced', 'Salvaged', 'Recycled')),
    FOREIGN KEY (Product_ID) REFERENCES PRODUCT_ITEM(Product_ID) ON DELETE CASCADE
);

-- 9. MATERIAL (Raw materials composition and hazardous indicators)
CREATE TABLE IF NOT EXISTS MATERIAL (
    Material_ID VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Recyclability REAL NOT NULL CHECK (Recyclability >= 0 AND Recyclability <= 100),
    Hazardous INTEGER NOT NULL CHECK (Hazardous IN (0, 1)),
    RoHS_REACH_Compliant INTEGER NOT NULL CHECK (RoHS_REACH_Compliant IN (0, 1))
);

-- 10. COMPONENT_MATERIAL (Relationship: Is Made Of)
CREATE TABLE IF NOT EXISTS COMPONENT_MATERIAL (
    Component_ID VARCHAR(50) NOT NULL,
    Material_ID VARCHAR(50) NOT NULL,
    Quantity REAL NOT NULL,
    Unit VARCHAR(20) NOT NULL,
    PRIMARY KEY (Component_ID, Material_ID),
    FOREIGN KEY (Component_ID) REFERENCES COMPONENT(Component_ID) ON DELETE CASCADE,
    FOREIGN KEY (Material_ID) REFERENCES MATERIAL(Material_ID) ON DELETE RESTRICT
);

-- 11. REPAIR (Maintenance & servicing records)
CREATE TABLE IF NOT EXISTS REPAIR (
    Repair_ID VARCHAR(50) PRIMARY KEY,
    Product_ID VARCHAR(50) NOT NULL,
    Service_Centre_ID VARCHAR(50) NOT NULL,
    Repair_Date DATE NOT NULL,
    Description TEXT NOT NULL,
    Repair_Cost REAL NOT NULL CHECK (Repair_Cost >= 0),
    Replace_Parts TEXT,
    FOREIGN KEY (Product_ID) REFERENCES PRODUCT_ITEM(Product_ID) ON DELETE CASCADE,
    FOREIGN KEY (Service_Centre_ID) REFERENCES SERVICE_CENTRE(Stakeholder_ID) ON DELETE RESTRICT
);

-- 12. OWNERSHIP HISTORY (Transfers during the product use phase)
CREATE TABLE IF NOT EXISTS OWNERSHIP_HISTORY (
    Transfer_ID VARCHAR(50) PRIMARY KEY,
    Product_ID VARCHAR(50) NOT NULL,
    Previous_Owner_ID VARCHAR(50),
    New_Owner_ID VARCHAR(50) NOT NULL,
    Transfer_Date DATE NOT NULL,
    Transfer_Reason VARCHAR(150),
    FOREIGN KEY (Product_ID) REFERENCES PRODUCT_ITEM(Product_ID) ON DELETE CASCADE,
    FOREIGN KEY (Previous_Owner_ID) REFERENCES OWNER(Stakeholder_ID) ON DELETE SET NULL,
    FOREIGN KEY (New_Owner_ID) REFERENCES OWNER(Stakeholder_ID) ON DELETE RESTRICT
);

-- 13. RECYCLING EVENT (End of life intake and processing)
CREATE TABLE IF NOT EXISTS RECYCLING_EVENT (
    Recycling_Event_ID VARCHAR(50) PRIMARY KEY,
    Product_ID VARCHAR(50) NOT NULL,
    Recycling_Facility_ID VARCHAR(50) NOT NULL,
    Intake_Date DATE NOT NULL,
    Decommission_Status VARCHAR(100) NOT NULL CHECK (Decommission_Status IN ('Intake Recorded', 'Dismantling In Progress', 'Fully Dismantled & Processed')),
    Notes TEXT,
    FOREIGN KEY (Product_ID) REFERENCES PRODUCT_ITEM(Product_ID) ON DELETE CASCADE,
    FOREIGN KEY (Recycling_Facility_ID) REFERENCES RECYCLING_FACILITY(Stakeholder_ID) ON DELETE RESTRICT
);

-- 14. SALVAGE (Reusable parts salvaged from recycling event)
CREATE TABLE IF NOT EXISTS SALVAGE (
    Salvage_ID VARCHAR(50) PRIMARY KEY,
    Recycling_Event_ID VARCHAR(50) NOT NULL,
    Component_ID VARCHAR(50) NOT NULL,
    Salvage_Date DATE NOT NULL,
    Condition_Grade VARCHAR(50) NOT NULL CHECK (Condition_Grade IN ('Grade A (Excellent)', 'Grade B (Good)', 'Grade C (Refurbishable)')),
    FOREIGN KEY (Recycling_Event_ID) REFERENCES RECYCLING_EVENT(Recycling_Event_ID) ON DELETE CASCADE,
    FOREIGN KEY (Component_ID) REFERENCES COMPONENT(Component_ID) ON DELETE CASCADE
);

-- 15. RECOVERY (Critical and precious materials recovered from e-waste)
CREATE TABLE IF NOT EXISTS RECOVERY (
    Recovery_ID VARCHAR(50) PRIMARY KEY,
    Recycling_Event_ID VARCHAR(50) NOT NULL,
    Material_ID VARCHAR(50) NOT NULL,
    Recovery_Date DATE NOT NULL,
    Quantity REAL NOT NULL,
    Unit VARCHAR(20) NOT NULL,
    Purity REAL NOT NULL CHECK (Purity >= 0 AND Purity <= 100),
    FOREIGN KEY (Recycling_Event_ID) REFERENCES RECYCLING_EVENT(Recycling_Event_ID) ON DELETE CASCADE,
    FOREIGN KEY (Material_ID) REFERENCES MATERIAL(Material_ID) ON DELETE RESTRICT
);

-- 16. LIFECYCLE EVENT TIMELINE (Unified auditable log for instant traceability)
CREATE TABLE IF NOT EXISTS LIFECYCLE_EVENT (
    Event_ID VARCHAR(50) PRIMARY KEY,
    Product_ID VARCHAR(50) NOT NULL,
    Stage VARCHAR(50) NOT NULL CHECK (Stage IN ('Manufacturing', 'Purchase/Ownership', 'Repair & Maintenance', 'Reuse & Transfer', 'End-of-Life Recycling')),
    Event_Type VARCHAR(50) NOT NULL,
    Event_Date DATE NOT NULL,
    Stakeholder_ID VARCHAR(50),
    Title VARCHAR(150) NOT NULL,
    Description TEXT NOT NULL,
    FOREIGN KEY (Product_ID) REFERENCES PRODUCT_ITEM(Product_ID) ON DELETE CASCADE,
    FOREIGN KEY (Stakeholder_ID) REFERENCES STAKEHOLDER(Stakeholder_ID) ON DELETE SET NULL
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_product_item_model ON PRODUCT_ITEM(Model_ID);
CREATE INDEX IF NOT EXISTS idx_product_item_owner ON PRODUCT_ITEM(Current_Owner_ID);
CREATE INDEX IF NOT EXISTS idx_component_product ON COMPONENT(Product_ID);
CREATE INDEX IF NOT EXISTS idx_repair_product ON REPAIR(Product_ID);
CREATE INDEX IF NOT EXISTS idx_recycling_product ON RECYCLING_EVENT(Product_ID);
CREATE INDEX IF NOT EXISTS idx_lifecycle_product ON LIFECYCLE_EVENT(Product_ID);
