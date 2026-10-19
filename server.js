// ============================================================================
// DIGITAL PRODUCT PASSPORT (DPP) - EXPRESS BACKEND API SERVER
// Course: BACSE202 - Database Systems | Vellore Institute of Technology (VIT)
// Team: Aditya Priyan C (25BCE0662), Amaan Abdullah Karuthedath (25BCE2701)
// Faculty Guide: Prof. Saritha Murali
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure DB is initialized
db.getDb();

// 1. Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        system: 'Digital Product Passport (DPP) E-Waste Traceability System',
        institution: 'Vellore Institute of Technology (VIT)',
        course: 'BACSE202 - Database Systems',
        team: ['Aditya Priyan C (25BCE0662)', 'Amaan Abdullah Karuthedath (25BCE2701)'],
        guide: 'Prof. Saritha Murali',
        timestamp: new Date().toISOString()
    });
});

// 2. Dashboard summary statistics
app.get('/api/summary', (req, res) => {
    try {
        const stats = db.getSummaryStats();
        res.json(stats);
    } catch (err) {
        console.error('Error fetching summary:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Products list with filters
app.get('/api/products', (req, res) => {
    try {
        const filters = {
            search: req.query.search,
            category: req.query.category,
            status: req.query.status
        };
        const products = db.getProducts(filters);
        res.json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Single Product Passport with QR Code
app.get('/api/products/:productId', async (req, res) => {
    try {
        const passport = db.getProductPassport(req.params.productId);
        if (!passport) {
            return res.status(404).json({ error: `Product with ID '${req.params.productId}' not found in the Digital Product Passport registry.` });
        }

        // Generate high-resolution scannable QR Code Data URL
        // In local mode, points to item lookup payload
        const qrPayload = JSON.stringify({
            dppVersion: '1.0',
            productId: passport.Product_ID,
            serialNumber: passport.Serial_Number,
            model: passport.Model_Name,
            manufacturer: passport.Manufacturer_Name,
            status: passport.Status,
            url: `http://localhost:${PORT}/#passport/${passport.Product_ID}`
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 250,
            color: {
                dark: '#0f172a',
                light: '#ffffff'
            }
        });

        res.json({
            ...passport,
            qrCode: qrCodeDataUrl
        });
    } catch (err) {
        console.error('Error fetching passport:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Product Models List
app.get('/api/models', (req, res) => {
    try {
        const models = db.getModels();
        res.json(models);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Stakeholders List
app.get('/api/stakeholders', (req, res) => {
    try {
        const type = req.query.type;
        const stakeholders = db.getStakeholders(type);
        res.json(stakeholders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Register Product Model (Manufacturer Action)
app.post('/api/models', (req, res) => {
    try {
        const { Manufacturer_ID, Model_Number, Name, Product_Type, Energy_Rating, Carbon_Footprint, Disassembly_Manual_URL } = req.body;
        if (!Manufacturer_ID || !Model_Number || !Name || !Product_Type) {
            return res.status(400).json({ error: 'Manufacturer, Model Number, Name, and Product Type are required.' });
        }
        const result = db.createProductModel(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Register Physical Product Item (Manufacturer Action)
app.post('/api/products', (req, res) => {
    try {
        const { Model_ID, Serial_Number, Manufacturing_Date, Current_Owner_ID } = req.body;
        if (!Model_ID || !Serial_Number) {
            return res.status(400).json({ error: 'Model and Serial Number are required.' });
        }
        const result = db.createProductItem(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Record Repair (Service Centre Action)
app.post('/api/repairs', (req, res) => {
    try {
        const { Product_ID, Service_Centre_ID, Description, Repair_Cost } = req.body;
        if (!Product_ID || !Service_Centre_ID || !Description) {
            return res.status(400).json({ error: 'Product ID, Service Centre, and Description are required.' });
        }
        const result = db.recordRepair(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. Record Ownership Transfer (Owner Action)
app.post('/api/transfers', (req, res) => {
    try {
        const { Product_ID, New_Owner_ID } = req.body;
        if (!Product_ID || !New_Owner_ID) {
            return res.status(400).json({ error: 'Product ID and New Owner ID are required.' });
        }
        const result = db.recordTransfer(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 11. Record Recycling Intake (Recycling Facility Action)
app.post('/api/recycling/intake', (req, res) => {
    try {
        const { Product_ID, Recycling_Facility_ID } = req.body;
        if (!Product_ID || !Recycling_Facility_ID) {
            return res.status(400).json({ error: 'Product ID and Recycling Facility ID are required.' });
        }
        const result = db.recordRecyclingIntake(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 12. Record Salvage of Component (Recycling Facility Action)
app.post('/api/recycling/salvage', (req, res) => {
    try {
        const { Recycling_Event_ID, Component_ID, Condition_Grade } = req.body;
        if (!Recycling_Event_ID || !Component_ID) {
            return res.status(400).json({ error: 'Recycling Event ID and Component ID are required.' });
        }
        const result = db.recordSalvage(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 13. Record Material Recovery (Recycling Facility Action)
app.post('/api/recycling/recovery', (req, res) => {
    try {
        const { Recycling_Event_ID, Material_ID, Quantity } = req.body;
        if (!Recycling_Event_ID || !Material_ID || !Quantity) {
            return res.status(400).json({ error: 'Recycling Event ID, Material ID, and Quantity are required.' });
        }
        const result = db.recordRecovery(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 14. Interactive SQL Console Runner
app.post('/api/sql/query', (req, res) => {
    try {
        const { sql } = req.body;
        if (!sql || !sql.trim()) {
            return res.status(400).json({ error: 'SQL query cannot be empty.' });
        }
        const result = db.runCustomQuery(sql);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 15. Export Database Schema & Data as standard SQL file
app.get('/api/sql/export', (req, res) => {
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
        const fullDump = `-- DIGITAL PRODUCT PASSPORT (DPP) EXPORT\n-- Generated on: ${new Date().toISOString()}\n\n${schema}\n\n${seed}`;
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="dpp_database_export.sql"');
        res.send(fullDump);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 16. Reset Database to Initial Seed State
app.post('/api/reset', (req, res) => {
    try {
        const result = db.resetDatabase();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback to SPA index.html for non-API routes
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 DPP E-Waste Traceability System running at http://localhost:${PORT}`);
    console.log(`📚 Course: BACSE202 - Database Systems | VIT University`);
    console.log(`👨‍💻 Team: Aditya Priyan C (25BCE0662) & Amaan Abdullah (25BCE2701)`);
    console.log(`👩‍🏫 Faculty Guide: Prof. Saritha Murali`);
    console.log(`================================================================`);
});
