// ============================================================================
// DIGITAL PRODUCT PASSPORT (DPP) - HUMANIZED INTERACTION CONTROLLER
// Course: BACSE202 - Database Systems | Vellore Institute of Technology (VIT)
// Team: Aditya Priyan C (25BCE0662), Amaan Abdullah Karuthedath (25BCE2701)
// Faculty Guide: Prof. Saritha Murali
// ============================================================================

let currentProducts = [];
let materialsChartInstance = null;
let statusChartInstance = null;
let debounceTimer = null;
let currentPassportViewMode = 'story'; // 'story' | 'technical'
let activePassportData = null;

// Human Device Metadata, Photos, and Empathy Content
const MODEL_VISUALS = {
    'MOD-LEN-LOQ15': {
        image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=700&q=80',
        humanType: 'High-Performance Gaming & Engineering Laptop',
        tagline: 'Engineered for intensive coding, AI model training, and 144Hz esports gaming.',
        repairabilityScore: 8.5,
        repairabilityVerdict: 'High Repairability — Dual DDR5 slots, swappable NVMe storage, and pull-tab battery.',
        carbonEquiv: 'Equivalent to driving ~1,140 km in a petrol car. Upgrading rather than buying new saved 192 kg CO2!',
        treesEquiv: '14 urban trees planting equivalent in carbon offset',
        careTips: [
            'Enable the 80% Conservation Charge mode in Lenovo Vantage to double lithium cell longevity.',
            'Blow dust out of cooling fins every 6 months to prevent thermal throttling and fan bearing wear.',
            'Standard Philips #0 screws mean you can easily replace thermal paste yourself with zero special tools.'
        ]
    },
    'MOD-APL-IPH15': {
        image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=700&q=80',
        humanType: 'Titanium Smartphone with Recycled Core Metallurgy',
        tagline: 'Features 100% recycled cobalt in the battery and 100% recycled gold in logic board plating.',
        repairabilityScore: 7.2,
        repairabilityVerdict: 'Good Repairability — Removable back glass design allows independent screen and battery replacement.',
        carbonEquiv: 'Equivalent to charging an electric scooter for 3,200 km. Minimal manufacturing footprint.',
        treesEquiv: '3.5 trees annual carbon absorption equivalent',
        careTips: [
            'Use Optimized Battery Charging to avoid keeping the battery at 100% overnight.',
            'Keep water exposure minimal even with IP68 seals, as gasket adhesives naturally degrade after 2 years.',
            'Use MagSafe or clean the USB-C port gently with a wooden toothpick to prevent lint buildup.'
        ]
    },
    'MOD-DEL-XPS13': {
        image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=700&q=80',
        humanType: 'Ultra-Portable CNC Aluminum Developer Ultrabook',
        tagline: 'EPEAT Gold certified workhorse built with low-carbon aluminum and recycled ocean plastics.',
        repairabilityScore: 7.8,
        repairabilityVerdict: 'Good Repairability — Modular removable SSD, swappable battery, and clear internal screw labelling.',
        carbonEquiv: 'Equivalent to ~880 km of driving. High efficiency Intel Evo architecture.',
        treesEquiv: '11 trees annual carbon absorption equivalent',
        careTips: [
            'Keep firmware updated via Dell Command Update to maintain optimal USB-C power delivery.',
            'Avoid using on soft beds to ensure bottom air intakes maintain positive airflow.',
            'Battery can be replaced in under 10 minutes with a standard Torx T5 driver.'
        ]
    },
    'MOD-SAM-S24U': {
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=700&q=80',
        humanType: 'Titanium AI Flagship with 7-Year Circular Support',
        tagline: 'Built with recycled rare earth magnets, recycled cobalt cells, and ocean-bound plastics.',
        repairabilityScore: 7.5,
        repairabilityVerdict: 'Good Repairability — Adhesive pull-tabs for battery removal; official repair manual public.',
        carbonEquiv: 'Equivalent to ~290 km of driving.',
        treesEquiv: '4 trees annual carbon absorption equivalent',
        careTips: [
            'Activate Protect Battery mode (caps at 80% or 85%) in Settings to preserve battery health.',
            'Use screen protector to shield the anti-reflective Gorilla Armor glass from micro-abrasions.'
        ]
    },
    'MOD-ASU-ROG27': {
        image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=700&q=80',
        humanType: '240Hz OLED Gaming & Engineering Display',
        tagline: 'Custom heatsink cooling; lead-free solder; 95% recyclable aluminum stand and bezel.',
        repairabilityScore: 8.0,
        repairabilityVerdict: 'High Repairability — External modular power brick and standard VESA 100x100 mounting.',
        carbonEquiv: 'Equivalent to ~700 km of driving.',
        treesEquiv: '9 trees annual carbon absorption equivalent',
        careTips: [
            'Run the built-in Pixel Cleaning cycle every 4 hours of intense static window usage.',
            'Keep brightness on Auto-HDR to preserve OLED sub-pixel luminance over years of use.'
        ]
    },
    'MOD-APL-IPAD': {
        image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=700&q=80',
        humanType: 'Pro Creative Studio Tablet',
        tagline: '100% recycled aluminum body and 100% recycled tin in motherboard solder.',
        repairabilityScore: 6.5,
        repairabilityVerdict: 'Moderate Repairability — Highly rigid structural frame; display replacement via authorized service.',
        carbonEquiv: 'Equivalent to ~460 km of driving.',
        treesEquiv: '6 trees annual carbon absorption equivalent',
        careTips: [
            'Avoid leaving in parked hot cars to protect adhesive seals and battery longevity.',
            'Clean Apple Pencil contact strip regularly to maintain inductive charging efficiency.'
        ]
    }
};

