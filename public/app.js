// ============================================================================
// DIGITAL PRODUCT PASSPORT (DPP) - FRONTEND INTERACTION CONTROLLER
// Course: BACSE202 - Database Systems | Vellore Institute of Technology (VIT)
// Team: Aditya Priyan C (25BCE0662), Amaan Abdullah Karuthedath (25BCE2701)
// Faculty Guide: Prof. Saritha Murali
// ============================================================================

let currentProducts = [];
let materialsChartInstance = null;
let statusChartInstance = null;
let debounceTimer = null;

// Preset SQL queries for Course BACSE202 academic demonstration
const SQL_PRESETS = {
    dpp_join: `-- Query 1: Complete Digital Product Passport Multi-Table Relational JOIN
-- Combines Product Item, Model Specifications, Manufacturer, and Current Owner
SELECT 
    p.Product_ID,
    p.Serial_Number,
    p.Status AS Lifecycle_Status,
    p.State_of_Health AS SOH_Percentage,
    m.Name AS Model_Name,
    m.Product_Type,
    m.Energy_Rating,
    m.Carbon_Footprint,
    mfg_s.Name AS Manufacturer_Company,
    mfg.Country_of_Origin,
    IFNULL(own_s.Name, 'None (At Facility)') AS Current_Owner,
    IFNULL(own.Owner_Type, 'N/A') AS Owner_Category
FROM PRODUCT_ITEM p
JOIN PRODUCT_MODEL m ON p.Model_ID = m.Model_ID
JOIN MANUFACTURER mfg ON m.Manufacturer_ID = mfg.Stakeholder_ID
JOIN STAKEHOLDER mfg_s ON mfg.Stakeholder_ID = mfg_s.Stakeholder_ID
LEFT JOIN OWNER own ON p.Current_Owner_ID = own.Stakeholder_ID
LEFT JOIN STAKEHOLDER own_s ON own.Stakeholder_ID = own_s.Stakeholder_ID
ORDER BY p.Product_ID;`,

    bom_audit: `-- Query 2: Bill of Materials (BoM) & Hazardous Substance Compliance Audit
-- Inspects components and chemical materials inside Lenovo LOQ 15 units
SELECT 
    p.Product_ID,
    c.Component_ID,
    c.Component_Type,
    m.Name AS Material_Name,
    cm.Quantity,
    cm.Unit,
    m.Recyclability AS Recyclability_Pct,
    CASE WHEN m.Hazardous = 1 THEN '⚠️ HAZARDOUS' ELSE 'SAFE' END AS Hazard_Status,
    CASE WHEN m.RoHS_REACH_Compliant = 1 THEN 'COMPLIANT' ELSE 'NON-COMPLIANT' END AS RoHS_Compliance
FROM PRODUCT_ITEM p
JOIN COMPONENT c ON p.Product_ID = c.Product_ID
JOIN COMPONENT_MATERIAL cm ON c.Component_ID = cm.Component_ID
JOIN MATERIAL m ON cm.Material_ID = m.Material_ID
WHERE p.Model_ID = 'MOD-LEN-LOQ15'
ORDER BY p.Product_ID, m.Hazardous DESC, cm.Quantity DESC;`,

    repairs_cost: `-- Query 3: Maintenance & Servicing Frequency and Cost per Product Model
-- Aggregates repair counts and total expenditure across service hubs
SELECT 
    m.Model_ID,
    m.Name AS Model_Name,
    COUNT(r.Repair_ID) AS Total_Repairs_Logged,
    ROUND(SUM(r.Repair_Cost), 2) AS Total_Maintenance_Cost_INR,
    ROUND(AVG(r.Repair_Cost), 2) AS Avg_Repair_Cost_INR
FROM PRODUCT_MODEL m
JOIN PRODUCT_ITEM p ON m.Model_ID = p.Model_ID
JOIN REPAIR r ON p.Product_ID = r.Product_ID
GROUP BY m.Model_ID, m.Name
ORDER BY Total_Maintenance_Cost_INR DESC;`,

    materials_recovered: `-- Query 4: Strategic Raw Materials Recovered by Recycling Facility
-- Demonstrates reverse logistics circular yield (SDG 12 & SDG 9)
SELECT 
    rf_s.Name AS Recycling_Facility,
    rf.Environmental_Permit_ID,
    m.Name AS Material_Extracted,
    ROUND(SUM(rcv.Quantity), 2) AS Total_Extracted_Quantity,
    rcv.Unit,
    ROUND(AVG(rcv.Purity), 2) AS Avg_Purity_Percentage
FROM RECYCLING_EVENT re
JOIN RECYCLING_FACILITY rf ON re.Recycling_Facility_ID = rf.Stakeholder_ID
JOIN STAKEHOLDER rf_s ON rf.Stakeholder_ID = rf_s.Stakeholder_ID
JOIN RECOVERY rcv ON re.Recycling_Event_ID = rcv.Recycling_Event_ID
JOIN MATERIAL m ON rcv.Material_ID = m.Material_ID
GROUP BY rf_s.Name, m.Name, rcv.Unit
ORDER BY Total_Extracted_Quantity DESC;`,

    circularity_index: `-- Query 5: Product Lifecycle Distribution & Average Health per Category
SELECT 
    m.Product_Type,
    COUNT(p.Product_ID) AS Total_Units,
    SUM(CASE WHEN p.Status = 'In Use' THEN 1 ELSE 0 END) AS Active_In_Use,
    SUM(CASE WHEN p.Status = 'Under Repair' THEN 1 ELSE 0 END) AS Under_Repair,
    SUM(CASE WHEN p.Status = 'Recycled' THEN 1 ELSE 0 END) AS End_Of_Life_Recycled,
    ROUND(AVG(p.State_of_Health), 1) AS Average_State_of_Health
FROM PRODUCT_MODEL m
JOIN PRODUCT_ITEM p ON m.Model_ID = p.Model_ID
GROUP BY m.Product_Type
ORDER BY Total_Units DESC;`
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupHashRouting();
    await loadCatalogue();
    await populateDropdowns();
    await loadSummaryAnalytics();
    
    // Set default SQL query
    setQueryPreset('dpp_join');

    // Handle initial route or default to catalogue
    const hash = window.location.hash.slice(1);
    if (hash.startsWith('passport/')) {
        const id = hash.replace('passport/', '');
        switchTab('passport');
        loadPassport(id);
    } else if (hash.startsWith('timeline/')) {
        const id = hash.replace('timeline/', '');
        switchTab('timeline');
        loadTimeline(id);
    } else {
        switchTab('catalogue');
    }
}

