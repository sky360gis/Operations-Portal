import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth.jsx';
import LandingPage from './LandingPage.jsx';
import logo from './assets/logo.png';

// Add your allowed employee and admin emails here:
const ALLOWED_EMAILS = [
  'sandeep.p1981@gmail.com', // Your admin account
  'sandeep@sky360.com',
  'admin2@sky360.com',
];

// Idle timeout limit: 15 minutes
const INACTIVITY_LIMIT = 15 * 60 * 1000; 

export default function App() {
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState('user'); // 'user' | 'admin'
  const [activeTab, setActiveTab] = useState('work'); // 'work' | 'expense'
  const [unauthorizedEmail, setUnauthorizedEmail] = useState(null);

  // Ref to hold current timer ID to prevent stale closures
  const idleTimerRef = useRef(null);

  // Dynamic Projects List
  const [projectList, setProjectList] = useState([]);

  // Attendance states
  const [attendanceStatus, setAttendanceStatus] = useState('not_checked_in');
  const [attendanceId, setAttendanceId] = useState(null);
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);

  // Work log states
  const [project, setProject] = useState('');
  const [task, setTask] = useState('');
  const [hours, setHours] = useState('');
  const [logs, setLogs] = useState([]);

  // Expense states
  const [expProject, setExpProject] = useState('');
  const [expCategory, setExpCategory] = useState('Fuel');
  const [expAmount, setExpAmount] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [myExpenses, setMyExpenses] = useState([]);

  // Admin Data states
  const [allAttendance, setAllAttendance] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);

  // Direct Logout Execution
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

  // Idle Activity Tracking Effect
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
      validateAndSetSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      validateAndSetSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if logged-in user is authorized
  const validateAndSetSession = async (currentSession) => {
    if (currentSession) {
      const userEmail = currentSession.user.email;
      console.log("Logged-in user email:", userEmail);

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
    const { data } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

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
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('check_in', `${today}T00:00:00Z`)
      .order('check_in', { ascending: false })
      .limit(1);

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
    const { data, error } = await supabase.from('attendance').insert([{
      user_id: session.user.id
    }]).select().single();

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
    const { error } = await supabase.from('attendance')
      .update({ check_out: checkoutTimeIso })
      .eq('id', attendanceId);

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
    const { data } = await supabase
      .from('work_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setLogs(data);
  };

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from('field_expenses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setMyExpenses(data);
  };

  const fetchAdminData = async () => {
    const { data: attData } = await supabase
      .from('attendance')
      .select('*, profiles(email)')
      .order('check_in', { ascending: false });

    const { data: logData } = await supabase
      .from('work_logs')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });

    const { data: expData } = await supabase
      .from('field_expenses')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });

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

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>Loading application...</div>;
  }

  // Render Landing Page first when visitor opens the website
  if (showLandingPage) {
    return <LandingPage onGoToPortal={() => setShowLandingPage(false)} />;
  }

  if (unauthorizedEmail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f0f6ff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '40px 30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', textAlign: 'center', width: '400px', borderTop: '4px solid #dc2626' }}>
          <img src={logo} alt="SKY360 Logo" style={{ height: '60px', width: 'auto', objectFit: 'contain', marginBottom: '20px' }} />
          <h3 style={{ color: '#991b1b', marginBottom: '12px', fontSize: '20px' }}>Access Restricted</h3>
          <p style={{ color: '#991b1b', fontSize: '14px', marginBottom: '25px', lineHeight: '1.5', fontWeight: '600' }}>
            Unauthorised User, Contact Admin for Sign In
          </p>
          <button 
            onClick={() => setUnauthorizedEmail(null)}
            style={{ width: '100%', padding: '12px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f6ff', padding: '30px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', backgroundColor: '#ffffff', padding: '22px 25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', borderTop: '4px solid #0066cc', flexWrap: 'wrap', gap: '15px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <img 
              src={logo} 
              alt="SKY360 Logo" 
              style={{ height: '87px', width: 'auto', objectFit: 'contain', display: 'block' }} 
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <h2 style={{ margin: 0, color: '#004080', fontSize: '24px', fontWeight: '700', letterSpacing: '-0.5px' }}>Operations Portal</h2>
              <button 
                onClick={() => setShowLandingPage(true)} 
                style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: '600', fontSize: '12px' }}
              >
                ← Back to Website
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {isAdmin && (
                <button 
                  onClick={() => setViewMode(viewMode === 'user' ? 'admin' : 'user')} 
                  style={{ padding: '8px 16px', background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', color: '#0369a1', fontWeight: '600', fontSize: '14px', transition: 'background 0.2s' }}
                >
                  {viewMode === 'user' ? 'Switch to Admin Panel ⚙️' : 'Switch to My Portal 👤'}
                </button>
              )}
              <button 
                onClick={() => supabase.auth.signOut()} 
                style={{ padding: '8px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#334155', fontWeight: '500', fontSize: '14px' }}
              >
                Sign Out
              </button>
            </div>

            <p style={{ margin: 0, color: '#475569', fontSize: '13px', textAlign: 'right' }}>
              User: <strong>{session.user.email}</strong> {isAdmin && <span style={{ backgroundColor: '#0066cc', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '6px' }}>Admin</span>}
            </p>
          </div>

        </div>

        {/* ADMIN DASHBOARD VIEW */}
        {isAdmin && viewMode === 'admin' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
              <h3 style={{ margin: 0, color: '#004080', fontSize: '16px' }}>Executive Reports & Exports</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={exportToCSV} style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  Export Work Logs (CSV) 📥
                </button>
                <button onClick={handlePrintPDF} style={{ padding: '8px 16px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
                  Print / Save Summary PDF 📄
                </button>
              </div>
            </div>

            {/* Team Attendance Register */}
            <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#004080', fontSize: '18px' }}>Team Attendance Register</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
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
            <div style={{ backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#004080', fontSize: '18px' }}>Logged Field Expenses</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* Daily Attendance Status Block */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px 25px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', borderLeft: '5px solid #0066cc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#004080', fontSize: '16px' }}>Daily Attendance Status</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Mark your single check-in and check-out for today.</p>
              </div>

              <div>
                {attendanceStatus === 'not_checked_in' && (
                  <button 
                    onClick={handleCheckIn} 
                    style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
                  >
                    Check In For Today 🟢
                  </button>
                )}

                {attendanceStatus === 'checked_in' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '13px' }}>Checked In at {checkInTime} 🟢</span>
                    <button 
                      onClick={handleCheckOut} 
                      style={{ padding: '10px 20px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}
                    >
                      Check Out (End Day) 🔴
                    </button>
                  </div>
                )}

                {attendanceStatus === 'completed' && (
                  <div style={{ backgroundColor: '#f0f6ff', padding: '8px 15px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                    <span style={{ color: '#004080', fontWeight: '600', fontSize: '13px' }}>Attendance Completed ✅ ({checkInTime} - {checkOutTime})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Full Screen Interactive Tabs Selector */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #bae6fd', paddingBottom: '0px' }}>
              <button 
                onClick={() => setActiveTab('work')}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: activeTab === 'work' ? '#ffffff' : 'transparent', 
                  color: activeTab === 'work' ? '#0066cc' : '#64748b', 
                  border: activeTab === 'work' ? '1px solid #bae6fd' : 'none', 
                  borderBottom: activeTab === 'work' ? '2px solid #0066cc' : 'none',
                  borderTopLeftRadius: '8px', 
                  borderTopRightRadius: '8px', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '15px' 
                }}
              >
                📁 Add & View Work Activity
              </button>
              <button 
                onClick={() => setActiveTab('expense')}
                style={{ 
                  padding: '12px 24px', 
                  backgroundColor: activeTab === 'expense' ? '#ffffff' : 'transparent', 
                  color: activeTab === 'expense' ? '#059669' : '#64748b', 
                  border: activeTab === 'expense' ? '1px solid #bae6fd' : 'none', 
                  borderBottom: activeTab === 'expense' ? '2px solid #059669' : 'none',
                  borderTopLeftRadius: '8px', 
                  borderTopRightRadius: '8px', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '15px' 
                }}
              >
                💰 Log Field Expense / Fuel
              </button>
            </div>

            {/* TAB 1: WORK ACTIVITY VIEW */}
            {activeTab === 'work' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', alignItems: 'start' }}>
                
                <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: '#004080', fontSize: '18px' }}>Add Work Activity</h3>
                  <form onSubmit={handleAddLog} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Project Name</label>
                      <select 
                        value={project} 
                        onChange={(e) => setProject(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                      >
                        {projectList.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Hours Spent</label>
                      <input 
                        type="number" 
                        step="0.5" 
                        placeholder="e.g. 4.5" 
                        value={hours} 
                        onChange={(e) => setHours(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Task Description</label>
                      <textarea 
                        placeholder="Describe tasks completed..." 
                        value={task} 
                        onChange={(e) => setTask(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', minHeight: '100px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <button 
                      type="submit" 
                      style={{ padding: '14px', backgroundColor: '#0066cc', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}
                    >
                      + Save Work Item
                    </button>
                  </form>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: '#004080', fontSize: '18px' }}>Your Work History ({logs.length})</h3>
                  {logs.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>No work records found.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '450px', overflowY: 'auto' }}>
                      {logs.map((log) => (
                        <div key={log.id} style={{ padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <strong style={{ color: '#1e293b', fontSize: '14px' }}>{log.project_name}</strong>
                            <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                              {log.hours_spent} hrs
                            </span>
                          </div>
                          <p style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '13px', lineHeight: '1.4' }}>{log.task_description}</p>
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                            Logged on: {new Date(log.created_at).toLocaleString()}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', alignItems: 'start' }}>
                
                <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: '#004080', fontSize: '18px' }}>Log Field Expense / Fuel</h3>
                  <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Project</label>
                      <select 
                        value={expProject} 
                        onChange={(e) => setExpProject(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                      >
                        {projectList.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Category</label>
                      <select 
                        value={expCategory} 
                        onChange={(e) => setExpCategory(e.target.value)} 
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#fff' }}
                      >
                        <option value="Fuel">Fuel</option>
                        <option value="Travel / Food">Travel / Food</option>
                        <option value="Equipment Rental">Equipment Rental</option>
                        <option value="Permits / Site Fee">Permits / Site Fee</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Amount (₹)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 500" 
                        value={expAmount} 
                        onChange={(e) => setExpAmount(e.target.value)} 
                        required 
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#475569', marginBottom: '8px' }}>Notes / Description</label>
                      <input 
                        type="text" 
                        placeholder="e.g. DGPS Survey vehicle fuel refill" 
                        value={expDesc} 
                        onChange={(e) => setExpDesc(e.target.value)} 
                        style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <button 
                      type="submit" 
                      style={{ padding: '14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}
                    >
                      + Save Expense
                    </button>
                  </form>
                </div>

                <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: '#004080', fontSize: '18px' }}>Your Expenses History ({myExpenses.length})</h3>
                  {myExpenses.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>No expenses recorded.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '450px', overflowY: 'auto' }}>
                      {myExpenses.map((exp) => (
                        <div key={exp.id} style={{ padding: '15px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <strong style={{ color: '#1e293b', fontSize: '14px' }}>{exp.project_name}</strong>
                            <span style={{ color: '#059669', fontWeight: '700', fontSize: '14px' }}>₹{exp.amount}</span>
                          </div>
                          <p style={{ margin: '0 0 4px 0', color: '#475569', fontSize: '13px' }}><strong>{exp.category}</strong>: {exp.description || 'No notes'}</p>
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                            Logged on: {new Date(exp.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}