// Friendly Nicknames and Human Personas for Specific Items
const ITEM_HUMAN_PERSONAS = {
    'PROD-LOQ-001': {
        nickname: "Aditya's Daily Driver",
        tag: 'Loved & Well Maintained',
        tagColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        storyBio: 'Purchased by Aditya Priyan C for B.Tech Computer Science studies at VIT Vellore. Used daily for code compilation, database benchmarking, and occasional gaming. Recently treated to a dual-channel 16GB DDR5 memory upgrade at TechCare Hub Bangalore to smoothly run AI models. In pristine condition!',
        avatarInitials: 'AP',
        avatarBg: 'bg-emerald-600'
    },
    'PROD-LOQ-002': {
        nickname: 'EcoRecycle Circular Hero',
        tag: 'Fully Reclaimed & Zero Landfill',
        tagColor: 'bg-sky-950 text-sky-300 border-sky-700',
        storyBio: 'After 2 years of hard software engineering service at EcoGreen Enterprises, it experienced an unfortunate liquid spill on its motherboard. Instead of ending up in a toxic e-waste dump, EcoRecycle Solutions Hub Hyderabad carefully dismantled it: its 16GB DDR5 RAM was salvaged in Grade A condition for a student refurbished computer, and 0.41g of pure gold + 35g of lithium were recovered!',
        avatarInitials: 'ER',
        avatarBg: 'bg-sky-600'
    },
    'PROD-LOQ-003': {
        nickname: 'TechCare Patient (In Service)',
        tag: 'Undergoing Battery Refresh',
        tagColor: 'bg-amber-950 text-amber-300 border-amber-700',
        storyBio: 'A high-mileage machine whose battery dropped below 75% after months of heavy mobile development. Currently receiving a fresh OEM battery module at TechCare Hub Bangalore. Once calibrated, its health rating will jump straight back to 95%+, ready for years more work.',
        avatarInitials: 'TC',
        avatarBg: 'bg-amber-600'
    },
    'PROD-IPH-001': {
        nickname: "Amaan's Daily Companion",
        tag: '98% Battery Health • Flawless',
        tagColor: 'bg-teal-950 text-teal-300 border-teal-700',
        storyBio: 'Activated by Amaan Abdullah Karuthedath at VIT Campus Hostel Block B. Protected with care, maintaining an impressive 98% state of health. Features 100% recycled cobalt cells and titanium framing.',
        avatarInitials: 'AK',
        avatarBg: 'bg-teal-600'
    },
    'PROD-IPH-002': {
        nickname: "Dr. Neha's Rescued Research Phone",
        tag: 'Screen Saved & Fully Restored',
        tagColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        storyBio: 'Re-allocated from an enterprise fleet to Dr. Neha Sharma for campus research. An accidental drop cracked the front glass in April 2024, but QuickFix Chennai replaced the assembly with a genuine OEM panel rather than discarding the phone. Still ticking with 89% battery health!',
        avatarInitials: 'NS',
        avatarBg: 'bg-purple-600'
    },
    'PROD-DEL-001': {
        nickname: 'VIT SCOPE Lab Workstation',
        tag: 'Academic Research Device',
        tagColor: 'bg-indigo-950 text-indigo-300 border-indigo-700',
        storyBio: 'Deployed in the School of Computing Science and Engineering (SCOPE) Advanced Database Lab. Dedicated to teaching normalized relational SQL systems and distributed computing to engineering students.',
        avatarInitials: 'VIT',
        avatarBg: 'bg-indigo-600'
    },
    'PROD-DEL-002': {
        nickname: 'GreenCircuits Reclaimed Dell',
        tag: '490g Recycled Aluminum Yield',
        tagColor: 'bg-sky-950 text-sky-300 border-sky-700',
        storyBio: 'Honorably retired after 3 years of academic service. GreenCircuits Pune recovered 490 grams of aerospace-grade aluminum and 52 grams of copper from this ultrabook, completely diverted from hazardous landfills.',
        avatarInitials: 'GC',
        avatarBg: 'bg-cyan-600'
    },
    'PROD-SAM-001': {
        nickname: 'AMOLED Screen Salvage Pioneer',
        tag: 'Display Saved for Refurbishment',
        tagColor: 'bg-purple-950 text-purple-300 border-purple-700',
        storyBio: 'Retired unit safely disassembled under inert argon gas. Its pristine 6.8" Dynamic AMOLED 2X display was certified Grade A and saved to repair another student’s cracked device at half the carbon cost of a new screen.',
        avatarInitials: 'ER',
        avatarBg: 'bg-purple-600'
    },
    'PROD-SAM-002': {
        nickname: 'EcoGreen Corporate Unit',
        tag: 'Active Enterprise Fleet',
        tagColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        storyBio: 'High-security smartphone utilized by EcoGreen procurement executives to audit sustainable electronics suppliers across India.',
        avatarInitials: 'EG',
        avatarBg: 'bg-emerald-700'
    },
    'PROD-ASU-001': {
        nickname: 'SCOPE Creative OLED Display',
        tag: '97% Health • Pixel Perfect',
        tagColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
        storyBio: 'Ultra-smooth 240Hz OLED monitor providing color-accurate rendering for final-year engineering multimedia and database visualizer projects in VIT Technology Tower.',
        avatarInitials: 'VIT',
        avatarBg: 'bg-blue-600'
    }
};

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
// PRODUCT CATALOGUE (HUMANIZED)
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
                <div class="col-span-full py-16 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
                    <i class="fa-solid fa-box-open text-4xl mb-3 text-slate-600"></i>
                    <p class="text-base font-semibold text-white">No electronics match those filters</p>
                    <p class="text-xs text-slate-500 mt-1">Try clearing your search query or switching categories.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(p => {
            const visual = MODEL_VISUALS[p.Model_ID] || {
                image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=700&q=80',
                humanType: p.Product_Type,
                tagline: 'Consumer electronic device with verified digital product passport.'
            };

            const persona = ITEM_HUMAN_PERSONAS[p.Product_ID] || {
                nickname: `${p.Model_Name} Unit`,
                tag: p.Status,
                tagColor: 'bg-slate-800 text-slate-300 border-slate-700',
                avatarInitials: 'DPP',
                avatarBg: 'bg-emerald-600'
            };

            // Human Status Badge
            let statusPill = '<span class="px-2.5 py-1 text-xs rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> In Active Use</span>';
            if (p.Status === 'Under Repair') {
                statusPill = '<span class="px-2.5 py-1 text-xs rounded-full bg-amber-950 text-amber-300 border border-amber-700 font-semibold flex items-center gap-1.5"><i class="fa-solid fa-wrench text-[10px]"></i> In Service Hub</span>';
            } else if (p.Status === 'Recycled') {
                statusPill = '<span class="px-2.5 py-1 text-xs rounded-full bg-sky-950 text-sky-300 border border-sky-700 font-semibold flex items-center gap-1.5"><i class="fa-solid fa-recycle text-[10px]"></i> Reclaimed & Recycled</span>';
            }

            // Human Health Message
            let healthVerdict = "✨ Excellent condition — ready for years more use";
            let healthBarColor = "from-emerald-500 to-teal-400";
            if (p.State_of_Health < 85 && p.State_of_Health > 0) {
                healthVerdict = "🔧 Functional — Battery or thermal refresh recommended";
                healthBarColor = "from-amber-500 to-yellow-400";
            } else if (p.State_of_Health === 0) {
                healthVerdict = "♻️ End-of-Life: Working parts salvaged, raw metals recovered";
                healthBarColor = "from-sky-500 to-blue-400";
            }

            return `
                <div class="device-card bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-emerald-950/20 transition duration-300 flex flex-col justify-between group">
                    <div>
                        <!-- Device Photo Header with Overlay Badges -->
                        <div class="relative h-48 w-full bg-slate-950 overflow-hidden">
                            <img src="${visual.image}" alt="${p.Model_Name}" 
                                 class="device-img-thumb w-full h-full object-cover opacity-85 group-hover:opacity-100 transition duration-500"
                                 onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=700&q=80'">
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent"></div>
                            
                            <!-- Badges over photo -->
                            <div class="absolute top-3 left-3 right-3 flex justify-between items-center">
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-700">
                                    ${p.Product_Type}
                                </span>
                                ${statusPill}
                            </div>

                            <!-- Human Nickname banner -->
                            <div class="absolute bottom-3 left-3 right-3">
                                <div class="text-xs font-semibold text-emerald-300 drop-shadow">${persona.nickname}</div>
                                <h3 class="text-base font-bold text-white leading-tight drop-shadow">${p.Model_Name}</h3>
                            </div>
                        </div>

                        <!-- Card Body Content -->
                        <div class="p-5 space-y-4">
                            
                            <!-- Identifiers Strip -->
                            <div class="bg-slate-950 rounded-2xl p-3 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-500 text-[11px] font-sans">Passport ID:</span>
                                    <span class="text-emerald-400 font-bold">${p.Product_ID}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-500 text-[11px] font-sans">Serial Number:</span>
                                    <span class="text-slate-300">${p.Serial_Number}</span>
                                </div>
                            </div>

                            <!-- Human Story Snapshot -->
                            <div class="space-y-2 text-xs">
                                <div class="flex items-center space-x-2.5">
                                    <div class="w-7 h-7 rounded-full ${persona.avatarBg} text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0 shadow-sm">
                                        ${persona.avatarInitials}
                                    </div>
                                    <div class="truncate">
                                        <span class="text-slate-400 text-[11px] block">Current Custody</span>
                                        <span class="text-white font-medium">${p.Owner_Name || '<span class="text-emerald-400">EcoRecycle Recovery Depot</span>'}</span>
                                    </div>
                                </div>

                                <div class="flex justify-between items-center pt-1 text-[11px] text-slate-400 border-t border-slate-800/60">
                                    <span>Origin: <strong class="text-slate-300">${p.Manufacturer_Name}</strong></span>
                                    <span class="text-emerald-400 font-semibold">${p.Carbon_Footprint} kg CO2e</span>
                                </div>
                            </div>

                            <!-- Health Score Indicator -->
                            <div class="pt-2 border-t border-slate-800/60">
                                <div class="flex justify-between items-center text-xs mb-1.5">
                                    <span class="text-slate-400 font-medium">Device Health Rating</span>
                                    <span class="font-extrabold font-mono ${p.State_of_Health >= 85 ? 'text-emerald-400' : p.State_of_Health > 0 ? 'text-amber-400' : 'text-sky-400'}">
                                        ${p.State_of_Health}%
                                    </span>
                                </div>
                                <div class="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/80">
                                    <div class="bg-gradient-to-r ${healthBarColor} h-2 rounded-full transition-all duration-500" style="width: ${Math.max(p.State_of_Health, 6)}%"></div>
                                </div>
                                <p class="text-[10px] text-slate-400 mt-1 italic">${healthVerdict}</p>
                            </div>

                        </div>
                    </div>

                    <!-- Card Actions -->
                    <div class="p-5 pt-0 flex items-center gap-2">
                        <button onclick="loadPassport('${p.Product_ID}')" class="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40">
                            <i class="fa-solid fa-book-open text-xs"></i>
                            <span>Read Gadget Story</span>
                        </button>
                        <button onclick="loadTimeline('${p.Product_ID}')" title="View Verified Lifecycle Journey" class="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 px-3.5 rounded-xl border border-slate-700 transition">
                            <i class="fa-solid fa-route"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading catalogue:', err);
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-red-400">Failed to load product catalogue.</div>`;
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
// DIGITAL PRODUCT PASSPORT (DPP) VIEWER (HUMANIZED)
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
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center text-slate-400">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-emerald-500 mb-3"></i>
            <p class="text-sm">Retrieving digital passport story for <span class="font-mono text-emerald-400 font-bold">${productId}</span>...</p>
        </div>
    `;

    try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Product passport not found.');
        }
        const data = await res.json();
        activePassportData = data;
        renderPassport(data);
    } catch (err) {
        container.innerHTML = `
            <div class="bg-red-950/40 border border-red-800/80 rounded-3xl p-8 text-center text-red-300">
                <i class="fa-solid fa-triangle-exclamation text-4xl text-red-400 mb-3"></i>
                <h3 class="text-base font-bold text-white">Item Passport Lookup Failed</h3>
                <p class="text-xs text-red-400 mt-1 max-w-md mx-auto">${err.message}</p>
                <div class="mt-5 flex justify-center gap-3">
                    <button onclick="loadPassport('PROD-LOQ-001')" class="text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl border border-slate-700">
                        Try Aditya's LOQ Laptop
                    </button>
                    <button onclick="switchTab('catalogue')" class="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold">
                        Back to Catalogue
                    </button>
                </div>
            </div>
        `;
    }
}

function setPassportViewMode(mode) {
    currentPassportViewMode = mode;
    if (activePassportData) {
        renderPassport(activePassportData);
    }
}

function renderPassport(dpp) {
    const container = document.getElementById('passportDetailsContainer');

    const visual = MODEL_VISUALS[dpp.Model_ID] || {
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
        humanType: dpp.Product_Type,
        tagline: 'Consumer electronic device with verified digital product passport.',
        repairabilityScore: 8.0,
        repairabilityVerdict: 'Standard modular design with replaceable components.',
        carbonEquiv: 'Significant carbon savings through extended circular lifespan.',
        treesEquiv: '8 trees carbon equivalent',
        careTips: ['Keep firmware updated and clean vents regularly.']
    };

    const persona = ITEM_HUMAN_PERSONAS[dpp.Product_ID] || {
        nickname: `${dpp.Model_Name} Unit`,
        tag: dpp.Status,
        tagColor: 'bg-slate-800 text-slate-300 border-slate-700',
        storyBio: 'A verified consumer electronic product tracked across its lifecycle in our relational SQL database.',
        avatarInitials: 'DPP',
        avatarBg: 'bg-emerald-600'
    };

    // Status styling
    let statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> In Active Use</span>`;
    if (dpp.Status === 'Under Repair') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1.5"><i class="fa-solid fa-wrench"></i> In Service Centre</span>`;
    } else if (dpp.Status === 'Recycled') {
        statusBadge = `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-700 flex items-center gap-1.5"><i class="fa-solid fa-recycle"></i> Reclaimed & Recycled</span>`;
    }

    container.innerHTML = `
        <div class="space-y-6">
            
            <!-- TOP HERO CARD: PRODUCT LIVING BIOGRAPHY & QR CODE -->
            <div class="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div class="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                    
                    <!-- Left: Device Photo & Identity -->
                    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1">
                        <div class="relative w-44 h-44 rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 shadow-lg">
                            <img src="${visual.image}" alt="${dpp.Model_Name}" class="w-full h-full object-cover">
                            <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                            <span class="absolute bottom-2 left-2 text-[10px] font-mono font-bold bg-slate-900/90 text-emerald-400 px-2 py-0.5 rounded-md border border-slate-700">
                                ${dpp.Product_ID}
                            </span>
                        </div>

                        <div class="space-y-2.5 text-center sm:text-left flex-1">
                            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                <span class="px-3 py-0.5 rounded-full text-xs font-bold ${persona.tagColor}">
                                    ${persona.nickname}
                                </span>
                                ${statusBadge}
                                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                    Health: ${dpp.State_of_Health}%
                                </span>
                            </div>

                            <div>
                                <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">${dpp.Model_Name}</h1>
                                <p class="text-xs text-slate-400 mt-1 max-w-xl">${visual.tagline}</p>
                            </div>

                            <!-- Human Story Bio Snippet -->
                            <p class="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 leading-relaxed italic">
                                "${persona.storyBio}"
                            </p>

                            <!-- Key Specs Pills -->
                            <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs pt-1">
                                <span class="px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-slate-400">
                                    Maker: <strong class="text-white">${dpp.Manufacturer_Name}</strong>
                                </span>
                                <span class="px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-slate-400">
                                    Serial: <strong class="text-slate-300 font-mono">${dpp.Serial_Number}</strong>
                                </span>
                                <span class="px-2.5 py-1 bg-slate-950 rounded-xl border border-slate-800 text-slate-400">
                                    Carbon: <strong class="text-emerald-400 font-mono">${dpp.Carbon_Footprint} kg</strong>
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Live Scannable QR Code Card -->
                    <div class="bg-white p-4 rounded-3xl shadow-xl flex flex-col items-center justify-center text-center self-center lg:self-auto min-w-[210px]">
                        <img src="${dpp.qrCode}" alt="Product Passport QR Code" class="w-40 h-40 object-contain rounded-xl">
                        <div class="mt-2 text-slate-900 text-xs font-mono font-bold">${dpp.Product_ID}</div>
                        <span class="text-[10px] text-slate-500">Scan with your phone to verify</span>
                    </div>
                </div>
            </div>

            <!-- VIEW MODE TOGGLE PILLS -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <div class="flex items-center space-x-2">
                    <button onclick="setPassportViewMode('story')" class="mode-pill px-4 py-2 rounded-2xl text-xs font-bold flex items-center space-x-2 ${currentPassportViewMode === 'story' ? 'active' : 'bg-slate-900 text-slate-400 hover:text-white'}">
                        <i class="fa-solid fa-book-open"></i>
                        <span>📖 Gadget Biography (Story Mode)</span>
                    </button>
                    <button onclick="setPassportViewMode('technical')" class="mode-pill px-4 py-2 rounded-2xl text-xs font-bold flex items-center space-x-2 ${currentPassportViewMode === 'technical' ? 'active' : 'bg-slate-900 text-slate-400 hover:text-white'}">
                        <i class="fa-solid fa-code"></i>
                        <span>⚙️ Technical Specs & SQL BoM</span>
                    </button>
                </div>
                <div class="text-xs text-slate-500 hidden sm:block">
                    ${currentPassportViewMode === 'story' ? 'Viewing human journey & care guide' : 'Viewing engineering components & chemical composition'}
                </div>
            </div>

            <!-- DYNAMIC VIEW CONTAINER -->
            ${currentPassportViewMode === 'story' ? renderStoryModeHtml(dpp, visual, persona) : renderTechnicalModeHtml(dpp)}

        </div>
    `;
}