// ----------------------------------------------------------------------------
// ROUTING & TAB NAVIGATION
// ----------------------------------------------------------------------------
function setupHashRouting() {
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.slice(1);
        if (hash.startsWith('passport/')) {
            const id = hash.replace('passport/', '');
            switchTab('passport');
            loadPassport(id);
        } else if (hash.startsWith('timeline/')) {
            const id = hash.replace('timeline/', '');
            switchTab('timeline');
            loadTimeline(id);
        } else if (hash) {
            switchTab(hash);
        }
    });
}

function switchTab(tabId) {
    const tabs = ['catalogue', 'passport', 'timeline', 'admin', 'analytics', 'sqlstudio'];
    tabs.forEach(t => {
        const content = document.getElementById(`tab-${t}`);
        const btn = document.getElementById(`tab-btn-${t}`);
        if (content) content.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    });

    const activeContent = document.getElementById(`tab-${tabId}`);
    const activeBtn = document.getElementById(`tab-btn-${tabId}`);
    if (activeContent) activeContent.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'analytics') {
        loadSummaryAnalytics();
    }
}

function switchAdminSubtab(subId) {
    const subs = ['mfg', 'service', 'owner', 'recycle'];
    subs.forEach(s => {
        const panel = document.getElementById(`admin-panel-${s}`);
        const btn = document.getElementById(`admin-sub-${s}`);
        if (panel) panel.classList.add('hidden');
        if (btn) {
            btn.classList.remove('active', 'bg-emerald-600', 'text-white');
            btn.classList.add('bg-slate-800', 'text-slate-300');
        }
    });

    const activePanel = document.getElementById(`admin-panel-${subId}`);
    const activeBtn = document.getElementById(`admin-sub-${subId}`);
    if (activePanel) activePanel.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-emerald-600', 'text-white');
        activeBtn.classList.remove('bg-slate-800', 'text-slate-300');
    }
}

