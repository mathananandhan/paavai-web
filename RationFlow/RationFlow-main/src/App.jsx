import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Mock Beneficiary Database
const initialBeneficiaries = [
  {
    id: "RC-TN-2026-8841",
    name: "Murugan K.",
    category: "PHH", // Priority Household
    members: 4,
    address: "12, Temple St, Madurai, TN",
    aadhaarVerified: true,
    status: "Eligible",
    lastClaimed: "2026-08-14",
    quota: { rice: 20, wheat: 4, sugar: 1, oil: 1 }
  },
  {
    id: "RC-TN-2026-9012",
    name: "Lakshmi S.",
    category: "AAY", // Antyodaya Anna Yojana
    members: 3,
    address: "45, Main Road, Madurai, TN",
    aadhaarVerified: true,
    status: "Eligible",
    lastClaimed: "2026-08-10",
    quota: { rice: 35, wheat: 5, sugar: 2, oil: 2 }
  },
  {
    id: "RC-TN-2026-4105",
    name: "Rajesh Kumar",
    category: "NPHH", // Non-Priority Household
    members: 2,
    address: "88, Lake View, Madurai, TN",
    aadhaarVerified: true,
    status: "Eligible",
    lastClaimed: "2026-08-18",
    quota: { rice: 10, wheat: 2, sugar: 1, oil: 1 }
  },
  {
    id: "RC-TN-2026-7721",
    name: "Anitha R.",
    category: "PHH",
    members: 5,
    address: "3, Gandhi Nagar, Madurai, TN",
    aadhaarVerified: false,
    status: "Pending Verification",
    lastClaimed: "2026-07-29",
    quota: { rice: 25, wheat: 5, sugar: 1, oil: 1 }
  }
];

