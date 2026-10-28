import React, { useState, useEffect } from 'react';
import logo from './assets/logo.png';

export default function LandingPage({ onGoToPortal }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // KML Generator Core States
  const [activeOption, setActiveOption] = useState('optionA'); // 'optionA' | 'optionB' | 'optionC'
  const [polygonName, setPolygonName] = useState('SKY360_Survey_Block');
  
  // Option A States (File Upload)
  const [uploadedFile, setUploadedFile] = useState(null);
  const [coordType, setCoordType] = useState('latlon'); // 'latlon' | 'utm'
  const [utmZone, setUtmZone] = useState('43N');

  // Option B States (Raw Text Input)
  const [rawTextCoords, setRawTextCoords] = useState(
    'Point_1, 12.9716, 77.5946\nPoint_2, 12.9750, 77.6000\nPoint_3, 12.9680, 77.6050'
  );

  // Option C States (Sketch / PDF Reference Preview)
  const [sketchPreview, setSketchPreview] = useState(null);
  const [sketchCoords, setSketchCoords] = useState([
    { name: 'P1', lat: '12.9716', lon: '77.5946' },
    { name: 'P2', lat: '12.9750', lon: '77.6000' }
  ]);

  // Download Output States
  const [kmlOutput, setKmlOutput] = useState('');
  const [downloadReady, setDownloadReady] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Simple UTM (WGS84) to Lat/Lon Rough Converter for India (Zone 43N/44N)
  const convertUtmToLatLon = (easting, northing, zoneStr) => {
    // Basic projection offset calculation for standard Indian UTM zones
    const zoneNum = parseInt(zoneStr.replace(/\D/g, '')) || 43;
    const isNorth = !zoneStr.toLowerCase().includes('s');
    
    const x = easting - 500000;
    const y = isNorth ? northing : northing - 10000000;
    
    const k0 = 0.9996;
    const a = 6378137.0; // WGS84 Semi-major axis
    const e = 0.081819191; // Eccentricity
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

  // Helper to construct XML KML format
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
    <description>Generated via SKY360 Solutions Portal</description>
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

  // Process Option A File
  const handleProcessOptionA = () => {
    if (!uploadedFile) {
      alert('Please select a CSV or TXT file to upload.');
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
        alert('Could not parse valid coordinate rows. Please verify CSV/TXT format.');
        return;
      }

      setKmlOutput(generateKmlStructure(parsedPoints));
      setDownloadReady(true);
    };
    reader.readAsText(uploadedFile);
  };

  // Process Option B Text Input
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
      alert('Please enter valid coordinates in format: Name, Latitude, Longitude');
      return;
    }

    setKmlOutput(generateKmlStructure(parsedPoints));
    setDownloadReady(true);
  };

  // Process Option C Sketch Table
  const handleProcessOptionC = () => {
    const parsedPoints = sketchCoords
      .map(row => ({
        name: row.name.trim(),
        lat: parseFloat(row.lat),
        lon: parseFloat(row.lon)
      }))
      .filter(row => row.name && !isNaN(row.lat) && !isNaN(row.lon));

    if (parsedPoints.length === 0) {
      alert('Please fill at least one valid row in the sketch coordinate table.');
      return;
    }

    setKmlOutput(generateKmlStructure(parsedPoints));
    setDownloadReady(true);
  };

  // Trigger File Download
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

  // Handlers for Option C dynamic table rows
  const handleAddSketchRow = () => {
    setSketchCoords([...sketchCoords, { name: `P${sketchCoords.length + 1}`, lat: '', lon: '' }]);
  };

  const handleSketchRowChange = (index, field, value) => {
    const updated = [...sketchCoords];
    updated[index][field] = value;
    setSketchCoords(updated);
  };

  const handleSketchFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.includes('image')) {
        setSketchPreview(URL.createObjectURL(file));
      } else {
        setSketchPreview('PDF Document Attached: ' + file.name);
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1e293b', boxSizing: 'border-box' }}>
      
      {/* Top Navigation Header */}
      <header style={{ 
        backgroundColor: '#ffffff', 
        borderBottom: '1px solid #e2e8f0', 
        padding: '15px 20px', 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '15px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        textAlign: isMobile ? 'center' : 'left'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', width: isMobile ? '100%' : 'auto' }}>
          <img 
            src={logo} 
            alt="SKY360 Logo" 
            style={{ height: '65px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', width: isMobile ? '100%' : 'auto' }}>
          <button 
            onClick={onGoToPortal}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#0066cc', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: '600', 
              fontSize: '13px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              boxShadow: '0 2px 6px rgba(0, 102, 204, 0.25)',
              whiteSpace: 'nowrap'
            }}
          >
            <span>Operations Portal →</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-block' }}>
            Precision Surveying & Aerial Mapping
          </span>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', color: '#0f172a', margin: '20px 0 15px 0', fontWeight: '800', lineHeight: '1.2' }}>
            High-Accuracy Drone Photogrammetry & DGPS Geodetic Surveys
          </h2>
          <p style={{ fontSize: 'clamp(14px, 2vw, 16px)', color: '#475569', lineHeight: '1.6', marginBottom: '30px' }}>
            SKY360 Solutions delivers state-of-the-art geospatial surveys, riverbed bathymetry, mining volume estimation, and top-tier GNSS positioning across South India.
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#services" style={{ padding: '12px 28px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', display: 'inline-block' }}>
              Explore Services
            </a>
            <a href="#kml-generator" style={{ padding: '12px 28px', backgroundColor: '#0066cc', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px', display: 'inline-block' }}>
              Generate KML File 🗺️
            </a>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" style={{ padding: '50px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <h3 style={{ textAlign: 'center', fontSize: '22px', color: '#004080', marginBottom: '35px', fontWeight: '700' }}>Our Key Capabilities</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🚁</div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '17px', color: '#1e293b' }}>Drone Mapping & Photogrammetry</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              High-resolution aerial surveys delivering accurate 3D point clouds, digital elevation models (DEM), contour mapping, and orthomosaics.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>📡</div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '17px', color: '#1e293b' }}>DGPS & CORS Network Surveys</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Millimeter-level geodetic positioning using static & PPK/RTK GNSS workflows aligned with Survey of India CORS benchmarks.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⛏️</div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '17px', color: '#1e293b' }}>Volumetric Mining & Mineral Surveys</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
              Official sand block demarcation, pit volume computation, and minor mineral audit surveys compliant with state mining guidelines.
            </p>
          </div>
        </div>
      </section>

      {/* MULTI-OPTION KML GENERATOR SECTION */}
      <section id="kml-generator" style={{ padding: '60px 20px', backgroundColor: '#f0f6ff', borderTop: '1px solid #bae6fd', borderBottom: '1px solid #bae6fd' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto', backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(2, 132, 199, 0.08)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
              Geospatial Utility
            </span>
            <h3 style={{ margin: '12px 0 6px 0', color: '#004080', fontSize: '24px' }}>KML Coordinate Generator</h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Select your preferred input method to compile boundary points into a Google Earth KML file.
            </p>
          </div>

          {/* Survey Name Input */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
              Survey / Block Project Name
            </label>
            <input 
              type="text" 
              value={polygonName} 
              onChange={(e) => setPolygonName(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Option Selector Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px', marginBottom: '25px' }}>
            <button 
              onClick={() => { setActiveOption('optionA'); setDownloadReady(false); }}
              style={{ 
                padding: '12px 10px', 
                backgroundColor: activeOption === 'optionA' ? '#0066cc' : '#f8fafc', 
                color: activeOption === 'optionA' ? '#ffffff' : '#475569', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                fontWeight: '600', 
                fontSize: '13px', 
                cursor: 'pointer' 
              }}
            >
              📄 Option A: CSV / TXT File
            </button>

            <button 
              onClick={() => { setActiveOption('optionB'); setDownloadReady(false); }}
              style={{ 
                padding: '12px 10px', 
                backgroundColor: activeOption === 'optionB' ? '#0066cc' : '#f8fafc', 
                color: activeOption === 'optionB' ? '#ffffff' : '#475569', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                fontWeight: '600', 
                fontSize: '13px', 
                cursor: 'pointer' 
              }}
            >
              ✍️ Option B: Raw Text Input
            </button>

            <button 
              onClick={() => { setActiveOption('optionC'); setDownloadReady(false); }}
              style={{ 
                padding: '12px 10px', 
                backgroundColor: activeOption === 'optionC' ? '#0066cc' : '#f8fafc', 
                color: activeOption === 'optionC' ? '#ffffff' : '#475569', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                fontWeight: '600', 
                fontSize: '13px', 
                cursor: 'pointer' 
              }}
            >
              🖼️ Option C: Image / PDF Sketch
            </button>
          </div>

          {/* OPTION A VIEW */}
          {activeOption === 'optionA' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0f172a' }}>Upload CSV or TXT Coordinate File</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#64748b' }}>
                Format should contain lines with: <code>Point_Name, Latitude/Easting, Longitude/Northing</code>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>Coordinate Type</label>
                  <select 
                    value={coordType} 
                    onChange={(e) => setCoordType(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="latlon">Lat / Lon (Decimal Degrees)</option>
                    <option value="utm">UTM Coordinates (Easting / Northing)</option>
                  </select>
                </div>

                {coordType === 'utm' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>UTM Zone</label>
                    <select 
                      value={utmZone} 
                      onChange={(e) => setUtmZone(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="43N">Zone 43N (Karnataka / South India)</option>
                      <option value="44N">Zone 44N (East Coast India)</option>
                    </select>
                  </div>
                )}
              </div>

              <input 
                type="file" 
                accept=".csv, .txt" 
                onChange={(e) => setUploadedFile(e.target.files[0])}
                style={{ width: '100%', padding: '10px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '15px' }}
              />

              <button 
                onClick={handleProcessOptionA} 
                style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
              >
                Generate KML from File ⚙️
              </button>
            </div>
          )}

          {/* OPTION B VIEW */}
          {activeOption === 'optionB' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0f172a' }}>Type / Paste Coordinates</h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#64748b' }}>
                Format: <code>Point_Name, Latitude, Longitude</code> (One pair per line)
              </p>

              <textarea 
                rows="6" 
                value={rawTextCoords} 
                onChange={(e) => setRawTextCoords(e.target.value)} 
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: '15px' }}
              />

              <button 
                onClick={handleProcessOptionB} 
                style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
              >
                Generate KML from Text ⚙️
              </button>
            </div>
          )}

          {/* OPTION C VIEW */}
          {activeOption === 'optionC' && (
            <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0f172a' }}>Attach Sketch Reference & Enter Coordinates</h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#64748b' }}>
                Upload your site sketch map (Image or PDF) to view alongside the coordinate entry table.
              </p>

              <input 
                type="file" 
                accept="image/*, application/pdf" 
                onChange={handleSketchFileUpload}
                style={{ width: '100%', padding: '8px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '15px' }}
              />

              {sketchPreview && (
                <div style={{ marginBottom: '15px', textAlign: 'center', backgroundColor: '#e2e8f0', padding: '10px', borderRadius: '6px' }}>
                  {typeof sketchPreview === 'string' && sketchPreview.startsWith('blob:') ? (
                    <img src={sketchPreview} alt="Sketch Map" style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }} />
                  ) : (
                    <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', fontWeight: '600' }}>{sketchPreview}</p>
                  )}
                </div>
              )}

              {/* Table for Points */}
              <div style={{ overflowX: 'auto', marginBottom: '15px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e0f2fe' }}>
                      <th style={{ padding: '8px', color: '#0369a1' }}>Point Name</th>
                      <th style={{ padding: '8px', color: '#0369a1' }}>Latitude</th>
                      <th style={{ padding: '8px', color: '#0369a1' }}>Longitude</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sketchCoords.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <td style={{ padding: '6px' }}>
                          <input 
                            type="text" 
                            value={row.name} 
                            onChange={(e) => handleSketchRowChange(idx, 'name', e.target.value)}
                            style={{ width: '90%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input 
                            type="text" 
                            placeholder="e.g. 12.9716"
                            value={row.lat} 
                            onChange={(e) => handleSketchRowChange(idx, 'lat', e.target.value)}
                            style={{ width: '90%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        </td>
                        <td style={{ padding: '6px' }}>
                          <input 
                            type="text" 
                            placeholder="e.g. 77.5946"
                            value={row.lon} 
                            onChange={(e) => handleSketchRowChange(idx, 'lon', e.target.value)}
                            style={{ width: '90%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={handleAddSketchRow} 
                  style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                >
                  + Add Point Row
                </button>
              </div>

              <button 
                onClick={handleProcessOptionC} 
                style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
              >
                Generate KML from Sketch Points ⚙️
              </button>
            </div>
          )}

          {/* DOWNLOAD KML RESULT BANNER */}
          {downloadReady && (
            <div style={{ marginTop: '25px', padding: '18px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 12px 0', color: '#166534', fontSize: '14px', fontWeight: '600' }}>
                ✅ KML File successfully compiled!
              </p>
              <button 
                onClick={handleDownloadKml}
                style={{ padding: '12px 24px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}
              >
                Download KML file 📥
              </button>
            </div>
          )}

        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '25px 20px', textAlign: 'center', fontSize: '12px', marginTop: '40px' }}>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} SKY360 Solutions. All Rights Reserved. | Bengaluru, Karnataka</p>
      </footer>

    </div>
  );
}