// ----------------------------------------------------------------------------
// PRODUCT CATALOGUE
// ----------------------------------------------------------------------------
async function loadCatalogue() {
    const grid = document.getElementById('productsGrid');
    try {
        const search = document.getElementById('catalogueSearchInput')?.value || '';
        const category = document.getElementById('catalogueCategoryFilter')?.value || 'all';
        const status = document.getElementById('catalogueStatusFilter')?.value || 'all';

        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (category && category !== 'all') params.append('category', category);
        if (status && status !== 'all') params.append('status', status);

        const res = await fetch(`/api/products?${params.toString()}`);
        const products = await res.json();
        currentProducts = products;

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <i class="fa-solid fa-box-open text-3xl mb-2 text-slate-600"></i>
                    <p class="text-sm">No electronic items found matching your filters.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(p => {
            // Category icon
            let catIcon = 'fa-laptop';
            if (p.Product_Type === 'Smartphone') catIcon = 'fa-mobile-screen';
            else if (p.Product_Type === 'Monitor') catIcon = 'fa-display';
            else if (p.Product_Type === 'Tablet') catIcon = 'fa-tablet-screen-button';

            // Status Badge
            let statusBadge = '<span class="px-2 py-0.5 text-[11px] rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80 font-medium"><i class="fa-solid fa-circle-check text-[9px] mr-1"></i> In Use</span>';
            if (p.Status === 'Under Repair') {
                statusBadge = '<span class="px-2 py-0.5 text-[11px] rounded-full bg-amber-950 text-amber-400 border border-amber-800/80 font-medium"><i class="fa-solid fa-wrench text-[9px] mr-1"></i> Under Repair</span>';
            } else if (p.Status === 'Recycled') {
                statusBadge = '<span class="px-2 py-0.5 text-[11px] rounded-full bg-sky-950 text-sky-400 border border-sky-800/80 font-medium"><i class="fa-solid fa-recycle text-[9px] mr-1"></i> Recycled</span>';
            }

            // Health color
            let healthColor = 'text-emerald-400';
            if (p.State_of_Health < 80) healthColor = 'text-amber-400';
            if (p.State_of_Health === 0) healthColor = 'text-slate-500';

            return `
                <div class="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 shadow-lg transition duration-200 flex flex-col justify-between group">
                    <div>
                        <!-- Header -->
                        <div class="flex items-start justify-between gap-2 mb-3">
                            <div class="flex items-center space-x-2.5">
                                <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-300 group-hover:text-emerald-400 transition">
                                    <i class="fa-solid ${catIcon}"></i>
                                </div>
                                <div>
                                    <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-500">${p.Product_Type}</span>
                                    <h3 class="text-sm font-bold text-white leading-tight">${p.Model_Name}</h3>
                                </div>
                            </div>
                            ${statusBadge}
                        </div>

                        <!-- Identifiers -->
                        <div class="bg-slate-950 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-xs font-mono mb-4">
                            <div class="flex justify-between items-center">
                                <span class="text-slate-500 text-[11px]">Product ID:</span>
                                <span class="text-emerald-400 font-bold">${p.Product_ID}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-slate-500 text-[11px]">Serial No:</span>
                                <span class="text-slate-300">${p.Serial_Number}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-slate-500 text-[11px]">Model No:</span>
                                <span class="text-slate-400">${p.Model_Number}</span>
                            </div>
                        </div>

                        <!-- Specs list -->
                        <div class="space-y-1.5 text-xs text-slate-400 mb-4">
                            <div class="flex justify-between">
                                <span class="flex items-center gap-1.5"><i class="fa-solid fa-industry text-[11px] text-slate-500"></i> Maker:</span>
                                <span class="text-slate-200 font-medium">${p.Manufacturer_Name} (${p.Country_of_Origin})</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="flex items-center gap-1.5"><i class="fa-solid fa-user text-[11px] text-slate-500"></i> Owner:</span>
                                <span class="text-slate-200">${p.Owner_Name || '<span class="text-slate-500">Recycling Hub</span>'}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="flex items-center gap-1.5"><i class="fa-solid fa-leaf text-[11px] text-emerald-500/70"></i> Carbon:</span>
                                <span class="text-slate-300">${p.Carbon_Footprint} kg CO2e</span>
                            </div>
                        </div>

                        <!-- State of health bar -->
                        <div class="mb-4">
                            <div class="flex justify-between text-[11px] mb-1">
                                <span class="text-slate-500">State of Health (SOH)</span>
                                <span class="font-bold ${healthColor}">${p.State_of_Health}%</span>
                            </div>
                            <div class="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full" style="width: ${p.State_of_Health}%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer Action Buttons -->
                    <div class="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                        <button onclick="loadPassport('${p.Product_ID}')" class="flex-1 bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm">
                            <i class="fa-solid fa-passport text-[11px]"></i>
                            <span>View Passport</span>
                        </button>
                        <button onclick="loadTimeline('${p.Product_ID}')" title="Lifecycle Timeline" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 px-3 rounded-xl border border-slate-700 transition">
                            <i class="fa-solid fa-timeline"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading catalogue:', err);
        grid.innerHTML = `<div class="col-span-full py-8 text-center text-red-400">Failed to load product catalogue.</div>`;
    }
}

function debounceFilterProducts() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        loadCatalogue();
    }, 250);
}

function filterProducts() {
    loadCatalogue();
}

// ----------------------------------------------------------------------------
// DIGITAL PRODUCT PASSPORT (DPP) VIEWER
// ----------------------------------------------------------------------------
async function handleGlobalSearch() {
    const input = document.getElementById('globalSearchInput');
    const val = input.value.trim();
    if (!val) return;
    loadPassport(val);
}

function handlePassportLookup() {
    const input = document.getElementById('passportIdInput');
    const val = input.value.trim();
    if (!val) return;
    loadPassport(val);
}

async function loadPassport(productId) {
    switchTab('passport');
    const container = document.getElementById('passportDetailsContainer');
    document.getElementById('passportIdInput').value = productId;
    window.location.hash = `passport/${productId}`;

    container.innerHTML = `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-emerald-500 mb-3"></i>
            <p>Querying relational SQL database for Passport <span class="font-mono text-emerald-400 font-bold">${productId}</span>...</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Product passport not found.');
        }
        const data = await res.json();
        renderPassport(data);
    } catch (err) {
        container.innerHTML = `
            <div class="bg-red-950/40 border border-red-800/80 rounded-2xl p-8 text-center text-red-300">
                <i class="fa-solid fa-triangle-exclamation text-3xl text-red-400 mb-2"></i>
                <h3 class="text-base font-bold text-white">Item Passport Lookup Failed</h3>
                <p class="text-xs text-red-400 mt-1 max-w-md mx-auto">${err.message}</p>
                <div class="mt-4 flex justify-center gap-2">
                    <button onclick="loadPassport('PROD-LOQ-001')" class="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg border border-slate-700">
                        Try Sample LOQ-001
                    </button>
                    <button onclick="switchTab('catalogue')" class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg">
                        Back to Catalogue
                    </button>
                </div>
            </div>
        `;
    }
}

function renderPassport(dpp) {
    const container = document.getElementById('passportDetailsContainer');

    // Status styling
    let statusClass = "bg-emerald-950 text-emerald-400 border-emerald-800";
    if (dpp.Status === 'Under Repair') statusClass = "bg-amber-950 text-amber-400 border-amber-800";
    if (dpp.Status === 'Recycled') statusClass = "bg-sky-950 text-sky-400 border-sky-800";

    container.innerHTML = `
        <div class="space-y-6">
            
            <!-- TOP HERO CARD: IDENTITY & LIVE SCANNABLE QR CODE -->
            <div class="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div class="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                    <div class="space-y-3 flex-1">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                                <i class="fa-solid fa-id-badge mr-1"></i> Certified Digital Product Passport
                            </span>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusClass}">
                                ${dpp.Status}
                            </span>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                SOH: ${dpp.State_of_Health}%
                            </span>
                        </div>

                        <div>
                            <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">${dpp.Model_Name}</h1>
                            <p class="text-sm text-slate-400 mt-0.5">Model Number: <span class="font-mono text-slate-300">${dpp.Model_Number}</span> • Category: <span class="text-emerald-400">${dpp.Product_Type}</span></p>
                        </div>

                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                            <div class="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                                <span class="text-slate-500 block text-[11px]">Unique Product ID</span>
                                <span class="font-mono text-emerald-400 font-bold">${dpp.Product_ID}</span>
                            </div>
                            <div class="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                                <span class="text-slate-500 block text-[11px]">Hardware Serial No</span>
                                <span class="font-mono text-slate-200">${dpp.Serial_Number}</span>
                            </div>
                            <div class="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                                <span class="text-slate-500 block text-[11px]">Manufacturing Date</span>
                                <span class="text-slate-200">${dpp.Manufacturing_Date}</span>
                            </div>
                            <div class="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                                <span class="text-slate-500 block text-[11px]">Carbon Footprint</span>
                                <span class="text-slate-200 font-semibold">${dpp.Carbon_Footprint} kg CO2e</span>
                            </div>
                        </div>
                    </div>

                    <!-- Scannable High-Res QR Code Card -->
                    <div class="bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center justify-center text-center self-center lg:self-auto min-w-[200px]">
                        <img src="${dpp.qrCode}" alt="Product Passport QR Code" class="w-40 h-40 object-contain rounded-lg">
                        <div class="mt-2 text-slate-900 text-[11px] font-mono font-bold">${dpp.Product_ID}</div>
                        <span class="text-[10px] text-slate-500">Scan to verify passport</span>
                    </div>
                </div>
            </div>

            <!-- TWO COLUMN: MANUFACTURER & CURRENT CUSTODY DETAILS -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <!-- Manufacturer Details Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div class="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-800">
                        <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-emerald-400">
                            <i class="fa-solid fa-industry"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-white">Manufacturer & Eco-Design Standards</h3>
                            <p class="text-xs text-slate-400">Primary manufacturing stakeholder entity</p>
                        </div>
                    </div>

                    <div class="space-y-2 text-xs">
                        <div class="flex justify-between py-1 border-b border-slate-800/50">
                            <span class="text-slate-500">Company Name</span>
                            <span class="text-white font-medium">${dpp.Manufacturer_Name}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-slate-800/50">
                            <span class="text-slate-500">Country of Origin</span>
                            <span class="text-white">${dpp.Country_of_Origin}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-slate-800/50">
                            <span class="text-slate-500">Corporate Reg Number</span>
                            <span class="font-mono text-slate-300">${dpp.Manufacturer_Reg_No}</span>
                        </div>
                        <div class="flex justify-between py-1 border-b border-slate-800/50">
                            <span class="text-slate-500">Energy Star / Eco Label</span>
                            <span class="text-emerald-400 font-medium">${dpp.Energy_Rating}</span>
                        </div>
                        <div class="flex justify-between py-1 items-center">
                            <span class="text-slate-500">Disassembly Manual</span>
                            <a href="${dpp.Disassembly_Manual_URL}" target="_blank" class="text-emerald-400 hover:text-emerald-300 underline font-mono text-[11px] flex items-center gap-1">
                                <i class="fa-solid fa-file-pdf"></i> View Guide
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Current Ownership / Custody Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                    <div class="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-800">
                        <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-teal-400">
                            <i class="fa-solid fa-user-check"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-white">Current Custody & Ownership</h3>
                            <p class="text-xs text-slate-400">Recorded stakeholder holding legal possession</p>
                        </div>
                    </div>

                    ${dpp.Current_Owner_Name ? `
                        <div class="space-y-2 text-xs">
                            <div class="flex justify-between py-1 border-b border-slate-800/50">
                                <span class="text-slate-500">Registered Owner</span>
                                <span class="text-white font-medium">${dpp.Current_Owner_Name}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-slate-800/50">
                                <span class="text-slate-500">Owner Category</span>
                                <span class="text-teal-400">${dpp.Current_Owner_Type}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-slate-800/50">
                                <span class="text-slate-500">Contact Email</span>
                                <span class="text-slate-300 font-mono">${dpp.Current_Owner_Email || 'N/A'}</span>
                            </div>
                            <div class="flex justify-between py-1">
                                <span class="text-slate-500">Registered Location</span>
                                <span class="text-slate-300 text-right max-w-[200px] truncate">${dpp.Current_Owner_Address || 'N/A'}</span>
                            </div>
                        </div>
                    ` : `
                        <div class="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                            <i class="fa-solid fa-recycle text-emerald-400 text-xl mb-1"></i>
                            <p class="font-medium text-white">Device Relinquished to E-Waste Facility</p>
                            <p class="text-[11px] text-slate-500 mt-1">Product is currently decommissioned for material extraction.</p>
                        </div>
                    `}
                </div>

            </div>

            <!-- HARDWARE COMPONENTS HIERARCHICAL BREAKDOWN -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-purple-400">
                            <i class="fa-solid fa-microchip"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-white">Modular Component Tree</h3>
                            <p class="text-xs text-slate-400">Serialized hardware sub-assemblies inside this unit</p>
                        </div>
                    </div>
                    <span class="text-xs px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                        ${dpp.components.length} Monitored Parts
                    </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    ${dpp.components.map(c => {
                        let statusColor = "bg-emerald-950 text-emerald-400 border-emerald-800";
                        if (c.Status === 'Replaced') statusColor = "bg-amber-950 text-amber-400 border-amber-800";
                        if (c.Status === 'Salvaged') statusColor = "bg-purple-950 text-purple-400 border-purple-800";
                        if (c.Status === 'Recycled') statusColor = "bg-sky-950 text-sky-400 border-sky-800";

                        return `
                            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                                <div>
                                    <div class="flex justify-between items-start mb-1.5">
                                        <span class="text-xs font-bold text-white">${c.Component_Type}</span>
                                        <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold border ${statusColor}">${c.Status}</span>
                                    </div>
                                    <div class="text-[11px] font-mono text-slate-500">ID: ${c.Component_ID}</div>
                                    <div class="text-[11px] font-mono text-slate-400">S/N: ${c.Serial_Number}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- BILL OF MATERIALS (BOM) & RECYCLABILITY -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-teal-400">
                            <i class="fa-solid fa-dna"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-white">Bill of Materials (BoM) & Circularity Profile</h3>
                            <p class="text-xs text-slate-400">Chemical material composition, weight distribution, and hazard status</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-3 text-xs">
                        <div class="px-3 py-1 bg-slate-950 rounded-xl border border-slate-800">
                            <span class="text-slate-500">Circularity Potential:</span>
                            <span class="font-bold text-emerald-400 ml-1">${dpp.circularityScore}%</span>
                        </div>
                        <div class="px-3 py-1 bg-slate-950 rounded-xl border border-slate-800">
                            <span class="text-slate-500">Hazardous Flags:</span>
                            <span class="font-bold ${dpp.totalHazardousCount > 0 ? 'text-amber-400' : 'text-emerald-400'} ml-1">${dpp.totalHazardousCount}</span>
                        </div>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-xs text-left">
                        <thead class="text-slate-500 border-b border-slate-800 uppercase font-semibold text-[11px]">
                            <tr>
                                <th class="py-2 px-3">Material</th>
                                <th class="py-2 px-3">Total Quantity</th>
                                <th class="py-2 px-3">Recyclability</th>
                                <th class="py-2 px-3">Hazard Flag</th>
                                <th class="py-2 px-3">RoHS / REACH</th>
                                <th class="py-2 px-3">Utilized In Subsystems</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/60 text-slate-300">
                            ${dpp.billOfMaterials.map(m => `
                                <tr class="hover:bg-slate-950/40">
                                    <td class="py-2.5 px-3 font-medium text-white">${m.name}</td>
                                    <td class="py-2.5 px-3 font-mono">${m.totalQuantityGrams} g</td>
                                    <td class="py-2.5 px-3">
                                        <span class="font-semibold text-emerald-400">${m.recyclability}%</span>
                                    </td>
                                    <td class="py-2.5 px-3">
                                        ${m.hazardous ? '<span class="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-400 border border-red-800 font-bold">HAZARDOUS</span>' : '<span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-900">SAFE</span>'}
                                    </td>
                                    <td class="py-2.5 px-3">
                                        ${m.rohsCompliant ? '<span class="text-emerald-400"><i class="fa-solid fa-check mr-1"></i>Compliant</span>' : '<span class="text-amber-400"><i class="fa-solid fa-xmark mr-1"></i>Restricted</span>'}
                                    </td>
                                    <td class="py-2.5 px-3 text-slate-400 text-[11px]">${m.usedInComponents.join(', ')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- MAINTENANCE & REPAIR HISTORY -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div class="flex items-center space-x-3 mb-4 pb-3 border-b border-slate-800">
                    <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400">
                        <i class="fa-solid fa-screwdriver-wrench"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-white">Maintenance, Servicing & Part Replacement Logs</h3>
                        <p class="text-xs text-slate-400">Verified service history from authorized repair centres</p>
                    </div>
                </div>

                ${dpp.repairs.length > 0 ? `
                    <div class="space-y-3">
                        ${dpp.repairs.map(r => `
                            <div class="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div class="flex items-center space-x-2">
                                        <span class="font-bold text-white">${r.Service_Centre_Name}</span>
                                        <span class="text-[11px] text-slate-500 font-mono">(${r.License_Number})</span>
                                    </div>
                                    <div class="flex items-center space-x-3">
                                        <span class="text-emerald-400 font-semibold">Cost: ₹${r.Repair_Cost}</span>
                                        <span class="text-slate-400">${r.Repair_Date}</span>
                                    </div>
                                </div>
                                <p class="text-slate-300 mb-2">${r.Description}</p>
                                <div class="text-[11px] text-slate-500">
                                    <strong class="text-slate-400">Replaced Parts:</strong> <span class="font-mono text-amber-300">${r.Replace_Parts || 'None'}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="text-center py-6 text-xs text-slate-500">
                        <i class="fa-solid fa-shield-halved text-2xl mb-1 text-slate-600"></i>
                        <p>No repair actions logged. All factory components in original operational condition.</p>
                    </div>
                `}
            </div>

            <!-- END OF LIFE RECYCLING & MATERIAL RECOVERY (IF RECYCLED) -->
            ${dpp.recyclingEvent ? `
                <div class="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-700/60 rounded-2xl p-6 shadow-xl">
                    <div class="flex items-center justify-between mb-4 pb-3 border-b border-emerald-800/40">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-600/60 flex items-center justify-center text-emerald-300">
                                <i class="fa-solid fa-recycle text-xl"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-bold text-white">End-of-Life Decommissioning & Material Recovery Certificate</h3>
                                <p class="text-xs text-emerald-300">Processed by ${dpp.recyclingEvent.Recycling_Facility_Name}</p>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 text-xs rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-600 font-mono">
                            Permit: ${dpp.recyclingEvent.Environmental_Permit_ID}
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
                        <div class="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                            <div class="text-slate-500 mb-1 font-semibold uppercase text-[10px]">Processing Facility</div>
                            <div class="text-white font-medium">${dpp.recyclingEvent.Recycling_Facility_Name}</div>
                            <div class="text-slate-400 text-[11px] mt-0.5">Capacity: ${dpp.recyclingEvent.Processing_Capacity}</div>
                            <div class="text-slate-400 text-[11px]">Intake Date: ${dpp.recyclingEvent.Intake_Date}</div>
                        </div>

                        <div class="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                            <div class="text-slate-500 mb-1 font-semibold uppercase text-[10px]">Decommission Outcome</div>
                            <div class="text-emerald-400 font-medium">${dpp.recyclingEvent.Decommission_Status}</div>
                            <p class="text-slate-300 text-[11px] mt-0.5">${dpp.recyclingEvent.Notes}</p>
                        </div>
                    </div>

                    <!-- Salvaged Reusable Parts -->
                    <div class="mb-4">
                        <h4 class="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                            <i class="fa-solid fa-microchip text-purple-400"></i>
                            <span>Salvaged Components (Diverted for Secondary Reuse)</span>
                        </h4>
                        ${dpp.recyclingEvent.salvages.length > 0 ? `
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                ${dpp.recyclingEvent.salvages.map(s => `
                                    <div class="p-2.5 bg-slate-950/80 rounded-xl border border-purple-900/60 flex justify-between items-center">
                                        <div>
                                            <div class="font-bold text-white">${s.Component_Type}</div>
                                            <div class="text-[11px] font-mono text-slate-400">ID: ${s.Component_ID}</div>
                                        </div>
                                        <span class="px-2 py-0.5 rounded text-[10px] bg-purple-900/60 text-purple-200 border border-purple-700 font-semibold">${s.Condition_Grade}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `<p class="text-xs text-slate-500">No components salvaged from this unit.</p>`}
                    </div>

                    <!-- Recovered Raw Materials -->
                    <div>
                        <h4 class="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                            <i class="fa-solid fa-gem text-teal-400"></i>
                            <span>Extracted Raw Materials for Circular Remanufacturing</span>
                        </h4>
                        ${dpp.recyclingEvent.recoveries.length > 0 ? `
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                                ${dpp.recyclingEvent.recoveries.map(r => `
                                    <div class="p-2.5 bg-slate-950/90 rounded-xl border border-emerald-900/60 text-center">
                                        <div class="text-slate-400 text-[11px] font-sans truncate">${r.Material_Name}</div>
                                        <div class="text-emerald-400 text-sm font-bold mt-0.5">${r.Quantity} ${r.Unit}</div>
                                        <div class="text-[10px] text-slate-500">Purity: ${r.Purity}%</div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `<p class="text-xs text-slate-500">Recovery extraction records in progress.</p>`}
                    </div>
                </div>
            ` : ''}

        </div>
    `;
}

function printPassport() {
    window.print();
}

// ----------------------------------------------------------------------------
// LIFECYCLE TIMELINE TRACE
// ----------------------------------------------------------------------------
async function loadTimelineForSelected() {
    const sel = document.getElementById('timelineProductSelect');
    if (!sel || !sel.value) return;
    loadTimeline(sel.value);
}

async function loadTimeline(productId) {
    switchTab('timeline');
    window.location.hash = `timeline/${productId}`;
    const container = document.getElementById('timelineContainer');
    
    // Update select dropdown value if present
    const sel = document.getElementById('timelineProductSelect');
    if (sel && sel.value !== productId) {
        sel.value = productId;
    }

    container.innerHTML = `
        <div class="py-12 text-center text-slate-400">
            <i class="fa-solid fa-circle-notch fa-spin text-2xl text-emerald-500 mb-2"></i>
            <p class="text-xs">Loading chronological custody events for ${productId}...</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();

        if (!data.timeline || data.timeline.length === 0) {
            container.innerHTML = `
                <div class="py-12 text-center text-slate-500">
                    <p>No lifecycle events recorded for product ${productId}.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="mb-6 flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                    <h3 class="text-base font-bold text-white">${data.Model_Name}</h3>
                    <p class="text-xs text-slate-400 font-mono">Product ID: ${data.Product_ID} • S/N: ${data.Serial_Number}</p>
                </div>
                <button onclick="loadPassport('${data.Product_ID}')" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition">
                    Inspect Full DPP
                </button>
            </div>

            <div class="relative timeline-track pl-10 space-y-6">
                ${data.timeline.map((evt, idx) => {
                    // Stage Icon & Colors
                    let icon = 'fa-industry';
                    let dotColor = 'bg-emerald-500 border-emerald-400 ring-emerald-500/30';
                    if (evt.Stage === 'Purchase/Ownership') {
                        icon = 'fa-user-check';
                        dotColor = 'bg-teal-500 border-teal-400 ring-teal-500/30';
                    } else if (evt.Stage === 'Repair & Maintenance') {
                        icon = 'fa-screwdriver-wrench';
                        dotColor = 'bg-amber-500 border-amber-400 ring-amber-500/30';
                    } else if (evt.Stage === 'Reuse & Transfer') {
                        icon = 'fa-arrow-right-arrow-left';
                        dotColor = 'bg-sky-500 border-sky-400 ring-sky-500/30';
                    } else if (evt.Stage === 'End-of-Life Recycling') {
                        icon = 'fa-recycle';
                        dotColor = 'bg-purple-500 border-purple-400 ring-purple-500/30';
                    }

                    return `
                        <div class="relative">
                            <!-- Timeline node dot -->
                            <div class="absolute -left-10 top-1 w-6 h-6 rounded-full ${dotColor} border-2 ring-4 flex items-center justify-center text-[10px] text-white z-10">
                                <i class="fa-solid ${icon}"></i>
                            </div>

                            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 shadow-md">
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
                                    <div class="flex items-center space-x-2">
                                        <span class="text-xs font-bold text-white">${evt.Title}</span>
                                        <span class="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800">${evt.Stage}</span>
                                    </div>
                                    <span class="text-xs font-mono text-emerald-400">${evt.Event_Date}</span>
                                </div>
                                <p class="text-xs text-slate-300 mt-1">${evt.Description}</p>
                                ${evt.Stakeholder_Name ? `
                                    <div class="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                                        <i class="fa-solid fa-building text-slate-600"></i>
                                        <span>Actor: <strong class="text-slate-400">${evt.Stakeholder_Name}</strong> (${evt.Stakeholder_Type || 'Verified Partner'})</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="py-8 text-center text-red-400">Failed to load timeline.</div>`;
    }
}

// ----------------------------------------------------------------------------
// STAKEHOLDER & ADMIN ACTIONS
// ----------------------------------------------------------------------------
async function populateDropdowns() {
    try {
        const [modelsRes, stakeholdersRes, productsRes] = await Promise.all([
            fetch('/api/models'),
            fetch('/api/stakeholders'),
            fetch('/api/products')
        ]);

        const models = await modelsRes.json();
        const stakeholders = await stakeholdersRes.json();
        const products = await productsRes.json();

        // Manufacturers
        const mfgs = stakeholders.filter(s => s.Stakeholder_Type === 'MANUFACTURER');
        const mfgSelect = document.getElementById('modelManufacturerSelect');
        if (mfgSelect) {
            mfgSelect.innerHTML = mfgs.map(m => `<option value="${m.Stakeholder_ID}">${m.Name} (${m.Address})</option>`).join('');
        }

        // Owners
        const owners = stakeholders.filter(s => s.Stakeholder_Type === 'OWNER');
        const ownerSelects = ['itemOwnerSelect', 'transferNewOwnerSelect'];
        ownerSelects.forEach(selId => {
            const el = document.getElementById(selId);
            if (el) {
                el.innerHTML = owners.map(o => `<option value="${o.Stakeholder_ID}">${o.Name} (${o.Email})</option>`).join('');
            }
        });

        // Service Centres
        const scs = stakeholders.filter(s => s.Stakeholder_Type === 'SERVICE_CENTRE');
        const scSelect = document.getElementById('repairServiceCentreSelect');
        if (scSelect) {
            scSelect.innerHTML = scs.map(s => `<option value="${s.Stakeholder_ID}">${s.Name}</option>`).join('');
        }

        // Recycling Facilities
        const rfs = stakeholders.filter(s => s.Stakeholder_Type === 'RECYCLING_FACILITY');
        const rfSelect = document.getElementById('recycleFacilitySelect');
        if (rfSelect) {
            rfSelect.innerHTML = rfs.map(r => `<option value="${r.Stakeholder_ID}">${r.Name}</option>`).join('');
        }

        // Models Select
        const modelSelect = document.getElementById('itemModelSelect');
        if (modelSelect) {
            modelSelect.innerHTML = models.map(m => `<option value="${m.Model_ID}">${m.Name} [${m.Model_Number}] - ${m.Manufacturer_Name}</option>`).join('');
        }

        // Products Selects
        const productSelects = ['repairProductSelect', 'transferProductSelect', 'recycleProductSelect', 'timelineProductSelect'];
        productSelects.forEach(selId => {
            const el = document.getElementById(selId);
            if (el) {
                el.innerHTML = products.map(p => `<option value="${p.Product_ID}">${p.Product_ID} - ${p.Model_Name} (${p.Status})</option>`).join('');
            }
        });

    } catch (err) {
        console.error('Error populating dropdowns:', err);
    }
}

// 1. Create Model
async function handleCreateModel(e) {
    e.preventDefault();
    const payload = {
        Manufacturer_ID: document.getElementById('modelManufacturerSelect').value,
        Model_ID: document.getElementById('newModelId').value.trim(),
        Model_Number: document.getElementById('newModelNumber').value.trim(),
        Name: document.getElementById('newModelName').value.trim(),
        Product_Type: document.getElementById('newModelType').value,
        Carbon_Footprint: parseFloat(document.getElementById('newModelCarbon').value),
        Energy_Rating: document.getElementById('newModelEnergy').value,
        Disassembly_Manual_URL: document.getElementById('newModelManual').value.trim()
    };

    try {
        const res = await fetch('/api/models', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast('✅ Shared Product Model registered in SQL!', 'success');
            document.getElementById('formCreateModel').reset();
            await populateDropdowns();
        } else {
            showToast(`Error: ${data.error}`, 'error');
        }
    } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
    }
}

// 2. Create Physical Item
async function handleCreateItem(e) {
    e.preventDefault();
    const payload = {
        Model_ID: document.getElementById('itemModelSelect').value,
        Product_ID: document.getElementById('newItemId').value.trim(),
        Serial_Number: document.getElementById('newItemSerial').value.trim(),
        Manufacturing_Date: document.getElementById('newItemDate').value,
        State_of_Health: parseInt(document.getElementById('newItemHealth').value),
        Current_Owner_ID: document.getElementById('itemOwnerSelect').value
    };

    try {
        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`✅ Physical item ${payload.Product_ID} issued with Digital Passport!`, 'success');
            document.getElementById('formCreateItem').reset();
            await loadCatalogue();
            await populateDropdowns();
            loadPassport(payload.Product_ID);
        } else {
            showToast(`Error: ${data.error}`, 'error');
        }
    } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
    }
}

// 3. Add Repair
async function handleAddRepair(e) {
    e.preventDefault();
    const payload = {
        Product_ID: document.getElementById('repairProductSelect').value,
        Service_Centre_ID: document.getElementById('repairServiceCentreSelect').value,
        Repair_Date: document.getElementById('repairDate').value,
        Repair_Cost: parseFloat(document.getElementById('repairCost').value),
        New_State_of_Health: parseInt(document.getElementById('repairNewHealth').value),
        Replace_Parts: document.getElementById('repairReplacedParts').value.trim(),
        Description: document.getElementById('repairDescription').value.trim()
    };

    try {
        const res = await fetch('/api/repairs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`🔧 Repair logged for ${payload.Product_ID} - Status updated!`, 'success');
            document.getElementById('formAddRepair').reset();
            await loadCatalogue();
            loadPassport(payload.Product_ID);
        } else {
            showToast(`Error: ${data.error}`, 'error');
        }
    } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
    }
}

// 4. Add Transfer
async function handleAddTransfer(e) {
    e.preventDefault();
    const payload = {
        Product_ID: document.getElementById('transferProductSelect').value,
        New_Owner_ID: document.getElementById('transferNewOwnerSelect').value,
        Transfer_Date: document.getElementById('transferDate').value,
        Transfer_Reason: document.getElementById('transferReason').value.trim()
    };

    try {
        const res = await fetch('/api/transfers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`🔄 Ownership transfer recorded in SQL!`, 'success');
            document.getElementById('formAddTransfer').reset();
            await loadCatalogue();
            loadPassport(payload.Product_ID);
        } else {
            showToast(`Error: ${data.error}`, 'error');
        }
    } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
    }
}

// 5. Recycling Intake
async function handleRecycleIntake(e) {
    e.preventDefault();
    const payload = {
        Product_ID: document.getElementById('recycleProductSelect').value,
        Recycling_Facility_ID: document.getElementById('recycleFacilitySelect').value,
        Intake_Date: document.getElementById('recycleIntakeDate').value,
        Decommission_Status: document.getElementById('recycleStatusSelect').value,
        Notes: document.getElementById('recycleNotes').value.trim()
    };

    try {
        const res = await fetch('/api/recycling/intake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`♻️ E-waste intake logged! Event ID: ${data.Recycling_Event_ID}`, 'success');
            // Auto fill the next steps forms
            document.getElementById('salvageEventId').value = data.Recycling_Event_ID;
            document.getElementById('recoveryEventId').value = data.Recycling_Event_ID;
            await loadCatalogue();
            loadPassport(payload.Product_ID);
        } else {
            showToast(`Error: ${data.error}`, 'error');
        }
    } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
    }
}

// 6. Salvage Part
async function handleSalvagePart(e) {
    e.preventDefault();
    const payload = {
        Recycling_Event_ID: document.getElementById('salvageEventId').value.trim(),
        Component_ID: document.getElementById('salvageCompId').value.trim(),
        Condition_Grade: document.getElementById('salvageGrade').value,
        Salvage_Date: document.getElementById('salvageDate').value
    };

    try {
        const res = await fetch('/api/recycling/salvage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`⚙️ Component salvaged successfully!`, 'success');
            document.getElementById('formSalvagePart').reset();
            await loadSummaryAnalytics();
        } else {
            showToast(`Error: ${data.error}`, 'error');
        }
    } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
    }
}

// 7. Recover Material
async function handleRecoverMaterial(e) {
    e.preventDefault();
    const payload = {
        Recycling_Event_ID: document.getElementById('recoveryEventId').value.trim(),
        Material_ID: document.getElementById('recoveryMaterialSelect').value,
        Quantity: parseFloat(document.getElementById('recoveryQuantity').value),
        Purity: parseFloat(document.getElementById('recoveryPurity').value),
        Recovery_Date: document.getElementById('recoveryDate').value
    };

    try {
        const res = await fetch('/api/recycling/recovery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            showToast(`💎 Extracted material committed to SQL recovery table!`, 'success');
            document.getElementById('formRecoverMaterial').reset();
            await loadSummaryAnalytics();
        } else {
            showToast(`Error: ${data.error}`, 'error');
        }
    } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
    }
}

