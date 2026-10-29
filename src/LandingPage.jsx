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
        <color>ff00dc52</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>7f52c4b9</color>
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
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; background: #f8fafc; color: #1e293b; }
              h2 { color: #0d9488; }
              pre { background: #ffffff; color: #0f766e; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: auto; max-height: 480px; font-size: 13px; }
              button { padding: 12px 24px; background: #0d9488; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 20px; }
              button:hover { background: #0f766e; }
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* 1. TOP NAVIGATION BAR */}
      <header style={{ 
        backgroundColor: '#ffffff', 
        borderBottom: '1px solid #e2e8f0', 
        padding: '12px 30px', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '15px', 
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logo} alt="SKY360 Logo" style={{ height: '60px', width: 'auto', objectFit: 'contain' }} />
        </div>

        <nav style={{ display: 'flex', gap: '25px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="#solutions" style={{ color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>Solutions</a>
          <a href="#platform" style={{ color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>Platform & Analytics</a>
          <a href="#process" style={{ color: '#475569', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>Workflow</a>
          <a href="#kml-tool" style={{ color: '#0d9488', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>KML Generator</a>
          <button 
            onClick={onGoToPortal}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#0d9488', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: '600', 
              fontSize: '13px', 
              cursor: 'pointer', 
              boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Operations Portal →</span>
          </button>
        </nav>
      </header>

      {/* 2. HERO SECTION */}
      <section style={{ padding: '75px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block', marginBottom: '20px' }}>
            Precision Drone Surveying & Geospatial Analytics
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', color: '#0f172a', margin: '0 0 20px 0', fontWeight: '800', lineHeight: '1.2', letterSpacing: '-0.5px' }}>
            Actionable Drone Data & Geodetic Intelligence For Infrastructure
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#475569', lineHeight: '1.6', marginBottom: '35px', maxWidth: '780px', margin: '0 auto 35px auto' }}>
            SKY360 Solutions combines state-of-the-art UAV photogrammetry, millimeter-accurate DGPS geodetic surveys, and compliance volume estimation across mining, river basins, and government infrastructure projects.
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#kml-tool" style={{ padding: '12px 28px', backgroundColor: '#0d9488', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)' }}>
              Open KML Generator 🗺️
            </a>
            <a href="#solutions" style={{ padding: '12px 28px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Explore Capabilities
            </a>
          </div>
        </div>
      </section>

      {/* 3. KEY METRICS & IMPACT BANNER */}
      <section style={{ backgroundColor: '#f0fdf4', padding: '35px 20px', borderBottom: '1px solid #99f6e4' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '20px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f766e' }}>17+ Yrs</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>Project Management Leadership</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f766e' }}>470+</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>Ground Control Points Established</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f766e' }}>74+ KM</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>River Basin Mapped (Kagina Basin)</div>
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f766e' }}>MM-Level</div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>DGPS CORS Survey Accuracy</div>
          </div>
        </div>
      </section>

      {/* 4. INDUSTRY SOLUTIONS SECTION */}
      <section id="solutions" style={{ padding: '60px 20px', maxWidth: '1150px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '45px' }}>
          <h2 style={{ fontSize: '26px', color: '#0f766e', fontWeight: '700', marginBottom: '10px' }}>Tailored Industry Solutions</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>End-to-end aerial surveys compliant with Karnataka mining & land revenue frameworks.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>⛏️</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#0f172a' }}>Mining Volumetrics & Audits</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
              High-accuracy stock pile volume calculations, pit extraction audits, and sand block demarcation authorized by Department of Mines and Geology.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>🌊</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#0f172a' }}>River Basin & Bathymetry</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
              Hydrographic riverbed surveys, cross-section profiling, reservoir capacity estimation, and bathymetric sonar depth modeling.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>🛣️</div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#0f172a' }}>Highways & Infrastructure</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
              Linear corridor alignment mapping, bridge inspection, digital elevation models (DEM), and CAD/GIS topographic plan generation.
            </p>
          </div>

        </div>
      </section>

      {/* 5. PLATFORM & ANALYTICS CAPABILITIES */}
      <section id="platform" style={{ backgroundColor: '#ffffff', padding: '60px 20px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '45px' }}>
            <h2 style={{ fontSize: '26px', color: '#0f766e', fontWeight: '700', marginBottom: '10px' }}>Geospatial Analytics & Deliverables</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Turning raw aerial imagery into engineered GIS datasets.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
            <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', border: '1px solid #99f6e4' }}>
              <h4 style={{ color: '#0d9488', margin: '0 0 8px 0', fontSize: '15px' }}>Orthomosaic Maps</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>Sub-centimeter resolution geotiff orthomosaics aligned to Survey of India CORS benchmark networks.</p>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', border: '1px solid #99f6e4' }}>
              <h4 style={{ color: '#0d9488', margin: '0 0 8px 0', fontSize: '15px' }}>3D Point Clouds & DEM</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>High-density point cloud classification, Digital Surface Models (DSM), and Digital Elevation Models (DEM).</p>
            </div>

            <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '8px', border: '1px solid #99f6e4' }}>
              <h4 style={{ color: '#0d9488', margin: '0 0 8px 0', fontSize: '15px' }}>CAD & KML/KMZ Exports</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: '1.5' }}>Direct export compatibility with AutoCAD (.DXF/.DWG), QGIS, ArcGIS, and Google Earth KML files.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. WORKFLOW PROCESS */}
      <section id="process" style={{ padding: '60px 20px', maxWidth: '1150px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '45px' }}>
          <h2 style={{ fontSize: '26px', color: '#0f766e', fontWeight: '700', marginBottom: '10px' }}>Our 4-Step Survey Workflow</h2>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Rigorous quality checks from site pre-planning to final delivery.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '15px', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#ccfbf1', color: '#0d9488', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', margin: '0 auto 12px auto' }}>1</div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0f172a' }}>Pre-Flight Planning</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>DGCA airspace clearance & flight path design.</p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#ccfbf1', color: '#0d9488', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', margin: '0 auto 12px auto' }}>2</div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0f172a' }}>DGPS & Flight Execution</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>GCP marking with FOIF DGPS & UAV capturing.</p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#ccfbf1', color: '#0d9488', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', margin: '0 auto 12px auto' }}>3</div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0f172a' }}>PPK/RTK Processing</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>RINEX post-processing in Agisoft Metashape.</p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#ccfbf1', color: '#0d9488', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', margin: '0 auto 12px auto' }}>4</div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#0f172a' }}>Analytics & Reporting</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Final volume reports & CAD/KML delivery.</p>
          </div>
        </div>
      </section>

      {/* 7. KML GENERATOR SUITE */}
      <section id="kml-tool" style={{ padding: '30px 20px 70px 20px', maxWidth: '850px', margin: '0 auto' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(13, 148, 136, 0.08)', border: '1px solid #99f6e4' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <span style={{ backgroundColor: '#ccfbf1', color: '#0f766e', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
              Interactive Utility
            </span>
            <h3 style={{ margin: '12px 0 6px 0', color: '#0f766e', fontSize: '22px' }}>Geospatial KML Coordinate Generator</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Convert CSV datasets, raw text arrays, or scanned survey map drawings into instant Google Earth KML files with popup window preview.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Survey / Project Identifier Name</label>
            <input type="text" value={polygonName} onChange={(e) => setPolygonName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => { setActiveKmlOption('optionA'); setDownloadReady(false); }} style={{ padding: '10px', backgroundColor: activeKmlOption === 'optionA' ? '#0d9488' : '#f8fafc', color: activeKmlOption === 'optionA' ? '#fff' : '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              📄 CSV / TXT File
            </button>
            <button onClick={() => { setActiveKmlOption('optionB'); setDownloadReady(false); }} style={{ padding: '10px', backgroundColor: activeKmlOption === 'optionB' ? '#0d9488' : '#f8fafc', color: activeKmlOption === 'optionB' ? '#fff' : '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              ✍️ Raw Text Input
            </button>
            <button onClick={() => { setActiveKmlOption('optionC'); setDownloadReady(false); }} style={{ padding: '10px', backgroundColor: activeKmlOption === 'optionC' ? '#0d9488' : '#f8fafc', color: activeKmlOption === 'optionC' ? '#fff' : '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
              🖼️ Sketch OCR Reader
            </button>
          </div>

          {activeKmlOption === 'optionA' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Upload CSV / TXT File</h4>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>Coordinate Format</label>
                  <select value={coordType} onChange={(e) => setCoordType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                    <option value="latlon">Lat / Lon (Decimal Degrees)</option>
                    <option value="utm">UTM Coordinates (Easting / Northing)</option>
                  </select>
                </div>
                {coordType === 'utm' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>UTM Zone</label>
                    <select value={utmZone} onChange={(e) => setUtmZone(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                      <option value="43N">Zone 43N (Karnataka / South India)</option>
                      <option value="44N">Zone 44N (East Coast India)</option>
                    </select>
                  </div>
                )}
              </div>
              <input type="file" accept=".csv, .txt" onChange={(e) => setUploadedFile(e.target.files[0])} style={{ width: '100%', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '15px' }} />
              <button onClick={handleProcessOptionA} style={{ width: '100%', padding: '12px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Generate KML & Open Window ⚙️
              </button>
            </div>
          )}

          {activeKmlOption === 'optionB' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Type or Paste Coordinates</h4>
              <textarea rows="6" value={rawTextCoords} onChange={(e) => setRawTextCoords(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: '15px' }} />
              <button onClick={handleProcessOptionB} style={{ width: '100%', padding: '12px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Generate KML & Open Window ⚙️
              </button>
            </div>
          )}

          {activeKmlOption === 'optionC' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Upload Sketch Image (OCR Reader)</h4>
              <input type="file" accept="image/*, application/pdf" onChange={handleSketchFileUpload} style={{ width: '100%', padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '15px' }} />
              
              {sketchPreview && (
                <div style={{ marginBottom: '15px', textAlign: 'center', backgroundColor: '#e2e8f0', padding: '10px', borderRadius: '6px' }}>
                  {typeof sketchPreview === 'string' && sketchPreview.startsWith('blob:') ? (
                    <img src={sketchPreview} alt="Sketch Map" style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (
                    <p style={{ margin: 0, fontSize: '13px', color: '#0f766e', fontWeight: '600' }}>{sketchPreview}</p>
                  )}
                </div>
              )}

              {isOcrProcessing && <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#ccfbf1', color: '#0f766e', borderRadius: '6px', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>⏳ {ocrMessage}</div>}
              {!isOcrProcessing && ocrMessage && <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '6px', fontSize: '12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{ocrMessage}</div>}

              <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#ccfbf1' }}>
                      <th style={{ padding: '8px', color: '#0f766e' }}>Point Name</th>
                      <th style={{ padding: '8px', color: '#0f766e' }}>Latitude</th>
                      <th style={{ padding: '8px', color: '#0f766e' }}>Longitude</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sketchCoords.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <td style={{ padding: '6px' }}><input type="text" value={row.name} onChange={(e) => { const u = [...sketchCoords]; u[idx].name = e.target.value; setSketchCoords(u); }} style={{ width: '90%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></td>
                        <td style={{ padding: '6px' }}><input type="text" value={row.lat} onChange={(e) => { const u = [...sketchCoords]; u[idx].lat = e.target.value; setSketchCoords(u); }} style={{ width: '90%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></td>
                        <td style={{ padding: '6px' }}><input type="text" value={row.lon} onChange={(e) => { const u = [...sketchCoords]; u[idx].lon = e.target.value; setSketchCoords(u); }} style={{ width: '90%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={() => setSketchCoords([...sketchCoords, { name: `P${sketchCoords.length + 1}`, lat: '', lon: '' }])} style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginBottom: '15px' }}>
                + Add Point Row
              </button>

              <button onClick={handleProcessOptionC} style={{ width: '100%', padding: '12px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Generate KML & Open Window ⚙️
              </button>
            </div>
          )}

          {downloadReady && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '14px', fontWeight: '600' }}>
                ✅ KML File compiled and opened in a separate window!
              </p>
              <button onClick={handleDownloadKml} style={{ padding: '10px 20px', backgroundColor: '#0d9488', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)' }}>
                Download KML file again 📥
              </button>
            </div>
          )}

        </div>
      </section>

      {/* 8. FOOTER */}
      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '40px 20px 20px 20px', fontSize: '13px' }}>
        <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: '30px', paddingBottom: '30px', borderBottom: '1px solid #334155' }}>
          <div>
            <h3 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '16px' }}>SKY360 Solutions</h3>
            <p style={{ margin: 0, lineHeight: '1.6', fontSize: '12px' }}>
              State-of-the-art DGPS geodetic surveys, drone photogrammetry, bathymetry, and mining volumetric audits across Karnataka and South India.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '14px' }}>Services</h4>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px' }}>Drone Mapping</p>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px' }}>DGPS Geodetic Survey</p>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px' }}>Mining Stockpiles</p>
            <p style={{ margin: 0, fontSize: '12px' }}>River Bathymetry</p>
          </div>
          <div>
            <h4 style={{ color: '#ffffff', margin: '0 0 10px 0', fontSize: '14px' }}>Location</h4>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6' }}>
              Nagasandra, Bengaluru, Karnataka, India
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'center', paddingTop: '20px', fontSize: '12px' }}>
          <p style={{ margin: 0 }}>© {new Date().getFullYear()} SKY360 Solutions. All Rights Reserved.</p>
        </div>
      </footer>

    </div>
  );
}