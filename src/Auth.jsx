import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import logo from './assets/logo.png';

const ALLOWED_EMAILS = [
  'sandeep.p1981@gmail.com','lakshmisagaroct11@gmail.com', // Add your authorized emails here
];

export default function Auth() {
  const [errorMessage, setErrorMessage] = useState(null);

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setErrorMessage('Error logging in with Google: ' + error.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f0f6ff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '40px 30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', textAlign: 'center', width: '380px', borderTop: '4px solid #0066cc' }}>
        
        {/* SKY360 Logo */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
          <img 
            src={logo} 
            alt="SKY360 Logo" 
            style={{ height: '70px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>

        <h2 style={{ color: '#004080', marginBottom: '8px', fontSize: '22px', fontWeight: '700' }}>Operations Portal</h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '25px', lineHeight: '1.4' }}>Sign In to Mark Attendance, Log Work and Expenses</p>
        
        {/* Persistent Unauthorized Message Card */}
        {errorMessage && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '13px', lineHeight: '1.4', fontWeight: '500' }}>
            {errorMessage}
          </div>
        )}

        <button 
          onClick={handleGoogleLogin}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: '#ffffff', 
            color: '#334155', 
            border: '1px solid #cbd5e1', 
            borderRadius: '6px', 
            cursor: 'pointer', 
            fontWeight: '600', 
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'background 0.2s'
          }}
        >
          <span>🌐 Continue with Google</span>
        </button>
      </div>
    </div>
  );
}