// ----------------------------------------------------------------------------
// CIRCULARITY ANALYTICS & DASHBOARD
// ----------------------------------------------------------------------------
async function loadSummaryAnalytics() {
    try {
        const res = await fetch('/api/summary');
        const stats = await res.json();

        // Update KPIs
        document.getElementById('statTotalProducts').innerText = stats.totalProducts;
        document.getElementById('statInUse').innerText = stats.inUseCount;
        document.getElementById('statUnderRepair').innerText = stats.underRepairCount;
        document.getElementById('statRecycled').innerText = stats.recycledCount;
        document.getElementById('statSalvaged').innerText = stats.totalSalvagedParts;
        document.getElementById('statMaterialsWeight').innerText = `${stats.totalMaterialWeightGrams} g`;

        // Render Table
        const tbody = document.getElementById('materialsAuditTableBody');
        if (tbody) {
            tbody.innerHTML = stats.materialsBreakdown.map(m => `
                <tr class="hover:bg-slate-950/40">
                    <td class="py-2.5 px-3 font-semibold text-white">${m.Material_Name}</td>
                    <td class="py-2.5 px-3 font-mono text-emerald-400">${m.Material_ID}</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-white">${m.TotalRecovered}</td>
                    <td class="py-2.5 px-3 text-slate-400 font-mono">${m.Unit}</td>
                    <td class="py-2.5 px-3 font-semibold text-teal-400">${m.AvgPurity.toFixed(1)}%</td>
                    <td class="py-2.5 px-3 text-slate-400">Battery & PCB Closed-Loop</td>
                </tr>
            `).join('');
        }

        // Render Chart 1: Recovered Materials
        renderMaterialsChart(stats.materialsBreakdown);

        // Render Chart 2: Product Status Distribution
        renderStatusChart(stats);

    } catch (err) {
        console.error('Error loading analytics:', err);
    }
}

