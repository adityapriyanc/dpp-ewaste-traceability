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
-- ============================================================================
-- DIGITAL PRODUCT PASSPORT (DPP) - SEED DATA
-- Course: BACSE202 - Database Systems | Vellore Institute of Technology (VIT)
-- Team: Aditya Priyan C (25BCE0662), Amaan Abdullah Karuthedath (25BCE2701)
-- ============================================================================

-- 1. BASE STAKEHOLDERS
INSERT OR IGNORE INTO STAKEHOLDER (Stakeholder_ID, Name, Phone, Email, Address, Stakeholder_Type) VALUES
-- Manufacturers
('MFG-001', 'Lenovo Group Ltd.', '+91-80-6789-0100', 'compliance@lenovo.com', 'Tech Park, Whitefield, Bangalore, India', 'MANUFACTURER'),
('MFG-002', 'Apple Inc.', '+1-408-996-1010', 'environment@apple.com', 'One Apple Park Way, Cupertino, CA, USA', 'MANUFACTURER'),
('MFG-003', 'Dell Technologies', '+1-800-456-3355', 'sustainability@dell.com', 'One Dell Way, Round Rock, TX, USA', 'MANUFACTURER'),
('MFG-004', 'Samsung Electronics', '+82-2-2255-0114', 'green.product@samsung.com', 'Suwon-si, Gyeonggi-do, South Korea', 'MANUFACTURER'),
('MFG-005', 'ASUSTeK Computer Inc.', '+886-2-2894-3447', 'circularity@asus.com', 'Beitou District, Taipei, Taiwan', 'MANUFACTURER'),

-- Service Centres
('SC-001', 'TechCare Authorized Service Hub', '+91-80-2345-6789', 'support@techcarehub.in', 'Indiranagar 100ft Road, Bangalore, India', 'SERVICE_CENTRE'),
('SC-002', 'QuickFix Certified Device Lab', '+91-44-2456-7890', 'repairs@quickfixlab.com', 'Anna Nagar, Chennai, Tamil Nadu, India', 'SERVICE_CENTRE'),
('SC-003', 'Apex Micro-Electronics Care', '+91-22-2678-9012', 'service@apexcare.in', 'Andheri East, Mumbai, Maharashtra, India', 'SERVICE_CENTRE'),

-- Recycling Facilities
('RF-001', 'EcoRecycle Solutions Hub', '+91-40-6677-8899', 'intake@ecorecycle.org', 'E-Waste Recovery Zone, Hyderabad, Telangana', 'RECYCLING_FACILITY'),
('RF-002', 'GreenCircuits E-Waste Processors', '+91-20-4455-6677', 'operations@greencircuits.in', 'MIDC Industrial Area, Pune, Maharashtra', 'RECYCLING_FACILITY'),

-- Owners
('OWN-001', 'Aditya Priyan C', '+91-98765-43210', 'aditya.priyan2025@vitstudent.ac.in', 'VIT Campus Hostel Block D, Vellore, Tamil Nadu', 'OWNER'),
('OWN-002', 'Amaan Abdullah Karuthedath', '+91-98765-43211', 'amaan.abdullah2025@vitstudent.ac.in', 'VIT Campus Hostel Block B, Vellore, Tamil Nadu', 'OWNER'),
('OWN-003', 'VIT School of Computing Science (SCOPE)', '+91-416-224-3091', 'scope.labs@vit.ac.in', 'Technology Tower, VIT, Vellore, Tamil Nadu', 'OWNER'),
('OWN-004', 'Dr. Neha Sharma', '+91-91234-56789', 'neha.sharma@research-vit.ac.in', 'Staff Quarters, VIT, Vellore, Tamil Nadu', 'OWNER'),
('OWN-005', 'EcoGreen Enterprises Ltd.', '+91-11-2345-6700', 'procurement@ecogreen.com', 'Connaught Place, New Delhi, India', 'OWNER');

