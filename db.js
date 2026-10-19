// ============================================================================
// DIGITAL PRODUCT PASSPORT (DPP) - DATABASE ACCESS LAYER
// Course: BACSE202 - Database Systems | Vellore Institute of Technology (VIT)
// Team: Aditya Priyan C (25BCE0662), Amaan Abdullah Karuthedath (25BCE2701)
// Faculty Guide: Prof. Saritha Murali
// ============================================================================

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'dpp_database.sqlite');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');
const SEED_FILE = path.join(__dirname, 'seed.sql');

let dbInstance = null;

function getDb() {
    if (!dbInstance) {
        const fileExists = fs.existsSync(DB_FILE);
        dbInstance = new DatabaseSync(DB_FILE);
        
        // Enable foreign key enforcement in SQLite
        dbInstance.exec('PRAGMA foreign_keys = ON;');
        
        if (!fileExists) {
            console.log('📦 Initializing fresh DPP database from schema & seed files...');
            const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
            dbInstance.exec(schemaSql);
            
            const seedSql = fs.readFileSync(SEED_FILE, 'utf8');
            dbInstance.exec(seedSql);
            console.log('✅ Database initialized and seeded successfully.');
        } else {
            // Check if tables exist just in case
            const tableCheck = dbInstance.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='PRODUCT_ITEM'").get();
            if (tableCheck.count === 0) {
                const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
                dbInstance.exec(schemaSql);
                const seedSql = fs.readFileSync(SEED_FILE, 'utf8');
                dbInstance.exec(seedSql);
            }
        }
    }
    return dbInstance;
}

// Reset database to initial state
function resetDatabase() {
    const db = getDb();
    // Drop all tables
    const tables = [
        'LIFECYCLE_EVENT', 'RECOVERY', 'SALVAGE', 'RECYCLING_EVENT',
        'OWNERSHIP_HISTORY', 'REPAIR', 'COMPONENT_MATERIAL', 'MATERIAL',
        'COMPONENT', 'PRODUCT_ITEM', 'PRODUCT_MODEL',
        'RECYCLING_FACILITY', 'SERVICE_CENTRE', 'OWNER', 'MANUFACTURER', 'STAKEHOLDER'
    ];
    for (const tbl of tables) {
        db.exec(`DROP TABLE IF EXISTS ${tbl};`);
    }
    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    db.exec(schemaSql);
    const seedSql = fs.readFileSync(SEED_FILE, 'utf8');
    db.exec(seedSql);
    return { success: true, message: 'Database reset and re-seeded with realistic dataset.' };
}