function renderMaterialsChart(breakdown) {
    const ctx = document.getElementById('materialsChart');
    if (!ctx) return;

    if (materialsChartInstance) {
        materialsChartInstance.destroy();
    }

    const labels = breakdown.map(b => b.Material_Name.split(' ')[0]);
    const values = breakdown.map(b => b.TotalRecovered);

    materialsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Extracted Weight (grams)',
                data: values,
                backgroundColor: [
                    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#8b5cf6'
                ],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: '#1e293b' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function renderStatusChart(stats) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    if (statusChartInstance) {
        statusChartInstance.destroy();
    }

    statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['In Active Use', 'Under Repair', 'Recycled (End-of-Life)'],
            datasets: [{
                data: [stats.inUseCount, stats.underRepairCount, stats.recycledCount],
                backgroundColor: ['#10b981', '#f59e0b', '#38bdf8'],
                borderWidth: 2,
                borderColor: '#0f172a'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#cbd5e1', font: { size: 11 } }
                }
            }
        }
    });
}

// ----------------------------------------------------------------------------
// INTERACTIVE SQL QUERY RUNNER
// ----------------------------------------------------------------------------
function setQueryPreset(key) {
    if (SQL_PRESETS[key]) {
        document.getElementById('sqlConsoleInput').value = SQL_PRESETS[key];
    }
}