-- 2. SPECIALIZATION: MANUFACTURER DETAILS
INSERT OR IGNORE INTO MANUFACTURER (Stakeholder_ID, Registration_Number, Country_of_Origin) VALUES
('MFG-001', 'ROC-BLR-2005-09823', 'India / China'),
('MFG-002', 'US-DEL-C0806592', 'United States'),
('MFG-003', 'US-TX-00114529', 'United States'),
('MFG-004', 'KR-SMR-110111-0004', 'South Korea'),
('MFG-005', 'TW-TPE-23547890', 'Taiwan');

-- 3. SPECIALIZATION: OWNER DETAILS
INSERT OR IGNORE INTO OWNER (Stakeholder_ID, Owner_Type) VALUES
('OWN-001', 'Individual'),
('OWN-002', 'Individual'),
('OWN-003', 'Institution'),
('OWN-004', 'Individual'),
('OWN-005', 'Enterprise');

-- 4. SPECIALIZATION: SERVICE CENTRE DETAILS
INSERT OR IGNORE INTO SERVICE_CENTRE (Stakeholder_ID, License_Number) VALUES
('SC-001', 'LIC-REP-BLR-2022-771'),
('SC-002', 'LIC-REP-CHN-2021-439'),
('SC-003', 'LIC-REP-MUM-2023-108');

-- 5. SPECIALIZATION: RECYCLING FACILITY DETAILS
INSERT OR IGNORE INTO RECYCLING_FACILITY (Stakeholder_ID, Processing_Capacity, Environmental_Permit_ID) VALUES
('RF-001', '500 Metric Tons/Year', 'CPCB/E-WASTE/HYD/2021/044'),
('RF-002', '350 Metric Tons/Year', 'MPCB/EW-PUNE/2020/091');

-- 6. PRODUCT MODELS
INSERT OR IGNORE INTO PRODUCT_MODEL (Model_ID, Manufacturer_ID, Model_Number, Name, Product_Type, Energy_Rating, Carbon_Footprint, Disassembly_Manual_URL) VALUES
('MOD-LEN-LOQ15', 'MFG-001', 'LOQ 15IRH8', 'Lenovo LOQ 15 Gaming Laptop', 'Laptop', 'Energy Star 8.0', 285.5, 'https://download.lenovo.com/consumer/mobiles_pub/loq_15_hmm.pdf'),
('MOD-APL-IPH15', 'MFG-002', 'A3090', 'Apple iPhone 15 Pro', 'Smartphone', 'Tier 1 Ultra Efficient', 66.0, 'https://support.apple.com/en-us/docs/repair/iphone15pro-repair-manual.pdf'),
('MOD-DEL-XPS13', 'MFG-003', 'XPS 9315', 'Dell XPS 13 Plus Ultrabook', 'Laptop', 'EPEAT Gold Certified', 220.0, 'https://dl.dell.com/manuals/all-products/xps-13-plus-service-manual.pdf'),
('MOD-SAM-S24U', 'MFG-004', 'SM-S928B', 'Samsung Galaxy S24 Ultra', 'Smartphone', 'Eco-Design Label A', 71.2, 'https://www.samsung.com/us/support/downloads/galaxy-s24-ultra-repair.pdf'),
('MOD-ASU-ROG27', 'MFG-005', 'PG27AQDM', 'ASUS ROG Swift 27" OLED Gaming Monitor', 'Monitor', 'B Rating (Standard)', 175.4, 'https://dlcdnets.asus.com/pub/ASUS/LCD%20Monitors/PG27AQDM_manual.pdf'),
('MOD-APL-IPAD', 'MFG-002', 'A2764', 'Apple iPad Pro 12.9" M2', 'Tablet', 'Energy Star Qualified', 115.0, 'https://support.apple.com/en-us/docs/repair/ipadpro-service-guide.pdf');