// ----------------------------------------------------------------------------
// 1. STORY MODE VIEW (HUMAN-FIRST)
// ----------------------------------------------------------------------------
function renderStoryModeHtml(dpp, visual, persona) {
    return `
        <div class="space-y-6">

            <!-- REAL-WORLD ENVIRONMENTAL IMPACT CARDS -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <!-- Carbon Metric Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                        <div class="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mb-3">
                            <i class="fa-solid fa-car text-lg"></i>
                        </div>
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Carbon in Plain English</h4>
                        <div class="text-xl font-extrabold text-white mt-1">${dpp.Carbon_Footprint} kg CO2e</div>
                        <p class="text-xs text-slate-300 mt-2 leading-relaxed">
                            ${visual.carbonEquiv}
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 flex items-center gap-1.5">
                        <i class="fa-solid fa-tree"></i>
                        <span>${visual.treesEquiv}</span>
                    </div>
                </div>

                <!-- Repairability Score Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                        <div class="w-10 h-10 rounded-2xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center mb-3">
                            <i class="fa-solid fa-screwdriver-wrench text-lg"></i>
                        </div>
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">iFixit-Style Repairability</h4>
                        <div class="text-xl font-extrabold text-amber-400 mt-1">${visual.repairabilityScore} / 10</div>
                        <p class="text-xs text-slate-300 mt-2 leading-relaxed">
                            ${visual.repairabilityVerdict}
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800">
                        <a href="${dpp.Disassembly_Manual_URL}" target="_blank" class="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1.5 font-semibold">
                            <i class="fa-solid fa-file-pdf"></i>
                            <span>View Step-by-Step Disassembly Guide ➔</span>
                        </a>
                    </div>
                </div>

                <!-- Circularity & Materials Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between">
                    <div>
                        <div class="w-10 h-10 rounded-2xl bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center mb-3">
                            <i class="fa-solid fa-recycle text-lg"></i>
                        </div>
                        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Circularity Rating</h4>
                        <div class="text-xl font-extrabold text-teal-400 mt-1">${dpp.circularityScore}% Recyclable</div>
                        <p class="text-xs text-slate-300 mt-2 leading-relaxed">
                            Contains ${dpp.billOfMaterials.length} monitored strategic materials. ${dpp.totalHazardousCount === 0 ? 'Certified 100% non-hazardous for easy reuse.' : 'Contains monitored cobalt & lithium batteries safely neutralized under inert atmosphere.'}
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-800 text-[11px] text-teal-400 flex items-center gap-1.5">
                        <i class="fa-solid fa-shield-halved"></i>
                        <span>Zero-Landfill Commitment</span>
                    </div>
                </div>

            </div>

            <!-- CHAPTERS OF LIFE (STORY TIMELINE) -->
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div class="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
                    <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center">
                        <i class="fa-solid fa-route text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white">Chapters in This Gadget's Life</h3>
                        <p class="text-xs text-slate-400">Real custody records documented by manufacturers, users, and technicians</p>
                    </div>
                </div>

                <div class="space-y-6">
                    ${dpp.timeline.map((evt, idx) => `
                        <div class="flex items-start space-x-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80">
                            <div class="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                                ${idx + 1}
                            </div>
                            <div class="flex-1 text-xs space-y-1">
                                <div class="flex flex-wrap items-center justify-between gap-2">
                                    <h4 class="font-bold text-white text-sm">${evt.Title}</h4>
                                    <span class="text-emerald-400 font-mono font-medium">${evt.Event_Date}</span>
                                </div>
                                <p class="text-slate-300 leading-relaxed">${evt.Description}</p>
                                ${evt.Stakeholder_Name ? `
                                    <div class="pt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                                        <i class="fa-solid fa-user-check text-slate-500"></i>
                                        <span>Verified Stakeholder: <strong class="text-slate-200">${evt.Stakeholder_Name}</strong> (${evt.Stakeholder_Type})</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- PERSONALIZED GADGET CARE & LONGEVITY GUIDE -->
            <div class="bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950/40 border border-emerald-800/40 rounded-3xl p-6 sm:p-8 shadow-xl">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="w-10 h-10 rounded-2xl bg-emerald-950 border border-emerald-700/60 text-emerald-300 flex items-center justify-center">
                        <i class="fa-solid fa-seedling text-lg"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-white">Owner Care & Longevity Advice</h3>
                        <p class="text-xs text-slate-300">How to keep this ${dpp.Model_Name} running for years to come</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
                    ${visual.careTips.map((tip, idx) => `
                        <div class="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col justify-between">
                            <div>
                                <span class="font-bold text-emerald-400 block mb-1">Tip #${idx + 1}</span>
                                <p class="text-slate-300 leading-relaxed">${tip}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- END OF LIFE CELEBRATION (IF RECYCLED) -->
            ${dpp.recyclingEvent ? `
                <div class="bg-gradient-to-br from-emerald-950/50 via-slate-900 to-teal-950/50 border border-emerald-700/60 rounded-3xl p-6 sm:p-8 shadow-xl">
                    <div class="flex items-center space-x-3 mb-4 pb-3 border-b border-emerald-800/40">
                        <div class="w-10 h-10 rounded-2xl bg-emerald-900 text-emerald-300 flex items-center justify-center text-xl">
                            <i class="fa-solid fa-recycle"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-white">Circular Destiny: Life Beyond the Landfill</h3>
                            <p class="text-xs text-emerald-300">Reclaimed with pride by ${dpp.recyclingEvent.Recycling_Facility_Name}</p>
                        </div>
                    </div>

                    <p class="text-xs text-slate-200 leading-relaxed mb-4">
                        When this gadget completed its active service, its journey didn't end. Its working modular components were tested for second-life reuse, and its raw gold, copper, and lithium were recovered to build tomorrow's technology without mining pristine earth.
                    </p>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        ${dpp.recyclingEvent.recoveries.map(r => `
                            <div class="p-3 bg-slate-950/90 rounded-2xl border border-emerald-900/60 text-center">
                                <div class="text-slate-400 text-[11px] font-sans">${r.Material_Name.split(' ')[0]}</div>
                                <div class="text-emerald-400 text-base font-bold font-mono mt-0.5">${r.Quantity} ${r.Unit}</div>
                                <div class="text-[10px] text-slate-400 mt-1">Purity: ${r.Purity}%</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

        </div>
    `;
}

// ----------------------------------------------------------------------------
// 2. TECHNICAL / SQL ENGINEERING VIEW (ACADEMIC SPECS)
// ----------------------------------------------------------------------------
function renderTechnicalModeHtml(dpp) {
    return `
        <div class="space-y-6">

            <!-- TWO COLUMN: MANUFACTURER & CURRENT CUSTODY DETAILS -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <!-- Manufacturer Details Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
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
                <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-lg">
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
                        <div class="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                            <i class="fa-solid fa-recycle text-emerald-400 text-2xl mb-2"></i>
                            <p class="font-medium text-white">Device Relinquished to E-Waste Facility</p>
                            <p class="text-[11px] text-slate-500 mt-1">Product is currently decommissioned for material extraction.</p>
                        </div>
                    `}
                </div>

            </div>

            <!-- HARDWARE COMPONENTS HIERARCHICAL BREAKDOWN -->
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-lg">
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
                    <span class="text-xs px-2.5 py-1 rounded-xl bg-slate-950 text-slate-300 border border-slate-800 font-mono">
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
                            <div class="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                                <div>
                                    <div class="flex justify-between items-start mb-1.5">
                                        <span class="text-xs font-bold text-white">${c.Component_Type}</span>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor}">${c.Status}</span>
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
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-lg">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-teal-400">
                            <i class="fa-solid fa-dna"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-white">Bill of Materials (BoM) & Chemical Composition</h3>
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
                                <th class="py-2.5 px-3">Material</th>
                                <th class="py-2.5 px-3">Total Quantity</th>
                                <th class="py-2.5 px-3">Recyclability</th>
                                <th class="py-2.5 px-3">Hazard Flag</th>
                                <th class="py-2.5 px-3">RoHS / REACH</th>
                                <th class="py-2.5 px-3">Utilized In Subsystems</th>
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
            <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-lg">
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
                            <div class="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
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

        </div>
    `;
}

function printPassport() {
    window.print();
}

// ----------------------------------------------------------------------------
// LIFECYCLE TIMELINE TRACE (HUMANIZED)
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

        const persona = ITEM_HUMAN_PERSONAS[data.Product_ID] || {
            nickname: `${data.Model_Name} Unit`,
            avatarBg: 'bg-emerald-600',
            avatarInitials: 'DPP'
        };

        if (!data.timeline || data.timeline.length === 0) {
            container.innerHTML = `
                <div class="py-12 text-center text-slate-500">
                    <p>No lifecycle events recorded for product ${productId}.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-2xl ${persona.avatarBg} text-white font-bold flex items-center justify-center text-xs shadow-md">
                        ${persona.avatarInitials}
                    </div>
                    <div>
                        <div class="text-xs font-semibold text-emerald-400">${persona.nickname}</div>
                        <h3 class="text-lg font-bold text-white">${data.Model_Name}</h3>
                        <p class="text-xs text-slate-400 font-mono">Passport: ${data.Product_ID} • S/N: ${data.Serial_Number}</p>
                    </div>
                </div>
                <button onclick="loadPassport('${data.Product_ID}')" class="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2 rounded-xl transition font-semibold shadow-md">
                    Open Full Passport
                </button>
            </div>

            <div class="relative timeline-track pl-10 space-y-6">
                ${data.timeline.map((evt, idx) => {
                    // Stage Icon & Colors
                    let icon = 'fa-industry';
                    let dotColor = 'bg-emerald-500 border-emerald-400 ring-emerald-500/30';
                    let stageBadge = 'bg-emerald-950 text-emerald-300 border-emerald-800';

                    if (evt.Stage === 'Purchase/Ownership') {
                        icon = 'fa-user-check';
                        dotColor = 'bg-teal-500 border-teal-400 ring-teal-500/30';
                        stageBadge = 'bg-teal-950 text-teal-300 border-teal-800';
                    } else if (evt.Stage === 'Repair & Maintenance') {
                        icon = 'fa-wrench';
                        dotColor = 'bg-amber-500 border-amber-400 ring-amber-500/30';
                        stageBadge = 'bg-amber-950 text-amber-300 border-amber-800';
                    } else if (evt.Stage === 'Reuse & Transfer') {
                        icon = 'fa-handshake';
                        dotColor = 'bg-sky-500 border-sky-400 ring-sky-500/30';
                        stageBadge = 'bg-sky-950 text-sky-300 border-sky-800';
                    } else if (evt.Stage === 'End-of-Life Recycling') {
                        icon = 'fa-recycle';
                        dotColor = 'bg-purple-500 border-purple-400 ring-purple-500/30';
                        stageBadge = 'bg-purple-950 text-purple-300 border-purple-800';
                    }

                    return `
                        <div class="relative">
                            <!-- Timeline node dot -->
                            <div class="absolute -left-10 top-1 w-6 h-6 rounded-full ${dotColor} border-2 ring-4 flex items-center justify-center text-[10px] text-white z-10 shadow-lg">
                                <i class="fa-solid ${icon}"></i>
                            </div>

                            <div class="bg-slate-950 p-5 rounded-3xl border border-slate-800/80 shadow-md hover:border-slate-700 transition">
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div class="flex items-center space-x-2">
                                        <span class="text-sm font-bold text-white">${evt.Title}</span>
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${stageBadge}">${evt.Stage}</span>
                                    </div>
                                    <span class="text-xs font-mono text-emerald-400 font-semibold">${evt.Event_Date}</span>
                                </div>
                                <p class="text-xs text-slate-300 leading-relaxed">${evt.Description}</p>
                                ${evt.Stakeholder_Name ? `
                                    <div class="mt-3 pt-2 border-t border-slate-900 text-[11px] text-slate-400 flex items-center gap-1.5">
                                        <i class="fa-solid fa-circle-check text-emerald-400"></i>
                                        <span>Authenticated by: <strong class="text-slate-200">${evt.Stakeholder_Name}</strong> (${evt.Stakeholder_Type || 'Partner Hub'})</span>
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
                el.innerHTML = products.map(p => {
                    const persona = ITEM_HUMAN_PERSONAS[p.Product_ID];
                    const label = persona ? `${p.Product_ID} • ${persona.nickname} (${p.Status})` : `${p.Product_ID} - ${p.Model_Name} (${p.Status})`;
                    return `<option value="${p.Product_ID}">${label}</option>`;
                }).join('');
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
            showToast(`✨ Product Model "${payload.Name}" registered in SQL!`, 'success');
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
            showToast(`🎉 Physical device ${payload.Product_ID} issued with living passport!`, 'success');
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
            showToast(`🔧 Life-extending repair logged! Restored health to ${payload.New_State_of_Health}%.`, 'success');
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
            showToast(`🤝 Ownership handover recorded! Digital passport transferred.`, 'success');
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
            showToast(`⚙️ Component salvaged successfully for second life!`, 'success');
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
            showToast(`💎 Extracted material committed to closed-loop inventory!`, 'success');
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
// CIRCULARITY ANALYTICS & DASHBOARD (HUMANIZED)
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

        // Render Table with Human Context
        const tbody = document.getElementById('materialsAuditTableBody');
        if (tbody) {
            const humanMeanings = {
                'MAT-ALU-06': 'Recycled into new chassis; consumes 95% less energy than virgin bauxite smelting.',
                'MAT-COP-03': 'High-conductivity wiring returned to clean technology supply chain.',
                'MAT-LIT-01': 'Lithium salts neutralized safely under inert gas; prevents groundwater poisoning.',
                'MAT-COB-02': 'Critical cathode cobalt reclaimed without high-impact conflict mining.',
                'MAT-GLD-04': '0.76g of gold recovered = Enough for 150 computer chips without crushing 300kg rock ore.',
                'MAT-REE-07': 'Neodymium reclaimed for wind turbine and speaker permanent magnets.'
            };

            tbody.innerHTML = stats.materialsBreakdown.map(m => `
                <tr class="hover:bg-slate-950/40">
                    <td class="py-3 px-3 font-semibold text-white">${m.Material_Name}</td>
                    <td class="py-3 px-3 font-mono text-emerald-400 text-xs">${m.Material_ID}</td>
                    <td class="py-3 px-3 font-mono font-bold text-white">${m.TotalRecovered}</td>
                    <td class="py-3 px-3 text-slate-400 font-mono">${m.Unit}</td>
                    <td class="py-3 px-3 font-semibold text-teal-400">${m.AvgPurity.toFixed(1)}%</td>
                    <td class="py-3 px-3 text-slate-300 text-xs">${humanMeanings[m.Material_ID] || 'Circular raw material reclaimed.'}</td>
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
            labels: ['In Active Use', 'Under Repair', 'Recycled (Zero Landfill)'],
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

    statusEl.innerHTML = `<span class="text-amber-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Running query...</span>`;

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
                <div class="p-4 bg-red-950/40 rounded-2xl border border-red-800 text-red-300 font-mono text-xs">
                    <strong class="block mb-1">SQL Syntax / Constraint Error:</strong>
                    ${data.error}
                </div>
            `;
            return;
        }

        if (data.isSelect) {
            statusEl.innerHTML = `<span class="text-emerald-400"><i class="fa-solid fa-check mr-1"></i> Returned ${data.rowCount} rows</span>`;
            
            if (data.rowCount === 0) {
                wrapper.innerHTML = `<div class="p-6 text-xs text-slate-500 text-center">Query executed successfully. 0 rows returned.</div>`;
                return;
            }

            const thHtml = data.columns.map(c => `<th class="py-2.5 px-3">${c}</th>`).join('');
            const trHtml = data.rows.map(row => {
                const tds = data.columns.map(col => {
                    const val = row[col];
                    return `<td class="py-2.5 px-3 font-mono text-[11px]">${val !== null ? val : '<span class="text-slate-600">NULL</span>'}</td>`;
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
            wrapper.innerHTML = `<div class="p-4 bg-emerald-950/30 text-emerald-300 rounded-2xl border border-emerald-800 text-xs">${data.message}</div>`;
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
        showToast('Database reset and seeded with default gadgets!', 'success');
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