function copyCurrentQuery() {
    const text = document.getElementById('sqlConsoleInput').value;
    navigator.clipboard.writeText(text);
    showToast('SQL Query copied to clipboard!', 'info');
}

async function executeLiveQuery() {
    const sql = document.getElementById('sqlConsoleInput').value.trim();
    const statusEl = document.getElementById('queryResultStatus');
    const wrapper = document.getElementById('queryResultWrapper');

    if (!sql) {
        showToast('Please type an SQL query to execute.', 'error');
        return;
    }

    statusEl.innerHTML = `<span class="text-amber-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Running...</span>`;

    try {
        const res = await fetch('/api/sql/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
        });
        const data = await res.json();

        if (!res.ok) {
            statusEl.innerHTML = `<span class="text-red-400">Execution Error</span>`;
            wrapper.innerHTML = `
                <div class="p-4 bg-red-950/40 rounded-xl border border-red-800 text-red-300 font-mono text-xs">
                    <strong class="block mb-1">SQL Syntax / Constraint Error:</strong>
                    ${data.error}
                </div>
            `;
            return;
        }

        if (data.isSelect) {
            statusEl.innerHTML = `<span class="text-emerald-400"><i class="fa-solid fa-check mr-1"></i> Returned ${data.rowCount} rows</span>`;
            
            if (data.rowCount === 0) {
                wrapper.innerHTML = `<div class="p-4 text-xs text-slate-500 text-center">Query executed successfully. 0 rows returned.</div>`;
                return;
            }

            const thHtml = data.columns.map(c => `<th class="py-2 px-3">${c}</th>`).join('');
            const trHtml = data.rows.map(row => {
                const tds = data.columns.map(col => {
                    const val = row[col];
                    return `<td class="py-2 px-3 font-mono text-[11px]">${val !== null ? val : '<span class="text-slate-600">NULL</span>'}</td>`;
                }).join('');
                return `<tr class="hover:bg-slate-950/60 border-b border-slate-800/40">${tds}</tr>`;
            }).join('');

            wrapper.innerHTML = `
                <table class="w-full text-left text-xs">
                    <thead class="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px]">
                        <tr>${thHtml}</tr>
                    </thead>
                    <tbody class="text-slate-300 divide-y divide-slate-800/50">
                        ${trHtml}
                    </tbody>
                </table>
            `;
        } else {
            statusEl.innerHTML = `<span class="text-emerald-400">Success</span>`;
            wrapper.innerHTML = `<div class="p-4 bg-emerald-950/30 text-emerald-300 rounded-xl border border-emerald-800 text-xs">${data.message}</div>`;
        }

    } catch (err) {
        statusEl.innerHTML = `<span class="text-red-400">Failed</span>`;
        wrapper.innerHTML = `<div class="p-4 text-xs text-red-400">${err.message}</div>`;
    }
}

