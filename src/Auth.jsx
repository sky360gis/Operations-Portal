import React from 'react';
import { supabase } from './supabaseClient';

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
      <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)', textAlign: 'center', width: '360px', borderTop: '4px solid #0066cc' }}>
        <h2 style={{ color: '#004080', marginBottom: '8px', fontSize: '22px' }}>SKY360 Operations Portal</h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '30px' }}>Sign in to access your attendance and field logs</p>
        
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