-- 7. PRODUCT ITEMS (Physical Units)
INSERT OR IGNORE INTO PRODUCT_ITEM (Product_ID, Model_ID, Serial_Number, Manufacturing_Date, Status, State_of_Health, Current_Owner_ID) VALUES
-- Unit 1: Lenovo LOQ 15 (Active In Use, Aditya)
('PROD-LOQ-001', 'MOD-LEN-LOQ15', 'LOQ-SN-2024-00188', '2024-01-15', 'In Use', 94, 'OWN-001'),
-- Unit 2: Lenovo LOQ 15 (End-of-life, Recycled at RF-001)
('PROD-LOQ-002', 'MOD-LEN-LOQ15', 'LOQ-SN-2023-00912', '2023-03-10', 'Recycled', 0, NULL),
-- Unit 3: Lenovo LOQ 15 (Under repair at TechCare Hub)
('PROD-LOQ-003', 'MOD-LEN-LOQ15', 'LOQ-SN-2024-00455', '2024-04-02', 'Under Repair', 78, 'OWN-005'),
-- Unit 4: iPhone 15 Pro (In Use, Amaan)
('PROD-IPH-001', 'MOD-APL-IPH15', 'APL-IPH15-88319', '2023-11-20', 'In Use', 98, 'OWN-002'),
-- Unit 5: iPhone 15 Pro (In Use, Neha Sharma - repaired screen)
('PROD-IPH-002', 'MOD-APL-IPH15', 'APL-IPH15-44201', '2023-10-05', 'In Use', 89, 'OWN-004'),
-- Unit 6: Dell XPS 13 (In Use, VIT SCOPE Lab)
('PROD-DEL-001', 'MOD-DEL-XPS13', 'DEL-XPS-771239', '2023-08-14', 'In Use', 91, 'OWN-003'),
-- Unit 7: Dell XPS 13 (Recycled at GreenCircuits Pune)
('PROD-DEL-002', 'MOD-DEL-XPS13', 'DEL-XPS-554102', '2022-09-18', 'Recycled', 0, NULL),
-- Unit 8: Samsung Galaxy S24 Ultra (Recycled at EcoRecycle)
('PROD-SAM-001', 'MOD-SAM-S24U', 'SAM-S24U-11928', '2024-02-12', 'Recycled', 0, NULL),
-- Unit 9: Samsung Galaxy S24 Ultra (In Use, Enterprise)
('PROD-SAM-002', 'MOD-SAM-S24U', 'SAM-S24U-66381', '2024-05-18', 'In Use', 96, 'OWN-005'),
-- Unit 10: ASUS ROG Monitor (In Use, VIT SCOPE Lab)
('PROD-ASU-001', 'MOD-ASU-ROG27', 'ASU-ROG-994120', '2023-12-01', 'In Use', 97, 'OWN-003');

-- 8. MATERIALS MASTER CATALOGUE
INSERT OR IGNORE INTO MATERIAL (Material_ID, Name, Recyclability, Hazardous, RoHS_REACH_Compliant) VALUES
('MAT-LIT-01', 'Lithium (Li-ion active material)', 92.5, 1, 1),
('MAT-COB-02', 'Cobalt (Cathode grade)', 96.0, 1, 1),
('MAT-COP-03', 'High-Purity Copper (Wiring & PCB traces)', 98.5, 0, 1),
('MAT-GLD-04', 'Recycled Gold (Contact plating & pins)', 99.8, 0, 1),
('MAT-SLV-05', 'Industrial Silver (Solder & conductors)', 99.0, 0, 1),
('MAT-ALU-06', 'Aerospace Grade Aluminum (Enclosure)', 95.0, 0, 1),
('MAT-REE-07', 'Rare Earth Elements (Neodymium NdFeB)', 82.0, 0, 1),
('MAT-SIL-08', 'Electronic Grade Silicon (Chips/Wafer)', 88.0, 0, 1),
('MAT-GLS-09', 'Aluminosilicate Display Glass', 75.0, 0, 1),
('MAT-PC-10',  'Post-Consumer Recycled Polycarbonate (Plastic)', 85.0, 0, 1),
('MAT-LEA-11', 'Lead Residue (Monitored heavy metal)', 40.0, 1, 0);