// ----------------------------------------------------------------------------
// MODALS & HELPERS
// ----------------------------------------------------------------------------
function openQRModal() {
    document.getElementById('qrModal').classList.remove('hidden');
}

function closeQRModal() {
    document.getElementById('qrModal').classList.add('hidden');
}

function simulateScan(productId) {
    closeQRModal();
    loadPassport(productId);
}

function handleManualScan() {
    const input = document.getElementById('manualScanInput');
    const val = input.value.trim();
    if (!val) return;
    closeQRModal();
    loadPassport(val);
}

async function resetDemoData() {
    if (!confirm('Reset DPP SQL Database back to initial realistic dataset?')) return;
    try {
        const res = await fetch('/api/reset', { method: 'POST' });
        const data = await res.json();
        showToast('Database reset and seeded with default units!', 'success');
        await loadCatalogue();
        await populateDropdowns();
        await loadSummaryAnalytics();
    } catch (err) {
        showToast(`Reset error: ${err.message}`, 'error');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toastNotification');
    const msgEl = document.getElementById('toastMessage');
    const iconEl = document.getElementById('toastIcon');

    msgEl.innerText = message;
    if (type === 'success') {
        iconEl.className = 'fa-solid fa-circle-check text-emerald-400 text-base';
    } else if (type === 'error') {
        iconEl.className = 'fa-solid fa-triangle-exclamation text-red-400 text-base';
    } else {
        iconEl.className = 'fa-solid fa-circle-info text-sky-400 text-base';
    }

    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
    }, 4000);
}