// Get all products with model & manufacturer info
function getProducts(filters = {}) {
    const db = getDb();
    let sql = `
        SELECT 
            p.Product_ID,
            p.Serial_Number,
            p.Manufacturing_Date,
            p.Status,
            p.State_of_Health,
            m.Model_ID,
            m.Model_Number,
            m.Name AS Model_Name,
            m.Product_Type,
            m.Carbon_Footprint,
            m.Energy_Rating,
            mfg_s.Name AS Manufacturer_Name,
            mfg.Country_of_Origin,
            own_s.Name AS Owner_Name,
            own_s.Stakeholder_ID AS Owner_ID
        FROM PRODUCT_ITEM p
        JOIN PRODUCT_MODEL m ON p.Model_ID = m.Model_ID
        JOIN MANUFACTURER mfg ON m.Manufacturer_ID = mfg.Stakeholder_ID
        JOIN STAKEHOLDER mfg_s ON mfg.Stakeholder_ID = mfg_s.Stakeholder_ID
        LEFT JOIN OWNER own ON p.Current_Owner_ID = own.Stakeholder_ID
        LEFT JOIN STAKEHOLDER own_s ON own.Stakeholder_ID = own_s.Stakeholder_ID
        WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
        sql += ` AND (
            p.Product_ID LIKE ? OR 
            p.Serial_Number LIKE ? OR 
            m.Name LIKE ? OR 
            m.Model_Number LIKE ? OR
            mfg_s.Name LIKE ? OR
            own_s.Name LIKE ?
        )`;
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (filters.category && filters.category !== 'all') {
        sql += ` AND m.Product_Type = ?`;
        params.push(filters.category);
    }

    if (filters.status && filters.status !== 'all') {
        sql += ` AND p.Status = ?`;
        params.push(filters.status);
    }

    sql += ` ORDER BY p.Manufacturing_Date DESC`;

    return db.prepare(sql).all(...params);
}

// Get complete Digital Product Passport for a single Product_ID
function getProductPassport(productId) {
    const db = getDb();

    // 1. Core Item and Model Details
    const coreSql = `
        SELECT 
            p.Product_ID,
            p.Serial_Number,
            p.Manufacturing_Date,
            p.Status,
            p.State_of_Health,
            p.Current_Owner_ID,
            m.Model_ID,
            m.Model_Number,
            m.Name AS Model_Name,
            m.Product_Type,
            m.Energy_Rating,
            m.Carbon_Footprint,
            m.Disassembly_Manual_URL,
            mfg_s.Stakeholder_ID AS Manufacturer_ID,
            mfg_s.Name AS Manufacturer_Name,
            mfg_s.Email AS Manufacturer_Email,
            mfg_s.Phone AS Manufacturer_Phone,
            mfg_s.Address AS Manufacturer_Address,
            mfg.Registration_Number AS Manufacturer_Reg_No,
            mfg.Country_of_Origin,
            own_s.Stakeholder_ID AS Current_Owner_ID,
            own_s.Name AS Current_Owner_Name,
            own_s.Email AS Current_Owner_Email,
            own_s.Phone AS Current_Owner_Phone,
            own_s.Address AS Current_Owner_Address,
            own.Owner_Type AS Current_Owner_Type
        FROM PRODUCT_ITEM p
        JOIN PRODUCT_MODEL m ON p.Model_ID = m.Model_ID
        JOIN MANUFACTURER mfg ON m.Manufacturer_ID = mfg.Stakeholder_ID
        JOIN STAKEHOLDER mfg_s ON mfg.Stakeholder_ID = mfg_s.Stakeholder_ID
        LEFT JOIN OWNER own ON p.Current_Owner_ID = own.Stakeholder_ID
        LEFT JOIN STAKEHOLDER own_s ON own.Stakeholder_ID = own_s.Stakeholder_ID
        WHERE p.Product_ID = ? OR p.Serial_Number = ?
    `;

    const product = db.prepare(coreSql).get(productId, productId);
    if (!product) return null;

    const actualProductId = product.Product_ID;

    // 2. Components
    const compSql = `
        SELECT 
            c.Component_ID,
            c.Serial_Number,
            c.Component_Type,
            c.Status
        FROM COMPONENT c
        WHERE c.Product_ID = ?
        ORDER BY c.Component_Type
    `;
    const components = db.prepare(compSql).all(actualProductId);

    // 3. Materials Composition (Bill of Materials) via Component_Material
    const matSql = `
        SELECT 
            m.Material_ID,
            m.Name AS Material_Name,
            m.Recyclability,
            m.Hazardous,
            m.RoHS_REACH_Compliant,
            cm.Quantity,
            cm.Unit,
            c.Component_ID,
            c.Component_Type
        FROM COMPONENT c
        JOIN COMPONENT_MATERIAL cm ON c.Component_ID = cm.Component_ID
        JOIN MATERIAL m ON cm.Material_ID = m.Material_ID
        WHERE c.Product_ID = ?
        ORDER BY m.Hazardous DESC, cm.Quantity DESC
    `;
    const componentMaterials = db.prepare(matSql).all(actualProductId);

    // Aggregated Bill of Materials per Material
    const bomAggregated = {};
    let totalWeightGrams = 0;
    let totalRecyclableGrams = 0;
    let totalHazardousCount = 0;

    for (const cm of componentMaterials) {
        // Standardize weight in grams
        let weightInGrams = cm.Quantity;
        if (cm.Unit === 'kg') weightInGrams *= 1000;
        else if (cm.Unit === 'mg') weightInGrams /= 1000;

        totalWeightGrams += weightInGrams;
        totalRecyclableGrams += weightInGrams * (cm.Recyclability / 100);
        if (cm.Hazardous) totalHazardousCount++;

        if (!bomAggregated[cm.Material_ID]) {
            bomAggregated[cm.Material_ID] = {
                materialId: cm.Material_ID,
                name: cm.Material_Name,
                recyclability: cm.Recyclability,
                hazardous: cm.Hazardous,
                rohsCompliant: cm.RoHS_REACH_Compliant,
                totalQuantityGrams: 0,
                usedInComponents: []
            };
        }
        bomAggregated[cm.Material_ID].totalQuantityGrams += weightInGrams;
        if (!bomAggregated[cm.Material_ID].usedInComponents.includes(cm.Component_Type)) {
            bomAggregated[cm.Material_ID].usedInComponents.push(cm.Component_Type);
        }
    }

    const billOfMaterials = Object.values(bomAggregated).map(m => ({
        ...m,
        totalQuantityGrams: parseFloat(m.totalQuantityGrams.toFixed(2))
    }));

    const circularityScore = totalWeightGrams > 0 
        ? parseFloat(((totalRecyclableGrams / totalWeightGrams) * 100).toFixed(1))
        : 85.0;

    // 4. Ownership History
    const ownSql = `
        SELECT 
            oh.Transfer_ID,
            oh.Transfer_Date,
            oh.Transfer_Reason,
            prev_s.Name AS Previous_Owner_Name,
            new_s.Name AS New_Owner_Name,
            new_o.Owner_Type AS New_Owner_Type
        FROM OWNERSHIP_HISTORY oh
        LEFT JOIN STAKEHOLDER prev_s ON oh.Previous_Owner_ID = prev_s.Stakeholder_ID
        JOIN STAKEHOLDER new_s ON oh.New_Owner_ID = new_s.Stakeholder_ID
        JOIN OWNER new_o ON oh.New_Owner_ID = new_o.Stakeholder_ID
        WHERE oh.Product_ID = ?
        ORDER BY oh.Transfer_Date ASC
    `;
    const ownershipHistory = db.prepare(ownSql).all(actualProductId);

    // 5. Repair History
    const repSql = `
        SELECT 
            r.Repair_ID,
            r.Repair_Date,
            r.Description,
            r.Repair_Cost,
            r.Replace_Parts,
            s.Name AS Service_Centre_Name,
            sc.License_Number
        FROM REPAIR r
        JOIN STAKEHOLDER s ON r.Service_Centre_ID = s.Stakeholder_ID
        JOIN SERVICE_CENTRE sc ON r.Service_Centre_ID = sc.Stakeholder_ID
        WHERE r.Product_ID = ?
        ORDER BY r.Repair_Date DESC
    `;
    const repairs = db.prepare(repSql).all(actualProductId);

    // 6. Recycling Event Details & Recovered Materials
    const recSql = `
        SELECT 
            re.Recycling_Event_ID,
            re.Intake_Date,
            re.Decommission_Status,
            re.Notes,
            rf_s.Name AS Recycling_Facility_Name,
            rf.Processing_Capacity,
            rf.Environmental_Permit_ID
        FROM RECYCLING_EVENT re
        JOIN STAKEHOLDER rf_s ON re.Recycling_Facility_ID = rf_s.Stakeholder_ID
        JOIN RECYCLING_FACILITY rf ON re.Recycling_Facility_ID = rf.Stakeholder_ID
        WHERE re.Product_ID = ?
    `;
    const recyclingEvent = db.prepare(recSql).get(actualProductId);

    let salvages = [];
    let recoveries = [];

    if (recyclingEvent) {
        // Salvaged components
        const slvSql = `
            SELECT 
                s.Salvage_ID,
                s.Salvage_Date,
                s.Condition_Grade,
                c.Component_ID,
                c.Component_Type,
                c.Serial_Number
            FROM SALVAGE s
            JOIN COMPONENT c ON s.Component_ID = c.Component_ID
            WHERE s.Recycling_Event_ID = ?
            ORDER BY s.Salvage_Date DESC
        `;
        salvages = db.prepare(slvSql).all(recyclingEvent.Recycling_Event_ID);

        // Recovered Materials
        const rcvSql = `
            SELECT 
                rc.Recovery_ID,
                rc.Recovery_Date,
                rc.Quantity,
                rc.Unit,
                rc.Purity,
                m.Material_ID,
                m.Name AS Material_Name,
                m.Recyclability
            FROM RECOVERY rc
            JOIN MATERIAL m ON rc.Material_ID = m.Material_ID
            WHERE rc.Recycling_Event_ID = ?
            ORDER BY rc.Quantity DESC
        `;
        recoveries = db.prepare(rcvSql).all(recyclingEvent.Recycling_Event_ID);
    }

    // 7. Full Lifecycle Timeline
    const timeSql = `
        SELECT 
            le.Event_ID,
            le.Stage,
            le.Event_Type,
            le.Event_Date,
            le.Title,
            le.Description,
            s.Name AS Stakeholder_Name,
            s.Stakeholder_Type
        FROM LIFECYCLE_EVENT le
        LEFT JOIN STAKEHOLDER s ON le.Stakeholder_ID = s.Stakeholder_ID
        WHERE le.Product_ID = ?
        ORDER BY le.Event_Date ASC, le.Event_ID ASC
    `;
    const timeline = db.prepare(timeSql).all(actualProductId);

    return {
        ...product,
        components,
        billOfMaterials,
        componentMaterials,
        circularityScore,
        totalWeightGrams: parseFloat(totalWeightGrams.toFixed(2)),
        totalHazardousCount,
        ownershipHistory,
        repairs,
        recyclingEvent: recyclingEvent ? {
            ...recyclingEvent,
            salvages,
            recoveries
        } : null,
        timeline
    };
}

// Summary Statistics for Dashboard
function getSummaryStats() {
    const db = getDb();
    
    const productCounts = db.prepare(`
        SELECT 
            COUNT(*) AS totalProducts,
            SUM(CASE WHEN Status = 'In Use' THEN 1 ELSE 0 END) AS inUseCount,
            SUM(CASE WHEN Status = 'Under Repair' THEN 1 ELSE 0 END) AS underRepairCount,
            SUM(CASE WHEN Status = 'Recycled' THEN 1 ELSE 0 END) AS recycledCount,
            AVG(State_of_Health) AS avgHealth
        FROM PRODUCT_ITEM
    `).get();

    const repairStats = db.prepare(`
        SELECT 
            COUNT(*) AS totalRepairs,
            SUM(Repair_Cost) AS totalRepairCost
        FROM REPAIR
    `).get();

    const recoveryStats = db.prepare(`
        SELECT 
            COUNT(*) AS totalRecoveryEvents,
            SUM(Quantity) AS totalMaterialWeightGrams
        FROM RECOVERY
        WHERE Unit = 'g'
    `).get();

    const salvagedCount = db.prepare(`
        SELECT COUNT(*) AS totalSalvagedParts FROM SALVAGE
    `).get();

    const modelCount = db.prepare(`
        SELECT COUNT(*) AS totalModels FROM PRODUCT_MODEL
    `).get();

    const materialsBreakdown = db.prepare(`
        SELECT 
            m.Name AS Material_Name,
            m.Material_ID,
            SUM(r.Quantity) as TotalRecovered,
            r.Unit,
            AVG(r.Purity) as AvgPurity
        FROM RECOVERY r
        JOIN MATERIAL m ON r.Material_ID = m.Material_ID
        GROUP BY m.Material_ID
        ORDER BY TotalRecovered DESC
    `).all();

    return {
        totalProducts: productCounts.totalProducts || 0,
        inUseCount: productCounts.inUseCount || 0,
        underRepairCount: productCounts.underRepairCount || 0,
        recycledCount: productCounts.recycledCount || 0,
        avgHealth: parseFloat((productCounts.avgHealth || 0).toFixed(1)),
        totalRepairs: repairStats.totalRepairs || 0,
        totalRepairCost: repairStats.totalRepairCost || 0,
        totalSalvagedParts: salvagedCount.totalSalvagedParts || 0,
        totalModels: modelCount.totalModels || 0,
        totalMaterialWeightGrams: parseFloat((recoveryStats.totalMaterialWeightGrams || 0).toFixed(1)),
        materialsBreakdown
    };
}

// Get models list
function getModels() {
    const db = getDb();
    return db.prepare(`
        SELECT m.*, s.Name AS Manufacturer_Name 
        FROM PRODUCT_MODEL m
        JOIN STAKEHOLDER s ON m.Manufacturer_ID = s.Stakeholder_ID
        ORDER BY m.Name
    `).all();
}

// Get stakeholders list by type
function getStakeholders(type) {
    const db = getDb();
    let sql = `SELECT * FROM STAKEHOLDER`;
    const params = [];
    if (type) {
        sql += ` WHERE Stakeholder_Type = ?`;
        params.push(type);
    }
    sql += ` ORDER BY Name`;
    return db.prepare(sql).all(...params);
}

// Register a new product model
function createProductModel(data) {
    const db = getDb();
    const modelId = data.Model_ID || `MOD-${Date.now().toString().slice(-6)}`;
    
    db.prepare(`
        INSERT INTO PRODUCT_MODEL (Model_ID, Manufacturer_ID, Model_Number, Name, Product_Type, Energy_Rating, Carbon_Footprint, Disassembly_Manual_URL)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        modelId,
        data.Manufacturer_ID,
        data.Model_Number,
        data.Name,
        data.Product_Type,
        data.Energy_Rating || 'Energy Star 8.0',
        parseFloat(data.Carbon_Footprint || 150),
        data.Disassembly_Manual_URL || '#'
    );

    return { success: true, Model_ID: modelId };
}

