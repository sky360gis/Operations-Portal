import React, { useState, useEffect } from 'react';
import logo from './assets/logo.png';

export default function LandingPage({ onGoToPortal }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // KML Generator States
  const [activeKmlOption, setActiveKmlOption] = useState('optionA');
  const [polygonName, setPolygonName] = useState('SKY360_Survey_Block');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [coordType, setCoordType] = useState('latlon');
  const [utmZone, setUtmZone] = useState('43N');
  const [rawTextCoords, setRawTextCoords] = useState(
    'Point_1, 12.9716, 77.5946\nPoint_2, 12.9750, 77.6000\nPoint_3, 12.9680, 77.6050'
  );
  const [sketchPreview, setSketchPreview] = useState(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrMessage, setOcrMessage] = useState('');
  const [sketchCoords, setSketchCoords] = useState([{ name: 'P1', lat: '', lon: '' }]);
  const [kmlOutput, setKmlOutput] = useState('');
  const [downloadReady, setDownloadReady] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // KML Helper Functions
  const convertUtmToLatLon = (easting, northing, zoneStr) => {
    const zoneNum = parseInt(zoneStr.replace(/\D/g, '')) || 43;
    const isNorth = !zoneStr.toLowerCase().includes('s');
    const x = easting - 500000;
    const y = isNorth ? northing : northing - 10000000;
    const k0 = 0.9996;
    const a = 6378137.0;
    const e = 0.081819191;
    const eSquare = e * e;
    const lonOrigin = (zoneNum - 1) * 6 - 180 + 3;
    const arc = y / k0;
    const mu = arc / (a * (1 - eSquare / 4 - 3 * eSquare * eSquare / 64));
    const latRad = mu + (3 * e / 2 - 27 * Math.pow(e, 3) / 32) * Math.sin(2 * mu);
    const lonRad = (x / (a * k0)) / Math.cos(latRad);
    const lat = latRad * (180 / Math.PI);
    const lon = lonOrigin + lonRad * (180 / Math.PI);
    return { lat, lon };
  };

  const generateKmlStructure = (pointList) => {
    let coordinatesString = '';
    let placemarksXml = '';
    pointList.forEach((pt) => {
      coordinatesString += `${pt.lon},${pt.lat},0 `;
      placemarksXml += `
    <Placemark>
      <name>${pt.name}</name>
      <Point>
        <coordinates>${pt.lon},${pt.lat},0</coordinates>
      </Point>
    </Placemark>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${polygonName}</name>
    <description>Generated via SKY360 Solutions Geospatial Suite</description>
    <Style id="sky360Style">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>7f00ff00</color>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>${polygonName} Boundary</name>
      <styleUrl>#sky360Style</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordinatesString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    ${placemarksXml}
  </Document>
</kml>`;
  };

  const openKmlInNewWindow = (kmlContent) => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Generated KML Output - ${polygonName}</title>
            <style>
              body { font-family: sans-serif; padding: 30px; background: #0f172a; color: #f8fafc; }
              h2 { color: #38bdf8; }
              pre { background: #1e293b; color: #38bdf8; padding: 20px; border: 1px solid #334155; border-radius: 8px; overflow: auto; max-height: 450px; font-size: 13px; }
              button { padding: 12px 24px; background: #22c55e; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 20px; }
              button:hover { background: #16a34a; }
            </style>
          </head>
          <body>
            <h2>🗺️ Generated KML Source Code</h2>
            <p>Project Identifier: <strong>${polygonName}</strong></p>
            <pre>${kmlContent.replace(/</g, '<').replace(/>/g, '>')}</pre>
            <button onclick="window.print()">Print / Save as PDF 📄</button>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  const handleProcessOptionA = () => {
    if (!uploadedFile) {
      alert('Please select a valid CSV or TXT coordinate file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/);
      const parsedPoints = [];
      lines.forEach((line) => {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const name = parts[0].trim();
          const val1 = parseFloat(parts[1].trim());
          const val2 = parseFloat(parts[2].trim());
          if (!isNaN(val1) && !isNaN(val2)) {
            if (coordType === 'utm') {
              const { lat, lon } = convertUtmToLatLon(val1, val2, utmZone);
              parsedPoints.push({ name, lat, lon });
            } else {
              parsedPoints.push({ name, lat: val1, lon: val2 });
            }
          }
        }
      });
      if (parsedPoints.length === 0) {
        alert('Could not parse valid coordinate rows from file.');
        return;
      }
      const kml = generateKmlStructure(parsedPoints);
      setKmlOutput(kml);
      setDownloadReady(true);
      openKmlInNewWindow(kml);
    };
    reader.readAsText(uploadedFile);
  };

  const handleProcessOptionB = () => {
    const lines = rawTextCoords.trim().split(/\r?\n/);
    const parsedPoints = [];
    lines.forEach((line) => {
      const parts = line.split(',');
      if (parts.length >= 3) {
        const name = parts[0].trim();
        const lat = parseFloat(parts[1].trim());
        const lon = parseFloat(parts[2].trim());
        if (!isNaN(lat) && !isNaN(lon)) {
          parsedPoints.push({ name, lat, lon });
        }
      }
    });
    if (parsedPoints.length === 0) {
      alert('Please enter valid coordinate data.');
      return;
    }
    const kml = generateKmlStructure(parsedPoints);
    setKmlOutput(kml);
    setDownloadReady(true);
    openKmlInNewWindow(kml);
  };

  const handleProcessOptionC = () => {
    const parsedPoints = sketchCoords
      .map(row => ({ name: row.name.trim(), lat: parseFloat(row.lat), lon: parseFloat(row.lon) }))
      .filter(row => row.name && !isNaN(row.lat) && !isNaN(row.lon));

    if (parsedPoints.length === 0) {
      alert('Please enter at least one valid coordinate entry.');
      return;
    }
    const kml = generateKmlStructure(parsedPoints);
    setKmlOutput(kml);
    setDownloadReady(true);
    openKmlInNewWindow(kml);
  };

  const handleDownloadKml = () => {
    const blob = new Blob([kmlOutput], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${polygonName.replace(/\s+/g, '_')}_survey.kml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSketchFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.includes('image')) {
      setSketchPreview(URL.createObjectURL(file));
    } else {
      setSketchPreview('PDF Document Attached: ' + file.name);
      setOcrMessage('PDF preview attached. Verify parsed points below.');
      return;
    }

    setIsOcrProcessing(true);
    setOcrMessage('Scanning map drawing via OCR engine...');

    try {
      if (!window.Tesseract) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const worker = await window.Tesseract.createWorker('eng');
      const ret = await worker.recognize(file);
      await worker.terminate();

      const lines = ret.data.text.split(/\r?\n/);
      const extractedPoints = [];
      let pointCounter = 1;

      lines.forEach((line) => {
        const numbers = line.match(/\d+\.\d{3,}/g);
        if (numbers && numbers.length >= 2) {
          extractedPoints.push({
            name: `Point_${pointCounter++}`,
            lat: numbers[0],
            lon: numbers[1]
          });
        }
      });

      if (extractedPoints.length > 0) {
        setSketchCoords(extractedPoints);
        setOcrMessage(`✅ Successfully extracted ${extractedPoints.length} coordinate points!`);
      } else {
        setOcrMessage('⚠️ Could not automatically detect coordinates. Please input manually below.');
      }
    } catch (err) {
      setOcrMessage('⚠️ Error reading image text. Enter values manually below.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#f8fafc', boxSizing: 'border-box' }}>
      
      {/* Top Header */}
      <header style={{ 
        backgroundColor: '#1e293b', 
        borderBottom: '1px solid #334155', 
        padding: '16px 30px', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '15px', 
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logo} alt="SKY360 Logo" style={{ height: '55px', width: 'auto', objectFit: 'contain' }} />
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="#services" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>Solutions</a>
          <a href="#kml-tool" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>KML Tool</a>
          <button 
            onClick={onGoToPortal}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#0284c7', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: '600', 
              fontSize: '13px', 
              cursor: 'pointer', 
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              transition: 'background 0.2s'
            }}
          >
            Operations Portal →
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderBottom: '1px solid #334155' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <span style={{ backgroundColor: 'rgba(2, 132, 199, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', display: 'inline-block', marginBottom: '20px' }}>
            Enterprise Geospatial Intelligence & Aerial Mapping
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 50px)', color: '#ffffff', margin: '0 0 20px 0', fontWeight: '800', lineHeight: '1.15' }}>
            Transforming Physical Infrastructure With Precision Drone Data
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#94a3b8', lineHeight: '1.6', marginBottom: '35px', maxWidth: '750px', margin: '0 auto 35px auto' }}>
            SKY360 Solutions delivers millimeter-accurate DGPS geodetic surveys, autonomous drone photogrammetry, and mining volumetric audits across Karnataka and South India.
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#kml-tool" style={{ padding: '14px 28px', backgroundColor: '#22c55e', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)' }}>
              Launch KML Generator 🗺️
            </a>
            <a href="#services" style={{ padding: '14px 28px', backgroundColor: '#334155', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Explore Solutions
            </a>
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="services" style={{ padding: '70px 20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '28px', color: '#ffffff', marginBottom: '10px', fontWeight: '700' }}>Core Industry Solutions</h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Engineered for regulatory compliance, mining leases, and large-scale engineering projects.</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px' }}>
          
          <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>🚁</div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#ffffff' }}>UAV Drone Photogrammetry</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6' }}>
              High-resolution aerial orthomosaics, 3D textured point clouds, DEM/DSM generation, and centimeter-level contour mapping for infrastructure planning.
            </p>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>📡</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#ffffff' }}>DGPS & CORS Network Surveys</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6' }}>
              Precise ground control point (GCP) establishment, static & kinematic GNSS post-processing, and Survey of India CORS alignment.
            </p>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>⛏️</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#ffffff' }}>Mining & Riverbed Audits</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6' }}>
              Authorized minor mineral boundary demarcation, river basin sand block estimation (such as Kagina River basin surveys), and stock pile volumetric calculations.
            </p>
          </div>

        </div>
      </section>

      {/* KML GENERATOR SUITE (EMBEDDED INTERACTIVE TOOL) */}
      <section id="kml-tool" style={{ padding: '40px 20px 80px 20px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#1e293b', padding: '35px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid #334155' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '4px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
              Interactive Client Utility
            </span>
            <h3 style={{ margin: '12px 0 6px 0', color: '#ffffff', fontSize: '24px' }}>Geospatial KML Coordinate Generator</h3>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#94a3b8' }}>
              Convert CSV files, raw text arrays, or scanned survey sketches into instant Google Earth KML files with live window previews.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>Survey Block / Project Name</label>
            <input type="text" value={polygonName} onChange={(e) => setPolygonName(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #475569', fontSize: '13.5px', backgroundColor: '#0f172a', color: '#fff', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => { setActiveKmlOption('optionA'); setDownloadReady(false); }} style={{ padding: '12px', backgroundColor: activeKmlOption === 'optionA' ? '#0284c7' : '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              📄 CSV / TXT File
            </button>
            <button onClick={() => { setActiveKmlOption('optionB'); setDownloadReady(false); }} style={{ padding: '12px', backgroundColor: activeKmlOption === 'optionB' ? '#0284c7' : '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              ✍️ Raw Text Input
            </button>
            <button onClick={() => { setActiveKmlOption('optionC'); setDownloadReady(false); }} style={{ padding: '12px', backgroundColor: activeKmlOption === 'optionC' ? '#0284c7' : '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              🖼️ Sketch OCR Reader
            </button>
          </div>

          {activeKmlOption === 'optionA' && (
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#f8fafc' }}>Upload Coordinate Dataset (CSV / TXT)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#94a3b8' }}>Format Type</label>
                  <select value={coordType} onChange={(e) => setCoordType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', fontSize: '13px', backgroundColor: '#1e293b', color: '#fff' }}>
                    <option value="latlon">Lat / Lon (Decimal Degrees)</option>
                    <option value="utm">UTM Coordinates (Easting / Northing)</option>
                  </select>
                </div>
                {coordType === 'utm' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#94a3b8' }}>UTM Zone</label>
                    <select value={utmZone} onChange={(e) => setUtmZone(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #475569', fontSize: '13px', backgroundColor: '#1e293b', color: '#fff' }}>
                      <option value="43N">Zone 43N (Karnataka / South India)</option>
                      <option value="44N">Zone 44N (East Coast India)</option>
                    </select>
                  </div>
                )}
              </div>
              <input type="file" accept=".csv, .txt" onChange={(e) => setUploadedFile(e.target.files[0])} style={{ width: '100%', padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px', border: '1px solid #475569', fontSize: '13px', color: '#fff', marginBottom: '15px' }} />
              <button onClick={handleProcessOptionA} style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Generate KML & Open Popup Window ⚙️
              </button>
            </div>
          )}

          {activeKmlOption === 'optionB' && (
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#f8fafc' }}>Paste Coordinates (Name, Lat, Lon)</h4>
              <textarea rows="6" value={rawTextCoords} onChange={(e) => setRawTextCoords(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #475569', fontSize: '13px', fontFamily: 'monospace', backgroundColor: '#1e293b', color: '#38bdf8', boxSizing: 'border-box', marginBottom: '15px' }} />
              <button onClick={handleProcessOptionB} style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Generate KML & Open Popup Window ⚙️
              </button>
            </div>
          )}

          {activeKmlOption === 'optionC' && (
            <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#f8fafc' }}>Upload Survey Map / Sketch Image</h4>
              <input type="file" accept="image/*, application/pdf" onChange={handleSketchFileUpload} style={{ width: '100%', padding: '10px', backgroundColor: '#1e293b', borderRadius: '6px', border: '1px solid #475569', fontSize: '13px', color: '#fff', marginBottom: '15px' }} />
              
              {sketchPreview && (
                <div style={{ marginBottom: '15px', textAlign: 'center', backgroundColor: '#1e293b', padding: '10px', borderRadius: '6px' }}>
                  {typeof sketchPreview === 'string' && sketchPreview.startsWith('blob:') ? (
                    <img src={sketchPreview} alt="Survey Sketch" style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (
                    <p style={{ margin: 0, fontSize: '13px', color: '#38bdf8', fontWeight: '600' }}>{sketchPreview}</p>
                  )}
                </div>
              )}

              {isOcrProcessing && <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8', borderRadius: '6px', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>⏳ {ocrMessage}</div>}
              {!isOcrProcessing && ocrMessage && <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#1e293b', color: '#cbd5e1', borderRadius: '6px', fontSize: '12px', textAlign: 'center', border: '1px solid #475569' }}>{ocrMessage}</div>}

              <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#334155' }}>
                      <th style={{ padding: '8px', color: '#38bdf8' }}>Point Name</th>
                      <th style={{ padding: '8px', color: '#38bdf8' }}>Latitude</th>
                      <th style={{ padding: '8px', color: '#38bdf8' }}>Longitude</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sketchCoords.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '6px' }}><input type="text" value={row.name} onChange={(e) => { const u = [...sketchCoords]; u[idx].name = e.target.value; setSketchCoords(u); }} style={{ width: '90%', padding: '6px', borderRadius: '4px', border: '1px solid #475569', background: '#1e293b', color: '#fff' }} /></td>
                        <td style={{ padding: '6px' }}><input type="text" value={row.lat} onChange={(e) => { const u = [...sketchCoords]; u[idx].lat = e.target.value; setSketchCoords(u); }} style={{ width: '90%', padding: '6px', borderRadius: '4px', border: '1px solid #475569', background: '#1e293b', color: '#fff' }} /></td>
                        <td style={{ padding: '6px' }}><input type="text" value={row.lon} onChange={(e) => { const u = [...sketchCoords]; u[idx].lon = e.target.value; setSketchCoords(u); }} style={{ width: '90%', padding: '6px', borderRadius: '4px', border: '1px solid #475569', background: '#1e293b', color: '#fff' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={() => setSketchCoords([...sketchCoords, { name: `P${sketchCoords.length + 1}`, lat: '', lon: '' }])} style={{ padding: '6px 12px', backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#fff', marginBottom: '15px' }}>
                + Add Point Row
              </button>

              <button onClick={handleProcessOptionC} style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Generate KML & Open Popup Window ⚙️
              </button>
            </div>
          )}

          {downloadReady && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', color: '#4ade80', fontSize: '13.5px', fontWeight: '600' }}>
                ✅ KML file compiled successfully and opened in a separate preview window!
              </p>
              <button onClick={handleDownloadKml} style={{ padding: '10px 20px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                Download KML File 📥
              </button>
            </div>
          )}

        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0b0f19', color: '#64748b', padding: '30px 20px', textAlign: 'center', fontSize: '12px', borderTop: '1px solid #334155' }}>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} SKY360 Solutions. All Rights Reserved. | DGPS Surveys & Drone Photogrammetry | Bengaluru, Karnataka</p>
      </footer>

    </div>
  );
}