-- 9. COMPONENTS (Parts linked to Product Items)
INSERT OR IGNORE INTO COMPONENT (Component_ID, Product_ID, Serial_Number, Component_Type, Status) VALUES
-- Components for PROD-LOQ-001 (Lenovo LOQ 15 #001)
('CMP-LOQ01-BAT', 'PROD-LOQ-001', 'BAT-LOQ-8821', '60Wh 4-Cell Li-ion Battery', 'Active'),
('CMP-LOQ01-MBD', 'PROD-LOQ-001', 'MBD-LOQ-5512', 'Intel Core i7-13620H Motherboard', 'Active'),
('CMP-LOQ01-DSP', 'PROD-LOQ-001', 'DSP-LOQ-3319', '15.6" FHD 144Hz IPS Display', 'Active'),
('CMP-LOQ01-RAM', 'PROD-LOQ-001', 'RAM-LOQ-9914', '16GB DDR5 5200MHz RAM (Upgraded)', 'Active'),
('CMP-LOQ01-SSD', 'PROD-LOQ-001', 'SSD-LOQ-7721', '512GB PCIe NVMe M.2 SSD', 'Active'),
('CMP-LOQ01-CAS', 'PROD-LOQ-001', 'CAS-LOQ-1102', 'Polycarbonate + Al Alloy Chassis', 'Active'),

-- Components for PROD-LOQ-002 (Lenovo LOQ 15 #002 - Recycled)
('CMP-LOQ02-BAT', 'PROD-LOQ-002', 'BAT-LOQ-7719', '60Wh 4-Cell Li-ion Battery', 'Recycled'),
('CMP-LOQ02-MBD', 'PROD-LOQ-002', 'MBD-LOQ-4482', 'AMD Ryzen 7 7840HS Motherboard', 'Recycled'),
('CMP-LOQ02-DSP', 'PROD-LOQ-002', 'DSP-LOQ-2201', '15.6" FHD 144Hz Display', 'Recycled'),
('CMP-LOQ02-RAM', 'PROD-LOQ-002', 'RAM-LOQ-8830', '16GB DDR5 5200MHz RAM', 'Salvaged'),
('CMP-LOQ02-SSD', 'PROD-LOQ-002', 'SSD-LOQ-6612', '1TB PCIe NVMe SSD', 'Salvaged'),
('CMP-LOQ02-CAS', 'PROD-LOQ-002', 'CAS-LOQ-0994', 'Polycarbonate Chassis', 'Recycled'),

-- Components for PROD-LOQ-003 (Lenovo LOQ 15 #003 - Under Repair)
('CMP-LOQ03-BAT', 'PROD-LOQ-003', 'BAT-LOQ-1049', '60Wh Li-ion Battery (Degraded)', 'Replaced'),
('CMP-LOQ03-MBD', 'PROD-LOQ-003', 'MBD-LOQ-9943', 'Intel Core i5-13500H Motherboard', 'Active'),
('CMP-LOQ03-DSP', 'PROD-LOQ-003', 'DSP-LOQ-8812', '15.6" FHD 144Hz IPS Display', 'Active'),

-- Components for PROD-IPH-001 (Apple iPhone 15 Pro)
('CMP-IPH01-BAT', 'PROD-IPH-001', 'BAT-APL-3274', '3274mAh 100% Recycled Cobalt Battery', 'Active'),
('CMP-IPH01-MBD', 'PROD-IPH-001', 'MBD-APL-A17P', 'A17 Pro Logic Board', 'Active'),
('CMP-IPH01-OLED','PROD-IPH-001', 'DSP-APL-61OL', '6.1" Super Retina XDR OLED', 'Active'),
('CMP-IPH01-CHAS','PROD-IPH-001', 'CHA-APL-TITN', 'Titanium Grade 5 Frame + Recycled Al', 'Active'),

-- Components for PROD-IPH-002 (Apple iPhone 15 Pro - Screen Replaced)
('CMP-IPH02-OLED','PROD-IPH-002', 'DSP-APL-NEW1', '6.1" Super Retina XDR OLED (Replacement)', 'Active'),
('CMP-IPH02-BAT', 'PROD-IPH-002', 'BAT-APL-5521', '3274mAh Li-ion Battery', 'Active'),

-- Components for PROD-DEL-001 (Dell XPS 13 Plus)
('CMP-DEL01-BAT', 'PROD-DEL-001', 'BAT-DEL-55WH', '55Wh Li-ion Smart Battery', 'Active'),
('CMP-DEL01-MBD', 'PROD-DEL-001', 'MBD-DEL-I713', 'Intel Evo Core i7 System Board', 'Active'),
('CMP-DEL01-OLED','PROD-DEL-001', 'DSP-DEL-35KO', '13.4" 3.5K OLED InfinityEdge', 'Active'),

-- Components for PROD-SAM-001 (Samsung Galaxy S24 Ultra - Recycled)
('CMP-SAM01-BAT', 'PROD-SAM-001', 'BAT-SAM-5000', '5000mAh Dual-Cell Li-ion Battery', 'Recycled'),
('CMP-SAM01-MBD', 'PROD-SAM-001', 'MBD-SAM-8GEN', 'Snapdragon 8 Gen 3 Board', 'Recycled'),
('CMP-SAM01-AMO', 'PROD-SAM-001', 'DSP-SAM-68AM', '6.8" Dynamic AMOLED 2X', 'Salvaged');

-- 10. COMPONENT_MATERIAL COMPOSITION (Is Made Of)
INSERT OR IGNORE INTO COMPONENT_MATERIAL (Component_ID, Material_ID, Quantity, Unit) VALUES
-- Lenovo LOQ Battery
('CMP-LOQ01-BAT', 'MAT-LIT-01', 38.5, 'g'),
('CMP-LOQ01-BAT', 'MAT-COB-02', 16.2, 'g'),
('CMP-LOQ01-BAT', 'MAT-ALU-06', 42.0, 'g'),
('CMP-LOQ01-BAT', 'MAT-COP-03', 24.0, 'g'),

-- Lenovo LOQ Motherboard
('CMP-LOQ01-MBD', 'MAT-COP-03', 68.0, 'g'),
('CMP-LOQ01-MBD', 'MAT-GLD-04', 0.42, 'g'),
('CMP-LOQ01-MBD', 'MAT-SLV-05', 1.85, 'g'),
('CMP-LOQ01-MBD', 'MAT-SIL-08', 28.5, 'g'),
('CMP-LOQ01-MBD', 'MAT-REE-07', 0.65, 'g'),

-- Lenovo LOQ Display
('CMP-LOQ01-DSP', 'MAT-GLS-09', 240.0, 'g'),
('CMP-LOQ01-DSP', 'MAT-ALU-06', 85.0, 'g'),
('CMP-LOQ01-DSP', 'MAT-PC-10',  55.0, 'g'),

-- Lenovo LOQ Chassis
('CMP-LOQ01-CAS', 'MAT-PC-10',  480.0, 'g'),
('CMP-LOQ01-CAS', 'MAT-ALU-06', 320.0, 'g'),

-- LOQ02 Battery (Recycled)
('CMP-LOQ02-BAT', 'MAT-LIT-01', 38.5, 'g'),
('CMP-LOQ02-BAT', 'MAT-COB-02', 16.2, 'g'),
('CMP-LOQ02-BAT', 'MAT-COP-03', 24.0, 'g'),

-- LOQ02 Motherboard (Recycled)
('CMP-LOQ02-MBD', 'MAT-COP-03', 68.0, 'g'),
('CMP-LOQ02-MBD', 'MAT-GLD-04', 0.45, 'g'),
('CMP-LOQ02-MBD', 'MAT-SLV-05', 1.90, 'g'),
('CMP-LOQ02-MBD', 'MAT-SIL-08', 30.0, 'g'),

-- iPhone 15 Pro Battery
('CMP-IPH01-BAT', 'MAT-COB-02', 14.5, 'g'),
('CMP-IPH01-BAT', 'MAT-LIT-01', 12.0, 'g'),
('CMP-IPH01-BAT', 'MAT-ALU-06', 18.0, 'g'),

-- iPhone 15 Pro Logic Board
('CMP-IPH01-MBD', 'MAT-GLD-04', 0.18, 'g'),
('CMP-IPH01-MBD', 'MAT-COP-03', 22.0, 'g'),
('CMP-IPH01-MBD', 'MAT-SIL-08', 15.0, 'g'),
('CMP-IPH01-MBD', 'MAT-REE-07', 0.45, 'g'),

-- iPhone 15 Pro Chassis
('CMP-IPH01-CHAS','MAT-ALU-06', 45.0, 'g'),

-- Samsung S24 Ultra Battery & Screen
('CMP-SAM01-BAT', 'MAT-LIT-01', 16.5, 'g'),
('CMP-SAM01-BAT', 'MAT-COB-02', 18.0, 'g'),
('CMP-SAM01-AMO', 'MAT-GLS-09', 42.0, 'g'),
('CMP-SAM01-AMO', 'MAT-ALU-06', 15.0, 'g');

-- 11. REPAIRS HISTORY
INSERT OR IGNORE INTO REPAIR (Repair_ID, Product_ID, Service_Centre_ID, Repair_Date, Description, Repair_Cost, Replace_Parts) VALUES
('REP-2024-001', 'PROD-LOQ-001', 'SC-001', '2024-06-18', 'High memory usage reported during rendering; authorized RAM upgrade to 16GB dual-channel DDR5 and thermal repasting with high-efficiency compound.', 2800.00, 'RAM-LOQ-9914 (Upgraded)'),
('REP-2024-002', 'PROD-LOQ-003', 'SC-001', '2024-08-10', 'Battery health dropped below 75% causing sudden shutdowns under gaming load. Battery replaced with OEM 60Wh pack.', 3500.00, 'BAT-LOQ-1049 (Replaced with OEM Li-ion)'),
('REP-2024-003', 'PROD-IPH-002', 'SC-002', '2024-04-12', 'Accidental drop cracked the front glass. Display assembly replaced with genuine Apple OEM OLED panel; recalibrated Face ID.', 18500.00, 'DSP-APL-NEW1');

-- 12. OWNERSHIP TRANSFERS
INSERT OR IGNORE INTO OWNERSHIP_HISTORY (Transfer_ID, Product_ID, Previous_Owner_ID, New_Owner_ID, Transfer_Date, Transfer_Reason) VALUES
('TRF-001', 'PROD-LOQ-001', NULL, 'OWN-001', '2024-01-20', 'First-hand retail purchase from authorized distributor by Aditya Priyan C'),
('TRF-002', 'PROD-IPH-001', NULL, 'OWN-002', '2023-11-25', 'Initial retail delivery to Amaan Abdullah Karuthedath'),
('TRF-003', 'PROD-DEL-001', NULL, 'OWN-003', '2023-08-25', 'Institutional procurement for VIT SCOPE Advanced Database Lab'),
('TRF-004', 'PROD-IPH-002', 'OWN-005', 'OWN-004', '2024-02-15', 'Secondary corporate asset redistribution to Dr. Neha Sharma for academic field studies'),
('TRF-005', 'PROD-LOQ-003', NULL, 'OWN-005', '2024-04-10', 'Enterprise fleet deployment for AI software development');

-- 13. RECYCLING EVENTS (End of Life)
INSERT OR IGNORE INTO RECYCLING_EVENT (Recycling_Event_ID, Product_ID, Recycling_Facility_ID, Intake_Date, Decommission_Status, Notes) VALUES
('REC-2024-001', 'PROD-LOQ-002', 'RF-001', '2024-07-05', 'Fully Dismantled & Processed', 'Received at end-of-life after water damage to motherboard. Safely discharged and recovered critical raw materials.'),
('REC-2024-002', 'PROD-DEL-002', 'RF-002', '2024-08-20', 'Fully Dismantled & Processed', 'Replaced during institutional refresh. Chassis and PCB sorted for hydrometallurgical extraction.'),
('REC-2024-003', 'PROD-SAM-001', 'RF-001', '2024-09-12', 'Fully Dismantled & Processed', 'Screen salvaged for secondary device repairs. Battery recycled in inert argon gas shredder.');

-- 14. SALVAGED COMPONENTS (Reusable parts diverted from e-waste landfill)
INSERT OR IGNORE INTO SALVAGE (Salvage_ID, Recycling_Event_ID, Component_ID, Salvage_Date, Condition_Grade) VALUES
('SLV-2024-01', 'REC-2024-001', 'CMP-LOQ02-RAM', '2024-07-08', 'Grade A (Excellent)'),
('SLV-2024-02', 'REC-2024-001', 'CMP-LOQ02-SSD', '2024-07-08', 'Grade B (Good)'),
('SLV-2024-03', 'REC-2024-003', 'CMP-SAM01-AMO', '2024-09-15', 'Grade A (Excellent)');

-- 15. MATERIAL RECOVERY (Actual circularity yields)
INSERT OR IGNORE INTO RECOVERY (Recovery_ID, Recycling_Event_ID, Material_ID, Recovery_Date, Quantity, Unit, Purity) VALUES
-- Recovered from Lenovo LOQ #002
('RCV-2024-01', 'REC-2024-001', 'MAT-COP-03', '2024-07-12', 64.2, 'g', 99.4),
('RCV-2024-02', 'REC-2024-001', 'MAT-GLD-04', '2024-07-12', 0.41, 'g', 99.8),
('RCV-2024-03', 'REC-2024-001', 'MAT-LIT-01', '2024-07-14', 35.0, 'g', 94.2),
('RCV-2024-04', 'REC-2024-001', 'MAT-COB-02', '2024-07-14', 15.1, 'g', 96.5),
('RCV-2024-05', 'REC-2024-001', 'MAT-ALU-06', '2024-07-15', 380.0, 'g', 98.0),

-- Recovered from Dell XPS 13 #002
('RCV-2024-06', 'REC-2024-002', 'MAT-ALU-06', '2024-08-25', 490.0, 'g', 98.7),
('RCV-2024-07', 'REC-2024-002', 'MAT-COP-03', '2024-08-26', 52.0, 'g', 99.1),
('RCV-2024-08', 'REC-2024-002', 'MAT-GLD-04', '2024-08-26', 0.35, 'g', 99.6),

-- Recovered from Samsung S24 Ultra #001
('RCV-2024-09', 'REC-2024-003', 'MAT-COB-02', '2024-09-18', 16.8, 'g', 97.2),
('RCV-2024-10', 'REC-2024-003', 'MAT-LIT-01', '2024-09-18', 15.2, 'g', 95.0),
('RCV-2024-11', 'REC-2024-003', 'MAT-REE-07', '2024-09-20', 0.38, 'g', 91.5);

-- 16. LIFECYCLE EVENT TIMELINE RECORDS
INSERT OR IGNORE INTO LIFECYCLE_EVENT (Event_ID, Product_ID, Stage, Event_Type, Event_Date, Stakeholder_ID, Title, Description) VALUES
-- Lifecycle of PROD-LOQ-001
('EVT-LOQ01-01', 'PROD-LOQ-001', 'Manufacturing', 'Device Manufactured', '2024-01-15', 'MFG-001', 'Factory Production Complete', 'Lenovo assembly line in Hefei completed production and burn-in testing. Serialized components linked to DPP.'),
('EVT-LOQ01-02', 'PROD-LOQ-001', 'Purchase/Ownership', 'First Retail Purchase', '2024-01-20', 'OWN-001', 'Product Handover to Aditya Priyan', 'Purchased by Aditya Priyan C. Digital Product Passport ownership registered with VIT email address.'),
('EVT-LOQ01-03', 'PROD-LOQ-001', 'Repair & Maintenance', 'Service & Upgrade', '2024-06-18', 'SC-001', 'RAM Upgrade & Thermal Overhaul', 'Upgraded from 8GB to 16GB dual-channel DDR5. Replaced thermal interface material; fan vents cleaned.'),

-- Lifecycle of PROD-LOQ-002 (Complete cradle-to-grave)
('EVT-LOQ02-01', 'PROD-LOQ-002', 'Manufacturing', 'Device Manufactured', '2023-03-10', 'MFG-001', 'Factory Production Complete', 'Lenovo LOQ 15 unit manufactured and provisioned with DPP UUID.'),
('EVT-LOQ02-02', 'PROD-LOQ-002', 'Purchase/Ownership', 'Commercial Deployment', '2023-03-22', 'OWN-005', 'Purchased by EcoGreen Enterprises', 'Deployed for software engineering team.'),
('EVT-LOQ02-03', 'PROD-LOQ-002', 'End-of-Life Recycling', 'Recycling Intake', '2024-07-05', 'RF-001', 'Arrived at EcoRecycle Solutions Hub', 'Decommissioned following fatal liquid spill. Enclosure opened for non-destructive component sorting.'),
('EVT-LOQ02-04', 'PROD-LOQ-002', 'End-of-Life Recycling', 'Component Salvage', '2024-07-08', 'RF-001', 'DDR5 RAM & NVMe SSD Salvaged', 'Memory module and high-speed SSD tested 100% operational and graded A/B for secondary refurbished systems.'),
('EVT-LOQ02-05', 'PROD-LOQ-002', 'End-of-Life Recycling', 'Hydrometallurgical Extraction', '2024-07-14', 'RF-001', 'Critical Raw Materials Recovered', 'Extracted 35.0g Lithium, 15.1g Cobalt, 64.2g Copper, and 0.41g 99.8% pure Gold.'),

-- Lifecycle of PROD-LOQ-003
('EVT-LOQ03-01', 'PROD-LOQ-003', 'Manufacturing', 'Device Manufactured', '2024-04-02', 'MFG-001', 'Production Complete', 'Lenovo factory QA passed.'),
('EVT-LOQ03-02', 'PROD-LOQ-003', 'Purchase/Ownership', 'Deployment', '2024-04-10', 'OWN-005', 'Fleet Allocation', 'Deployed to senior developer at EcoGreen Enterprises.'),
('EVT-LOQ03-03', 'PROD-LOQ-003', 'Repair & Maintenance', 'Under Repair', '2024-08-10', 'SC-001', 'Battery Replacement in Progress', 'Undergoing diagnostics and battery module swap at TechCare Hub Bangalore.'),

-- Lifecycle of PROD-IPH-001
('EVT-IPH01-01', 'PROD-IPH-001', 'Manufacturing', 'Device Manufactured', '2023-11-20', 'MFG-002', 'Assembled by Apple Inc.', 'Precision assembly with 100% recycled gold in logic board plating and 100% recycled cobalt battery.'),
('EVT-IPH01-02', 'PROD-IPH-001', 'Purchase/Ownership', 'Retail Activation', '2023-11-25', 'OWN-002', 'Activated by Amaan Abdullah', 'Owner passport registered at VIT University.');