// Register a new product item (physical device)
function createProductItem(data) {
    const db = getDb();
    const productId = data.Product_ID || `PROD-${Date.now().toString().slice(-6)}`;
    
    // Insert into PRODUCT_ITEM
    db.prepare(`
        INSERT INTO PRODUCT_ITEM (Product_ID, Model_ID, Serial_Number, Manufacturing_Date, Status, State_of_Health, Current_Owner_ID)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        productId,
        data.Model_ID,
        data.Serial_Number,
        data.Manufacturing_Date || new Date().toISOString().split('T')[0],
        data.Status || 'In Use',
        parseInt(data.State_of_Health || 100),
        data.Current_Owner_ID || null
    );

    // Initial lifecycle event: Manufacturing
    const model = db.prepare(`SELECT m.*, mfg.Stakeholder_ID AS mfgId FROM PRODUCT_MODEL m JOIN MANUFACTURER mfg ON m.Manufacturer_ID = mfg.Stakeholder_ID WHERE m.Model_ID = ?`).get(data.Model_ID);
    
    db.prepare(`
        INSERT INTO LIFECYCLE_EVENT (Event_ID, Product_ID, Stage, Event_Type, Event_Date, Stakeholder_ID, Title, Description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        `EVT-${Date.now().toString().slice(-8)}`,
        productId,
        'Manufacturing',
        'Device Manufactured',
        data.Manufacturing_Date || new Date().toISOString().split('T')[0],
        model ? model.mfgId : null,
        `Factory Provisioning: ${model ? model.Name : 'Electronic Device'}`,
        `Initial digital product passport created. Serial Number: ${data.Serial_Number}`
    );

    // If an initial owner was specified, record transfer and lifecycle event
    if (data.Current_Owner_ID) {
        db.prepare(`
            INSERT INTO OWNERSHIP_HISTORY (Transfer_ID, Product_ID, Previous_Owner_ID, New_Owner_ID, Transfer_Date, Transfer_Reason)
            VALUES (?, ?, NULL, ?, ?, ?)
        `).run(
            `TRF-${Date.now().toString().slice(-6)}`,
            productId,
            data.Current_Owner_ID,
            data.Manufacturing_Date || new Date().toISOString().split('T')[0],
            'Initial Customer Registration / Commissioning'
        );

        db.prepare(`
            INSERT INTO LIFECYCLE_EVENT (Event_ID, Product_ID, Stage, Event_Type, Event_Date, Stakeholder_ID, Title, Description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            `EVT-${(Date.now() + 1).toString().slice(-8)}`,
            productId,
            'Purchase/Ownership',
            'First Ownership Registration',
            data.Manufacturing_Date || new Date().toISOString().split('T')[0],
            data.Current_Owner_ID,
            'Device Handover to Owner',
            'Registered to initial owner in Digital Product Passport system.'
        );
    }

    // Add standard default components if specified or auto-generated
    if (data.components && Array.isArray(data.components)) {
        for (const comp of data.components) {
            const compId = comp.Component_ID || `CMP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
            db.prepare(`
                INSERT INTO COMPONENT (Component_ID, Product_ID, Serial_Number, Component_Type, Status)
                VALUES (?, ?, ?, ?, ?)
            `).run(
                compId,
                productId,
                comp.Serial_Number || `SN-${compId}`,
                comp.Component_Type,
                comp.Status || 'Active'
            );
        }
    } else {
        // Auto create standard components for traceability demo
        const defaultComps = [
            { type: 'Battery', sn: `BAT-${data.Serial_Number}` },
            { type: 'Motherboard', sn: `MBD-${data.Serial_Number}` },
            { type: 'Display / Enclosure', sn: `DSP-${data.Serial_Number}` }
        ];
        for (const c of defaultComps) {
            const compId = `CMP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
            db.prepare(`
                INSERT INTO COMPONENT (Component_ID, Product_ID, Serial_Number, Component_Type, Status)
                VALUES (?, ?, ?, ?, ?)
            `).run(compId, productId, c.sn, c.type, 'Active');

            // Attach standard material
            if (c.type === 'Battery') {
                db.prepare(`INSERT OR IGNORE INTO COMPONENT_MATERIAL VALUES (?, 'MAT-LIT-01', 25.0, 'g')`).run(compId);
                db.prepare(`INSERT OR IGNORE INTO COMPONENT_MATERIAL VALUES (?, 'MAT-COB-02', 12.0, 'g')`).run(compId);
            } else if (c.type === 'Motherboard') {
                db.prepare(`INSERT OR IGNORE INTO COMPONENT_MATERIAL VALUES (?, 'MAT-COP-03', 45.0, 'g')`).run(compId);
                db.prepare(`INSERT OR IGNORE INTO COMPONENT_MATERIAL VALUES (?, 'MAT-GLD-04', 0.25, 'g')`).run(compId);
            } else {
                db.prepare(`INSERT OR IGNORE INTO COMPONENT_MATERIAL VALUES (?, 'MAT-ALU-06', 180.0, 'g')`).run(compId);
            }
        }
    }

    return { success: true, Product_ID: productId };
}

// Record a repair event
function recordRepair(data) {
    const db = getDb();
    const repairId = data.Repair_ID || `REP-${Date.now().toString().slice(-6)}`;
    
    db.prepare(`
        INSERT INTO REPAIR (Repair_ID, Product_ID, Service_Centre_ID, Repair_Date, Description, Repair_Cost, Replace_Parts)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        repairId,
        data.Product_ID,
        data.Service_Centre_ID,
        data.Repair_Date || new Date().toISOString().split('T')[0],
        data.Description,
        parseFloat(data.Repair_Cost || 0),
        data.Replace_Parts || 'None'
    );

    // Update Product Item status if requested or restore to In Use
    const newStatus = data.New_Status || 'In Use';
    const newHealth = data.New_State_of_Health !== undefined ? parseInt(data.New_State_of_Health) : null;
    
    if (newHealth !== null) {
        db.prepare(`UPDATE PRODUCT_ITEM SET Status = ?, State_of_Health = ? WHERE Product_ID = ?`).run(newStatus, newHealth, data.Product_ID);
    } else {
        db.prepare(`UPDATE PRODUCT_ITEM SET Status = ? WHERE Product_ID = ?`).run(newStatus, data.Product_ID);
    }

    // Add to unified lifecycle timeline
    db.prepare(`
        INSERT INTO LIFECYCLE_EVENT (Event_ID, Product_ID, Stage, Event_Type, Event_Date, Stakeholder_ID, Title, Description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        `EVT-${Date.now().toString().slice(-8)}`,
        data.Product_ID,
        'Repair & Maintenance',
        'Service Maintenance Performed',
        data.Repair_Date || new Date().toISOString().split('T')[0],
        data.Service_Centre_ID,
        'Repair Completed',
        `${data.Description} (Replaced: ${data.Replace_Parts || 'None'}) - Cost: ₹${data.Repair_Cost}`
    );

    return { success: true, Repair_ID: repairId };
}

// Record an ownership transfer
function recordTransfer(data) {
    const db = getDb();
    const transferId = data.Transfer_ID || `TRF-${Date.now().toString().slice(-6)}`;
    
    // Get current owner first
    const currentItem = db.prepare(`SELECT Current_Owner_ID FROM PRODUCT_ITEM WHERE Product_ID = ?`).get(data.Product_ID);
    const prevOwnerId = currentItem ? currentItem.Current_Owner_ID : null;

    db.prepare(`
        INSERT INTO OWNERSHIP_HISTORY (Transfer_ID, Product_ID, Previous_Owner_ID, New_Owner_ID, Transfer_Date, Transfer_Reason)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        transferId,
        data.Product_ID,
        prevOwnerId,
        data.New_Owner_ID,
        data.Transfer_Date || new Date().toISOString().split('T')[0],
        data.Transfer_Reason || 'Ownership transfer'
    );

    // Update current owner on PRODUCT_ITEM
    db.prepare(`UPDATE PRODUCT_ITEM SET Current_Owner_ID = ?, Status = 'In Use' WHERE Product_ID = ?`).run(data.New_Owner_ID, data.Product_ID);

    // Add to timeline
    const newOwnerStakeholder = db.prepare(`SELECT Name FROM STAKEHOLDER WHERE Stakeholder_ID = ?`).get(data.New_Owner_ID);

    db.prepare(`
        INSERT INTO LIFECYCLE_EVENT (Event_ID, Product_ID, Stage, Event_Type, Event_Date, Stakeholder_ID, Title, Description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        `EVT-${Date.now().toString().slice(-8)}`,
        data.Product_ID,
        'Reuse & Transfer',
        'Ownership Transferred',
        data.Transfer_Date || new Date().toISOString().split('T')[0],
        data.New_Owner_ID,
        `Transferred to ${newOwnerStakeholder ? newOwnerStakeholder.Name : 'New Owner'}`,
        `Reason: ${data.Transfer_Reason || 'Secondary resale / redistribution'}`
    );

    return { success: true, Transfer_ID: transferId };
}

// Record recycling intake & end of life
function recordRecyclingIntake(data) {
    const db = getDb();
    const eventId = data.Recycling_Event_ID || `REC-${Date.now().toString().slice(-6)}`;

    db.prepare(`
        INSERT INTO RECYCLING_EVENT (Recycling_Event_ID, Product_ID, Recycling_Facility_ID, Intake_Date, Decommission_Status, Notes)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        eventId,
        data.Product_ID,
        data.Recycling_Facility_ID,
        data.Intake_Date || new Date().toISOString().split('T')[0],
        data.Decommission_Status || 'Fully Dismantled & Processed',
        data.Notes || 'E-waste intake for recovery'
    );

    // Update Product Item status
    db.prepare(`UPDATE PRODUCT_ITEM SET Status = 'Recycled', State_of_Health = 0, Current_Owner_ID = NULL WHERE Product_ID = ?`).run(data.Product_ID);

    // Add to lifecycle timeline
    db.prepare(`
        INSERT INTO LIFECYCLE_EVENT (Event_ID, Product_ID, Stage, Event_Type, Event_Date, Stakeholder_ID, Title, Description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        `EVT-${Date.now().toString().slice(-8)}`,
        data.Product_ID,
        'End-of-Life Recycling',
        'E-Waste Recycling Intake',
        data.Intake_Date || new Date().toISOString().split('T')[0],
        data.Recycling_Facility_ID,
        'Received at Recycling Facility',
        `Status: ${data.Decommission_Status || 'Dismantled'}. Notes: ${data.Notes || 'End-of-life sorting and extraction initiated.'}`
    );

    return { success: true, Recycling_Event_ID: eventId };
}

// Record component salvage
function recordSalvage(data) {
    const db = getDb();
    const salvageId = data.Salvage_ID || `SLV-${Date.now().toString().slice(-6)}`;

    db.prepare(`
        INSERT INTO SALVAGE (Salvage_ID, Recycling_Event_ID, Component_ID, Salvage_Date, Condition_Grade)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        salvageId,
        data.Recycling_Event_ID,
        data.Component_ID,
        data.Salvage_Date || new Date().toISOString().split('T')[0],
        data.Condition_Grade || 'Grade A (Excellent)'
    );

    // Mark component as Salvaged
    db.prepare(`UPDATE COMPONENT SET Status = 'Salvaged' WHERE Component_ID = ?`).run(data.Component_ID);

    // Find product id
    const comp = db.prepare(`SELECT Product_ID, Component_Type FROM COMPONENT WHERE Component_ID = ?`).get(data.Component_ID);
    if (comp) {
        db.prepare(`
            INSERT INTO LIFECYCLE_EVENT (Event_ID, Product_ID, Stage, Event_Type, Event_Date, Stakeholder_ID, Title, Description)
            VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
        `).run(
            `EVT-${Date.now().toString().slice(-8)}`,
            comp.Product_ID,
            'End-of-Life Recycling',
            'Component Salvaged for Reuse',
            data.Salvage_Date || new Date().toISOString().split('T')[0],
            `Salvaged: ${comp.Component_Type}`,
            `Tested and certified as ${data.Condition_Grade || 'Grade A'} for second-life application.`
        );
    }

    return { success: true, Salvage_ID: salvageId };
}

// Record material recovery
function recordRecovery(data) {
    const db = getDb();
    const recoveryId = data.Recovery_ID || `RCV-${Date.now().toString().slice(-6)}`;

    db.prepare(`
        INSERT INTO RECOVERY (Recovery_ID, Recycling_Event_ID, Material_ID, Recovery_Date, Quantity, Unit, Purity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        recoveryId,
        data.Recycling_Event_ID,
        data.Material_ID,
        data.Recovery_Date || new Date().toISOString().split('T')[0],
        parseFloat(data.Quantity),
        data.Unit || 'g',
        parseFloat(data.Purity || 98.0)
    );

    // Find product id
    const evt = db.prepare(`SELECT Product_ID, Recycling_Facility_ID FROM RECYCLING_EVENT WHERE Recycling_Event_ID = ?`).get(data.Recycling_Event_ID);
    const mat = db.prepare(`SELECT Name FROM MATERIAL WHERE Material_ID = ?`).get(data.Material_ID);

    if (evt && mat) {
        db.prepare(`
            INSERT INTO LIFECYCLE_EVENT (Event_ID, Product_ID, Stage, Event_Type, Event_Date, Stakeholder_ID, Title, Description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            `EVT-${Date.now().toString().slice(-8)}`,
            evt.Product_ID,
            'End-of-Life Recycling',
            'Raw Material Recovered',
            data.Recovery_Date || new Date().toISOString().split('T')[0],
            evt.Recycling_Facility_ID,
            `Material Extraction: ${mat.Name}`,
            `Extracted ${data.Quantity}${data.Unit || 'g'} of ${mat.Name} at ${data.Purity || 98}% purity for circular remanufacturing.`
        );
    }

    return { success: true, Recovery_ID: recoveryId };
}

// Run custom SQL query (for academic demonstration & live query runner)
function runCustomQuery(sqlQuery) {
    const db = getDb();
    const trimmed = sqlQuery.trim();
    
    // Only allow SELECT queries for live reader or execute scripts if specified
    const isSelect = /^SELECT\b/i.test(trimmed) || /^WITH\b/i.test(trimmed) || /^PRAGMA\b/i.test(trimmed) || /^EXPLAIN\b/i.test(trimmed);
    
    if (isSelect) {
        const rows = db.prepare(trimmed).all();
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return {
            success: true,
            isSelect: true,
            rowCount: rows.length,
            columns,
            rows
        };
    } else {
        // Execute DDL or DML
        db.exec(trimmed);
        return {
            success: true,
            isSelect: false,
            message: 'Query executed successfully.'
        };
    }
}

module.exports = {
    getDb,
    resetDatabase,
    getProducts,
    getProductPassport,
    getSummaryStats,
    getModels,
    getStakeholders,
    createProductModel,
    createProductItem,
    recordRepair,
    recordTransfer,
    recordRecyclingIntake,
    recordSalvage,
    recordRecovery,
    runCustomQuery
};