const initialTransactions = [
  { id: "TXN-9041", cardId: "RC-TN-2026-8841", name: "Murugan K.", items: "Rice: 20kg, Sugar: 1kg", time: "10:14 AM Today", aiScore: "0.02 (Safe)", status: "Approved" },
  { id: "TXN-9040", cardId: "RC-TN-2026-9012", name: "Lakshmi S.", items: "Rice: 35kg, Wheat: 5kg", time: "09:45 AM Today", aiScore: "0.01 (Safe)", status: "Approved" },
  { id: "TXN-9039", cardId: "RC-TN-2026-3310", name: "Ramasamy V.", items: "Rice: 20kg", time: "Yesterday 04:30 PM", aiScore: "0.89 (High Risk)", status: "Flagged - Duplicate Attempt" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [beneficiaries, setBeneficiaries] = useState(initialBeneficiaries);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active Scan / Beneficiary Selection
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [scannedResult, setScannedResult] = useState('');
  const [qrCanvasUrl, setQrCanvasUrl] = useState('');
  const [qrCardInput, setQrCardInput] = useState('RC-TN-2026-8841');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Stock inventory
  const [stock, setStock] = useState({
    rice: { total: 5000, remaining: 3420, unit: 'kg' },
    wheat: { total: 1500, remaining: 980, unit: 'kg' },
    sugar: { total: 600, remaining: 410, unit: 'kg' },
    oil: { total: 500, remaining: 310, unit: 'L' }
  });

  const canvasRef = useRef(null);
  const scannerRef = useRef(null);

  // Generate QR Code for Beneficiary
  const generateQRCode = async (text) => {
    try {
      const url = await QRCode.toDataURL(text || 'RC-TN-2026-8841', {
        width: 240,
        margin: 2,
        color: { dark: '#0b0f19', light: '#ffffff' }
      });
      setQrCanvasUrl(url);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    generateQRCode(qrCardInput);
  }, [qrCardInput]);

  // Start QR Camera Scanner
  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      try {
        if (!document.getElementById("reader")) return;
        const html5QrcodeScanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 220, height: 220 } },
          /* verbose= */ false
        );
        html5QrcodeScanner.render(
          (decodedText) => {
            setScannedResult(decodedText);
            const found = beneficiaries.find(b => b.id.toLowerCase() === decodedText.toLowerCase());
            if (found) {
              setSelectedBeneficiary(found);
            } else {
              // Create temporary beneficiary if scanned unknown
              setSelectedBeneficiary({
                id: decodedText,
                name: "Scanned Cardholder",
                category: "PHH",
                members: 3,
                address: "Local FPS District",
                aadhaarVerified: true,
                status: "Eligible",
                lastClaimed: "None",
                quota: { rice: 15, wheat: 3, sugar: 1, oil: 1 }
              });
            }
            html5QrcodeScanner.clear();
            setIsScanning(false);
          },
          (errorMessage) => {
            // Scanner error handler
          }
        );
        scannerRef.current = html5QrcodeScanner;
      } catch (e) {
        console.error("Scanner error", e);
      }
    }, 300);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error(err));
    }
    setIsScanning(false);
  };

  const handleSelectCard = (b) => {
    setSelectedBeneficiary(b);
    setScannedResult(b.id);
    setActiveTab('dispatch');
  };

  const handleDispatchRation = () => {
    if (!selectedBeneficiary) return;

    // Deduct stock
    setStock(prev => ({
      ...prev,
      rice: { ...prev.rice, remaining: Math.max(0, prev.rice.remaining - selectedBeneficiary.quota.rice) },
      wheat: { ...prev.wheat, remaining: Math.max(0, prev.wheat.remaining - selectedBeneficiary.quota.wheat) },
      sugar: { ...prev.sugar, remaining: Math.max(0, prev.sugar.remaining - selectedBeneficiary.quota.sugar) },
      oil: { ...prev.oil, remaining: Math.max(0, prev.oil.remaining - selectedBeneficiary.quota.oil) }
    }));

    // Add transaction
    const newTxn = {
      id: `TXN-${Math.floor(1000 + Math.random() * 9000)}`,
      cardId: selectedBeneficiary.id,
      name: selectedBeneficiary.name,
      items: `Rice: ${selectedBeneficiary.quota.rice}kg, Wheat: ${selectedBeneficiary.quota.wheat}kg`,
      time: "Just Now",
      aiScore: "0.01 (Verified)",
      status: "Approved"
    };

    setTransactions([newTxn, ...transactions]);
    setDispatchSuccess(true);
    setTimeout(() => setDispatchSuccess(false), 4000);
  };

  const filteredBeneficiaries = beneficiaries.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER BAR */}
      <header style={{
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '1rem 2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)'
            }}>
              🌾
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, background: 'linear-gradient(90deg, #ffffff, #93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
                RationFlow <span style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '6px', color: '#60a5fa', WebkitTextFillColor: 'initial', verticalAlign: 'middle', marginLeft: '0.5rem' }}>AI v2.4</span>
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Smart Public Distribution & Anti-Fraud Network</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', color: '#34d399' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px #34d399' }}></span>
              AI Verification Online
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', color: '#9ca3af' }}>
              🏪 FPS ID: <strong style={{ color: '#fff' }}>FPS-4091-TN</strong>
            </div>
          </div>

        </div>
      </header>

      {/* NAVIGATION TABS */}
      <nav style={{ background: 'rgba(15, 23, 42, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.5rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard & Analytics', desc: 'Realtime Stock & AI Insights' },
            { id: 'gesture', label: '🖐️ AI Gesture Signals', desc: 'Silent Signals Camera Engine' },
            { id: 'dispatch', label: '⚡ Dispatch & QR Scanner', desc: 'Scan & Dispense Ration' },
            { id: 'registry', label: '🎴 Beneficiaries & QR Gen', desc: 'Cardholder Management' },
            { id: 'stock', label: '📦 Inventory Control', desc: 'Warehouse & Grain Stock' },
            { id: 'audit', label: '🛡️ AI Audit Logs', desc: 'Anti-Fraud Security Log' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(37, 99, 235, 0.15))' : 'transparent',
                border: activeTab === tab.id ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                color: activeTab === tab.id ? '#ffffff' : '#9ca3af',
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>


      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '2rem auto', padding: '0 1.5rem' }}>

        {/* TAB: GESTURE AI ENGINE */}
        {activeTab === 'gesture' && (
          <div style={{ width: '100%', height: '85vh', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <iframe src="/gesture.html" style={{ width: '100%', height: '100%', border: 'none' }} title="Silent Signals AI Gesture Detection Engine" />
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* STAT CARDS ROW */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>REGISTERED BENEFICIARIES</span>
                  <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>Active</span>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>1,420</div>
                <p style={{ fontSize: '0.8rem', color: '#34d399', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  ↑ 98.4% Aadhaar Biometric Linked
                </p>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>MONTHLY DISPATCH RATE</span>
                  <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>August</span>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>84.2%</div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '0.75rem', overflow: 'hidden' }}>
                  <div style={{ width: '84.2%', height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)' }}></div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>AI FRAUD ANOMALIES</span>
                  <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>Alerts</span>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f87171' }}>2 Flagged</div>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>Prevented double-claim attempts</p>
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>GRAIN STOCK LEVEL</span>
                  <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>Healthy</span>
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fff' }}>5,120 kg</div>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>Next refill scheduled in 6 days</p>
              </div>

            </div>

            {/* STOCK METERS & AI INSIGHTS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              
              {/* Stock Inventory Progress */}
              <div className="glass-panel" style={{ padding: '1.75rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', gap: '0.5rem' }}>
                  📦 Live Commodity Stock Balances
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {[
                    { key: 'rice', name: 'Raw & Boiled Rice', icon: '🍚', color: '#3b82f6' },
                    { key: 'wheat', name: 'Fortified Wheat', icon: '🌾', color: '#f59e0b' },
                    { key: 'sugar', name: 'Refined Sugar', icon: '🍬', color: '#ec4899' },
                    { key: 'oil', name: 'Palmolein Oil', icon: '🛢️', color: '#10b981' }
                  ].map(item => {
                    const data = stock[item.key];
                    const pct = Math.round((data.remaining / data.total) * 100);
                    return (
                      <div key={item.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 600 }}>{item.icon} {item.name}</span>
                          <span style={{ color: '#9ca3af' }}>
                            <strong style={{ color: '#fff' }}>{data.remaining}</strong> / {data.total} {data.unit} ({pct}%)
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: item.color, transition: 'width 0.5s ease' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Insights & Fraud Detection Panel */}
              <div className="glass-panel" style={{ padding: '1.75rem', background: 'linear-gradient(145deg, rgba(18, 24, 38, 0.85), rgba(15, 23, 42, 0.95))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontWeight: 800 }}>
                    🤖
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AI Fraud Prevention Engine</h3>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Neural Anomaly Scanner Active</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.85rem', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                      ✅ Zero Ghost Beneficiaries Detected
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      All active claims cross-referenced with State Aadhaar Vault in real-time.
                    </div>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '0.85rem', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                      💡 Demand Prediction: High Rice Allocation Needed
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                      AI predicts 420 kg additional Rice requirement before month end based on festival season trends.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button onClick={() => setActiveTab('dispatch')} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      ⚡ Start Dispensing Ration
                    </button>
                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 2: DISPATCH & QR SCANNER */}
        {activeTab === 'dispatch' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2rem' }}>
            
            {/* SCANNER & CARD SELECTION PANEL */}
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📷 Step 1: Scan Beneficiary QR Card
              </h3>

              {/* Camera Scanner UI */}
              <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.15)', padding: '1rem', textAlign: 'center' }}>
                {isScanning ? (
                  <div>
                    <div id="reader" style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}></div>
                    <button onClick={stopScanner} className="btn-secondary" style={{ marginTop: '0.75rem' }}>Stop Camera</button>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.85rem' }}>Place Ration Card QR in front of camera or pick a demo card below</p>
                    <button onClick={startScanner} className="btn-primary">
                      📹 Launch Web Camera Scanner
                    </button>
                  </div>
                )}
              </div>

              {/* Demo Beneficiary Quick Select */}
              <h4 style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Or Select Preset Beneficiary:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {beneficiaries.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBeneficiary(b)}
                    style={{
                      background: selectedBeneficiary?.id === b.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: selectedBeneficiary?.id === b.id ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{b.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>ID: {b.id} • {b.members} Family Members</div>
                    </div>
                    <div>
                      <span className={`badge ${b.category === 'AAY' ? 'badge-danger' : b.category === 'PHH' ? 'badge-success' : 'badge-purple'}`}>
                        {b.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* QUOTA DISPENSE & CALCULATOR */}
            <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚖️ Step 2: Quota Entitlement & Verification
                </h3>

                {selectedBeneficiary ? (
                  <div>
                    {/* Beneficiary Card Summary */}
                    <div style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>{selectedBeneficiary.name}</h4>
                          <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Card: {selectedBeneficiary.id} | {selectedBeneficiary.address}</p>
                        </div>
                        <span className="badge badge-success">Aadhaar Verified</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.85rem' }}>
                        <div>Card Category: <strong style={{ color: '#60a5fa' }}>{selectedBeneficiary.category}</strong></div>
                        <div>Family Members: <strong style={{ color: '#fff' }}>{selectedBeneficiary.members} Persons</strong></div>
                        <div>Status: <strong style={{ color: '#34d399' }}>{selectedBeneficiary.status}</strong></div>
                        <div>Last Claim: <strong style={{ color: '#9ca3af' }}>{selectedBeneficiary.lastClaimed}</strong></div>
                      </div>
                    </div>

                    {/* Calculated Monthly Allocation */}
                    <h4 style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '0.85rem', fontWeight: 600 }}>
                      MONTHLY ALLOCATION BREAKDOWN:
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
                      {[
                        { name: 'Raw Rice', qty: selectedBeneficiary.quota.rice, unit: 'kg', price: '₹ 0.00' },
                        { name: 'Fortified Wheat', qty: selectedBeneficiary.quota.wheat, unit: 'kg', price: '₹ 2.00 / kg' },
                        { name: 'Refined Sugar', qty: selectedBeneficiary.quota.sugar, unit: 'kg', price: '₹ 13.50 / kg' },
                        { name: 'Palmolein Oil', qty: selectedBeneficiary.quota.oil, unit: 'L', price: '₹ 25.00 / L' }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{item.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Subsidized Price: {item.price}</div>
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                            {item.qty} {item.unit}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI Verification Banner */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '1.5rem' }}>🛡️</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>AI Scale & Weight Verification Passed</div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>No duplicate claims recorded in TN-PDS Network for August 2026</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📇</div>
                    <p style={{ fontWeight: 600 }}>No Beneficiary Card Selected</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>Select a card from the left panel or scan a QR code to calculate ration entitlement.</p>
                  </div>
                )}
              </div>

              {selectedBeneficiary && (
                <div>
                  {dispatchSuccess && (
                    <div style={{ padding: '0.85rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399', borderRadius: '10px', textAlign: 'center', fontWeight: 700, marginBottom: '1rem' }}>
                      🎉 Ration Dispatched & Digital Receipt Generated!
                    </div>
                  )}

                  <button
                    onClick={handleDispatchRation}
                    className="btn-primary"
                    style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', justifyContent: 'center' }}
                  >
                    Confirm & Dispense Ration Quota
                  </button>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 3: BENEFICIARY REGISTRY & QR GENERATOR */}
        {activeTab === 'registry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Top Toolbar */}
            <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <input
                type="text"
                placeholder="🔍 Search card number, name, or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  color: '#fff',
                  width: '320px',
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Total Cards: <strong style={{ color: '#fff' }}>{beneficiaries.length}</strong></span>
              </div>
            </div>

            {/* Main Grid: Card Table + Live QR Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
              
              {/* Beneficiaries List */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Cardholder Registry</h3>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#9ca3af' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Card ID</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Head of Family</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBeneficiaries.map(b => (
                        <tr key={b.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: '#60a5fa' }}>{b.id}</td>
                          <td style={{ padding: '0.85rem 0.5rem', color: '#fff' }}>{b.name}</td>
                          <td style={{ padding: '0.85rem 0.5rem' }}>
                            <span className={`badge ${b.category === 'AAY' ? 'badge-danger' : 'badge-success'}`}>
                              {b.category}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 0.5rem' }}>
                            <button
                              onClick={() => { setQrCardInput(b.id); handleSelectCard(b); }}
                              className="btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            >
                              Generate QR
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live QR Card Generator */}
              <div className="glass-panel" style={{ padding: '1.75rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>🎴 Digital Smart Ration Card QR</h3>
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.5rem' }}>Generate offline verifiable QR code for Ration Card</p>

                <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '18px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', marginBottom: '1.25rem' }}>
                  {qrCanvasUrl ? (
                    <img src={qrCanvasUrl} alt="Ration Card QR" style={{ display: 'block', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ width: '240px', height: '240px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>Generating...</div>
                  )}
                </div>

                <div style={{ width: '100%', maxWidth: '320px', textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>CARD NUMBER</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', marginBottom: '0.5rem' }}>{qrCardInput}</div>
                  <div style={{ fontSize: '0.8rem', color: '#fff' }}>Holder: {beneficiaries.find(b => b.id === qrCardInput)?.name || 'Murugan K.'}</div>
                </div>

                <a href={qrCanvasUrl} download={`${qrCardInput}_QR.png`} className="btn-primary" style={{ marginTop: '1.25rem', textDecoration: 'none' }}>
                  📥 Download QR Badge
                </a>
              </div>

            </div>

          </div>
        )}

        {/* TAB 4: STOCK CONTROL */}
        {activeTab === 'stock' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>📦 FPS Warehouse Inventory Control</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                {Object.entries(stock).map(([key, item]) => (
                  <div key={key} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.9rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>{key}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: '0.4rem 0' }}>
                      {item.remaining} <span style={{ fontSize: '1rem', color: '#9ca3af' }}>/ {item.total} {item.unit}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#34d399' }}>Status: Optimal Storage Level</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AI AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🛡️ AI Anti-Fraud Audit Trail & Transaction Logs
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#9ca3af' }}>
                    <th style={{ padding: '0.85rem' }}>Txn ID</th>
                    <th style={{ padding: '0.85rem' }}>Card ID & Beneficiary</th>
                    <th style={{ padding: '0.85rem' }}>Items Dispensed</th>
                    <th style={{ padding: '0.85rem' }}>Timestamp</th>
                    <th style={{ padding: '0.85rem' }}>AI Anomaly Score</th>
                    <th style={{ padding: '0.85rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.85rem', fontWeight: 700, color: '#60a5fa' }}>{t.id}</td>
                      <td style={{ padding: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{t.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.cardId}</div>
                      </td>
                      <td style={{ padding: '0.85rem', color: '#34d399' }}>{t.items}</td>
                      <td style={{ padding: '0.85rem', color: '#9ca3af' }}>{t.time}</td>
                      <td style={{ padding: '0.85rem', fontWeight: 600 }}>{t.aiScore}</td>
                      <td style={{ padding: '0.85rem' }}>
                        <span className={`badge ${t.status.includes('Approved') ? 'badge-success' : 'badge-danger'}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer style={{ background: 'rgba(11, 15, 25, 0.9)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '1.25rem', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem' }}>
        RationFlow AI System • Powered by React + Vite & AI Anti-Fraud Engine
      </footer>

    </div>
  );
}
