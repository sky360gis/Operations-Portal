import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth.jsx';
import LandingPage from './LandingPage.jsx';
import logo from './assets/logo.png';

const ALLOWED_EMAILS = [
  'sandeep.p1981@gmail.com',
  'sandeep@sky360.com',
  'admin2@sky360.com',
];

const INACTIVITY_LIMIT = 15 * 60 * 1000; 

export default function App() {
  const hasAuthHash = window.location.hash.includes('access_token=') || window.location.hash.includes('type=recovery');
  
  const [showLandingPage, setShowLandingPage] = useState(!hasAuthHash);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState('user'); // 'user' | 'admin'
  const [activeTab, setActiveTab] = useState('work'); // 'work' | 'expense' | 'kml'
  const [unauthorizedEmail, setUnauthorizedEmail] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const idleTimerRef = useRef(null);

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

  const [projectList, setProjectList] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState('not_checked_in');
  const [attendanceId, setAttendanceId] = useState(null);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);

  const [project, setProject] = useState('');
  const [task, setTask] = useState('');
  const [hours, setHours] = useState('');
  const [logs, setLogs] = useState([]);

  const [expProject, setExpProject] = useState('');
  const [expCategory, setExpCategory] = useState('Fuel');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [myExpenses, setMyExpenses] = useState([]);

  const [allAttendance, setAllAttendance] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);

  const forceLogout = useCallback(async () => {
    try {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      await supabase.auth.signOut();
      setSession(null);
      alert("You have been automatically logged out due to inactivity.");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(forceLogout, INACTIVITY_LIMIT);
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });
    resetTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session, forceLogout]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setShowLandingPage(false);
      validateAndSetSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setShowLandingPage(false);
      validateAndSetSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateAndSetSession = async (currentSession) => {
    if (currentSession) {
      const userEmail = currentSession.user.email;
      if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(userEmail)) {
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        setUnauthorizedEmail(userEmail);
        return;
      }
    }
    setUnauthorizedEmail(null);
    setSession(currentSession);
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      checkAdminStatus();
      fetchProjects();
      fetchTodayAttendance();
      fetchLogs();
      fetchExpenses();
    }
  }, [session]);

  const checkAdminStatus = async () => {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single();
    if (data && data.is_admin) {
      setIsAdmin(true);
      fetchAdminData();
    }
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').eq('status', 'active');
    if (data && data.length > 0) {
      setProjectList(data);
      setProject(data[0].name);
      setExpProject(data[0].name);
    }
  };

  const fetchTodayAttendance = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('attendance').select('*').eq('user_id', session.user.id).gte('check_in', `${today}T00:00:00Z`).order('check_in', { ascending: false }).limit(1);
    if (data && data.length > 0) {
      const record = data[0];
      setAttendanceId(record.id);
      setCheckInTime(new Date(record.check_in).toLocaleTimeString());
      if (record.check_out) {
        setCheckOutTime(new Date(record.check_out).toLocaleTimeString());
        setAttendanceStatus('completed');
      } else {
        setAttendanceStatus('checked_in');
      }
    }
  };

  const handleCheckIn = async () => {
    const { data, error } = await supabase.from('attendance').insert([{ user_id: session.user.id }]).select().single();
    if (!error && data) {
      setAttendanceId(data.id);
      setCheckInTime(new Date(data.check_in).toLocaleTimeString());
      setAttendanceStatus('checked_in');
      alert('Checked in successfully for today!');
    } else {
      alert('Error checking in: ' + error.message);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceId) return;
    const checkoutTimeIso = new Date().toISOString();
    const { error } = await supabase.from('attendance').update({ check_out: checkoutTimeIso }).eq('id', attendanceId);
    if (!error) {
      setCheckOutTime(new Date(checkoutTimeIso).toLocaleTimeString());
      setAttendanceStatus('completed');
      alert('Checked out successfully. Attendance complete for today.');
    } else {
      alert('Error checking out: ' + error.message);
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('work_logs').insert([{
      user_id: session.user.id,
      project_name: project,
      task_description: task,
      hours_spent: parseFloat(hours)
    }]);

    if (!error) {
      setTask('');
      setHours('');
      fetchLogs();
      if (isAdmin) fetchAdminData();
      alert('Work activity added successfully!');
    } else {
      alert('Error saving log: ' + error.message);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('field_expenses').insert([{
      user_id: session.user.id,
      project_name: expProject,
      category: expCategory,
      amount: parseFloat(expAmount),
      description: expDesc
    }]);

    if (!error) {
      setExpAmount('');
      setExpDesc('');
      fetchExpenses();
      if (isAdmin) fetchAdminData();
      alert('Field expense logged successfully!');
    } else {
      alert('Error saving expense: ' + error.message);
    }
  };

  const fetchLogs = async () => {
    const { data } = await supabase.from('work_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (data) setLogs(data);
  };

  const fetchExpenses = async () => {
    const { data } = await supabase.from('field_expenses').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    if (data) setMyExpenses(data);
  };

  const fetchAdminData = async () => {
    const { data: attData } = await supabase.from('attendance').select('*, profiles(email)').order('check_in', { ascending: false });
    const { data: logData } = await supabase.from('work_logs').select('*, profiles(email)').order('created_at', { ascending: false });
    const { data: expData } = await supabase.from('field_expenses').select('*, profiles(email)').order('created_at', { ascending: false });

    if (attData) setAllAttendance(attData);
    if (logData) setAllLogs(logData);
    if (expData) setAllExpenses(expData);
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,ID,User Email,Project,Task,Hours,Date\n";
    allLogs.forEach(row => {
      const email = row.profiles?.email || 'N/A';
      const cleanTask = `"${row.task_description.replace(/"/g, '""')}"`;
      csvContent += `${row.id},${email},${row.project_name},${cleanTask},${row.hours_spent},${row.created_at}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `operations_portal_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

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

  const openKmlInNewWindow = (kmlContent) => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Generated KML Output - ${polygonName}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; background: #f8fafc; color: #1e293b; }
              h2 { color: #004080; }
              pre { background: #ffffff; padding: 15px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: auto; max-height: 500px; }
              button { padding: 10px 20px; background: #16a34a; color: #fff; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 15px; }
            </style>
          </head>
          <body>
            <h2>🗺️ Generated KML File Source</h2>
            <p>Project Name: <strong>${polygonName}</strong></p>
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
      alert('Please select a CSV or TXT file.');
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
        alert('Could not parse valid coordinate rows.');
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
      alert('Please enter valid coordinates.');
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
      alert('Please enter at least one valid row.');
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
      setOcrMessage('PDF preview attached. Enter coordinates manually below.');
      return;
    }

    setIsOcrProcessing(true);
    setOcrMessage('Scanning image using OCR...');

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
        setOcrMessage(`✅ Extracted ${extractedPoints.length} points! Review and adjust below.`);
      } else {
        setOcrMessage('⚠️ Could not automatically detect coordinates. Type them below.');
      }
    } catch (err) {
      setOcrMessage('⚠️ Error reading image text. Enter manually below.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Loading application...</div>;
  }

  if (showLandingPage) {
    return <LandingPage onGoToPortal={() => setShowLandingPage(false)} />;
  }

  if (unauthorizedEmail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f0f6ff', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '30px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', textAlign: 'center', width: '100%', maxWidth: '380px', borderTop: '4px solid #dc2626', boxSizing: 'border-box' }}>
          <img src={logo} alt="SKY360 Logo" style={{ height: '60px', width: 'auto', objectFit: 'contain', marginBottom: '15px' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '10px', fontSize: '18px' }}>Access Restricted</h3>
          <p style={{ color: '#991b1b', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5', fontWeight: '600' }}>
            Unauthorised User, Contact Admin for Sign In
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => setUnauthorizedEmail(null)} style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
              Back to Login
            </button>
            <button onClick={() => { setUnauthorizedEmail(null); setShowLandingPage(true); }} style={{ width: '100%', padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
              ← Back to Main Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f6ff' }}>
        <button onClick={() => setShowLandingPage(true)} style={{ position: 'absolute', top: '15px', left: '15px', padding: '8px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#0066cc', fontWeight: '600', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          ← Back to Main Website
        </button>
        <Auth />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f6ff', padding: '20px 10px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navigation Header */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px', 
          backgroundColor: '#ffffff', 
          padding: '20px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', 
          borderTop: '4px solid #0066cc', 
          gap: '15px',
          boxSizing: 'border-box'
        }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <img src={logo} alt="SKY360 Logo" style={{ height: '80px', width: 'auto', objectFit: 'contain', display: 'block' }} />
            <button onClick={() => setShowLandingPage(true)} style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '5px', cursor: 'pointer', color: '#0066cc', fontWeight: '600', fontSize: '12px' }}>
              ← Back to Main Website
            </button>
          </div>

          <div style={{ textAlign: 'center', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#004080', fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>
              Operations Portal
            </h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {isAdmin && (
                <button onClick={() => setViewMode(viewMode === 'user' ? 'admin' : 'user')} style={{ padding: '8px 14px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', color: '#0369a1', fontWeight: '600', fontSize: '13px' }}>
                  {viewMode === 'user' ? 'Admin Panel ⚙️' : 'My Portal 👤'}
                </button>
              )}
              <button onClick={() => supabase.auth.signOut()} style={{ padding: '8px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#334155', fontWeight: '500', fontSize: '13px' }}>
                Sign Out
              </button>
            </div>

            <p style={{ margin: 0, color: '#475569', fontSize: '12px', textAlign: isMobile ? 'center' : 'right' }}>
              User: <strong>{session.user.email}</strong> {isAdmin && <span style={{ backgroundColor: '#0066cc', color: '#fff', padding: '2px 5px', borderRadius: '3px', fontSize: '10px', marginLeft: '4px' }}>Admin</span>}
            </p>
          </div>

        </div>

        {/* ADMIN DASHBOARD VIEW */}
        {isAdmin && viewMode === 'admin' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '15px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, color: '#004080', fontSize: '15px' }}>Executive Reports & Exports</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={exportToCSV} style={{ padding: '8px 14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                  Export CSV 📥
                </button>
                <button onClick={handlePrintPDF} style={{ padding: '8px 14px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px' }}>
                  Print PDF 📄
                </button>
              </div>
            </div>

            {/* Team Attendance Register */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#004080', fontSize: '17px' }}>Team Attendance Register</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '500px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e0f2fe', borderBottom: '2px solid #bae6fd' }}>
                    <th style={{ padding: '10px', color: '#0369a1' }}>Employee</th>
                    <th style={{ padding: '10px', color: '#0369a1' }}>Check In</th>
                    <th style={{ padding: '10px', color: '#0369a1' }}>Check Out</th>
                  </tr>
                </thead>
                <tbody>
                  {allAttendance.map(att => (
                    <tr key={att.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: '500' }}>{att.profiles?.email || 'User'}</td>
                      <td style={{ padding: '10px' }}>{new Date(att.check_in).toLocaleString()}</td>
                      <td style={{ padding: '10px' }}>{att.check_out ? new Date(att.check_out).toLocaleString() : <span style={{ color: '#16a34a' }}>Active Now</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expenses Overview */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', overflowX: 'auto' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#004080', fontSize: '17px' }}>Logged Field Expenses</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e0f2fe', borderBottom: '2px solid #bae6fd' }}>
                    <th style={{ padding: '10px', color: '#0369a1' }}>Employee</th>
                    <th style={{ padding: '10px', color: '#0369a1' }}>Project</th>
                    <th style={{ padding: '10px', color: '#0369a1' }}>Category</th>
                    <th style={{ padding: '10px', color: '#0369a1' }}>Amount (₹)</th>
                    <th style={{ padding: '10px', color: '#0369a1' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {allExpenses.map(exp => (
                    <tr key={exp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px' }}>{exp.profiles?.email || 'User'}</td>
                      <td style={{ padding: '10px', fontWeight: '500' }}>{exp.project_name}</td>
                      <td style={{ padding: '10px' }}>{exp.category}</td>
                      <td style={{ padding: '10px', fontWeight: '600', color: '#16a34a' }}>₹{exp.amount}</td>
                      <td style={{ padding: '10px', color: '#475569' }}>{exp.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          /* STANDARD USER WORKSPACE VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Daily Attendance Status Block */}
            <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', borderLeft: '5px solid #0066cc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#004080', fontSize: '15px' }}>Daily Attendance Status</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>Mark your check-in and check-out for today.</p>
              </div>

              <div>
                {attendanceStatus === 'not_checked_in' && (
                  <button onClick={handleCheckIn} style={{ padding: '10px 18px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                    Check In For Today 🟢
                  </button>
                )}

                {attendanceStatus === 'checked_in' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '12px' }}>Checked In at {checkInTime} 🟢</span>
                    <button onClick={handleCheckOut} style={{ padding: '10px 18px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                      Check Out 🔴
                    </button>
                  </div>
                )}

                {attendanceStatus === 'completed' && (
                  <div style={{ backgroundColor: '#f0f6ff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                    <span style={{ color: '#004080', fontWeight: '600', fontSize: '12px' }}>Attendance Completed ✅</span>
                  </div>
                )}
              </div>
            </div>

            {/* TAB SELECTOR: WORK | EXPENSE | KML GENERATOR */}
            <div style={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start', gap: '8px', borderBottom: '2px solid #bae6fd', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveTab('work')}
                style={{ 
                  padding: '10px 18px', 
                  backgroundColor: activeTab === 'work' ? '#ffffff' : 'transparent', 
                  color: activeTab === 'work' ? '#0066cc' : '#64748b', 
                  border: activeTab === 'work' ? '1px solid #bae6fd' : 'none', 
                  borderBottom: activeTab === 'work' ? '2px solid #0066cc' : 'none',
                  borderTopLeftRadius: '6px', 
                  borderTopRightRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '13px' 
                }}
              >
                📁 Work Activity
              </button>
              
              <button 
                onClick={() => setActiveTab('expense')}
                style={{ 
                  padding: '10px 18px', 
                  backgroundColor: activeTab === 'expense' ? '#ffffff' : 'transparent', 
                  color: activeTab === 'expense' ? '#059669' : '#64748b', 
                  border: activeTab === 'expense' ? '1px solid #bae6fd' : 'none', 
                  borderBottom: activeTab === 'expense' ? '2px solid #059669' : 'none',
                  borderTopLeftRadius: '6px', 
                  borderTopRightRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '13px' 
                }}
              >
                💰 Field Expense
              </button>

              <button 
                onClick={() => setActiveTab('kml')}
                style={{ 
                  padding: '10px 18px', 
                  backgroundColor: activeTab === 'kml' ? '#ffffff' : 'transparent', 
                  color: activeTab === 'kml' ? '#d97706' : '#64748b', 
                  border: activeTab === 'kml' ? '1px solid #bae6fd' : 'none', 
                  borderBottom: activeTab === 'kml' ? '2px solid #d97706' : 'none',
                  borderTopLeftRadius: '6px', 
                  borderTopRightRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '13px' 
                }}
              >
                🗺️ Generate KML File
              </button>
            </div>

            {/* TAB 1: WORK ACTIVITY VIEW */}
            {activeTab === 'work' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', boxSizing: 'border-box' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#004080', fontSize: '17px' }}>Add Work Activity</h3>
                  <form onSubmit={handleAddLog} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Project Name</label>
                      <select value={project} onChange={(e) => setProject(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                        {projectList.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Hours Spent</label>
                      <input type="number" step="0.5" placeholder="e.g. 4.5" value={hours} onChange={(e) => setHours(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Task Description</label>
                      <textarea placeholder="Describe tasks completed..." value={task} onChange={(e) => setTask(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minHeight: '90px', boxSizing: 'border-box' }} />
                    </div>
                    <button type="submit" style={{ padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                      + Save Work Item
                    </button>
                  </form>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', boxSizing: 'border-box' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#004080', fontSize: '17px' }}>Your Work History ({logs.length})</h3>
                  {logs.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>No work records found.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                      {logs.map((log) => (
                        <div key={log.id} style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ color: '#1e293b', fontSize: '13px' }}>{log.project_name}</strong>
                            <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                              {log.hours_spent} hrs
                            </span>
                          </div>
                          <p style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '12px', lineHeight: '1.4' }}>{log.task_description}</p>
                          <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: EXPENSE VIEW */}
            {activeTab === 'expense' && (
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', boxSizing: 'border-box' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#004080', fontSize: '17px' }}>Log Field Expense</h3>
                  <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Project</label>
                      <select value={expProject} onChange={(e) => setExpProject(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                        {projectList.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Category</label>
                      <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                        <option value="Fuel">Fuel</option>
                        <option value="Travel / Food">Travel / Food</option>
                        <option value="Equipment Rental">Equipment Rental</option>
                        <option value="Permits / Site Fee">Permits / Site Fee</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Amount (₹)</label>
                      <input type="number" placeholder="e.g. 500" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#475569', marginBottom: '6px' }}>Description</label>
                      <input type="text" placeholder="e.g. DGPS Survey vehicle fuel refill" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <button type="submit" style={{ padding: '12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                      + Save Expense
                    </button>
                  </form>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', boxSizing: 'border-box' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#004080', fontSize: '17px' }}>Your Expenses History ({myExpenses.length})</h3>
                  {myExpenses.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>No expenses recorded.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                      {myExpenses.map((exp) => (
                        <div key={exp.id} style={{ padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <strong style={{ color: '#1e293b', fontSize: '13px' }}>{exp.project_name}</strong>
                            <span style={{ color: '#059669', fontWeight: '700', fontSize: '13px' }}>₹{exp.amount}</span>
                          </div>
                          <p style={{ margin: '0 0 4px 0', color: '#475569', fontSize: '12px' }}><strong>{exp.category}</strong>: {exp.description || 'No notes'}</p>
                          <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                            {new Date(exp.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: KML GENERATOR VIEW */}
            {activeTab === 'kml' && (
              <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 6px 0', color: '#004080', fontSize: '20px' }}>Geospatial KML Coordinate Generator</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Convert boundary points, raw text, or scanned sketches into downloadable Google Earth KML files.
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Survey / Project Name</label>
                  <input type="text" value={polygonName} onChange={(e) => setPolygonName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>

                {/* Sub Options */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                  <button onClick={() => { setActiveKmlOption('optionA'); setDownloadReady(false); }} style={{ padding: '10px', backgroundColor: activeKmlOption === 'optionA' ? '#0066cc' : '#f8fafc', color: activeKmlOption === 'optionA' ? '#fff' : '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                    📄 CSV / TXT File
                  </button>
                  <button onClick={() => { setActiveKmlOption('optionB'); setDownloadReady(false); }} style={{ padding: '10px', backgroundColor: activeKmlOption === 'optionB' ? '#0066cc' : '#f8fafc', color: activeKmlOption === 'optionB' ? '#fff' : '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                    ✍️ Raw Text Input
                  </button>
                  <button onClick={() => { setActiveKmlOption('optionC'); setDownloadReady(false); }} style={{ padding: '10px', backgroundColor: activeKmlOption === 'optionC' ? '#0066cc' : '#f8fafc', color: activeKmlOption === 'optionC' ? '#fff' : '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}>
                    🖼️ Sketch OCR Reader
                  </button>
                </div>

                {/* Sub Option A */}
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
                    <button onClick={handleProcessOptionA} style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                      Generate KML & Open Window ⚙️
                    </button>
                  </div>
                )}

                {/* Sub Option B */}
                {activeKmlOption === 'optionB' && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Type or Paste Coordinates</h4>
                    <textarea rows="6" value={rawTextCoords} onChange={(e) => setRawTextCoords(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box', marginBottom: '15px' }} />
                    <button onClick={handleProcessOptionB} style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                      Generate KML & Open Window ⚙️
                    </button>
                  </div>
                )}

                {/* Sub Option C */}
                {activeKmlOption === 'optionC' && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0f172a' }}>Upload Sketch Image (OCR Reader)</h4>
                    <input type="file" accept="image/*, application/pdf" onChange={handleSketchFileUpload} style={{ width: '100%', padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', marginBottom: '15px' }} />
                    
                    {sketchPreview && (
                      <div style={{ marginBottom: '15px', textAlign: 'center', backgroundColor: '#e2e8f0', padding: '10px', borderRadius: '6px' }}>
                        {typeof sketchPreview === 'string' && sketchPreview.startsWith('blob:') ? (
                          <img src={sketchPreview} alt="Sketch Map" style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', fontWeight: '600' }}>{sketchPreview}</p>
                        )}
                      </div>
                    )}

                    {isOcrProcessing && <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', borderRadius: '6px', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>⏳ {ocrMessage}</div>}
                    {!isOcrProcessing && ocrMessage && <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f1f5f9', color: '#334155', borderRadius: '6px', fontSize: '12px', textAlign: 'center', border: '1px solid #cbd5e1' }}>{ocrMessage}</div>}

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

                    <button onClick={handleProcessOptionC} style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                      Generate KML & Open Window ⚙️
                    </button>
                  </div>
                )}

                {downloadReady && (
                  <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '14px', fontWeight: '600' }}>
                      ✅ KML File compiled and opened in a separate window!
                    </p>
                    <button onClick={handleDownloadKml} style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)' }}>
                      Download KML file again 📥
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}