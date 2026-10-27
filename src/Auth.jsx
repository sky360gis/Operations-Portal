import React from 'react';
import { supabase } from './supabaseClient';
import logo from './assets/logo.png';

export default function Auth() {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      alert('Error logging in with Google: ' + error.message);
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
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '30px', lineHeight: '1.4' }}>Sign In to Mark Attendance, Log Work and Expenses</p>
        
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