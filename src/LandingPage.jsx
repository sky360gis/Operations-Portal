import React from 'react';
import logo from './assets/logo.png';

export default function LandingPage({ onGoToPortal }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1e293b' }}>
      
      {/* Top Header / Navigation Bar */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={logo} alt="SKY360 Solutions Logo" style={{ height: '55px', width: 'auto', objectFit: 'contain' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#004080', fontWeight: '700' }}>SKY360 Solutions</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Drone & DGPS Geospatial Solutions</p>
          </div>
        </div>

        <button 
          onClick={onGoToPortal}
          style={{ padding: '10px 20px', backgroundColor: '#0066cc', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(0, 102, 204, 0.25)' }}
        >
          <span>🔐 Employee Operations Portal</span>
        </button>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '80px 20px', textAlign: 'center', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Precision Surveying & Aerial Mapping
          </span>
          <h2 style={{ fontSize: '38px', color: '#0f172a', margin: '20px 0 15px 0', fontWeight: '800', lineHeight: '1.2' }}>
            High-Accuracy Drone Photogrammetry & DGPS Geodetic Surveys
          </h2>
          <p style={{ fontSize: '16px', color: '#475569', lineHeight: '1.6', marginBottom: '35px' }}>
            SKY360 Solutions delivers state-of-the-art geospatial surveys, riverbed bathymetry, mining volume estimation, and top-tier GNSS positioning across South India.
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <a href="#services" style={{ padding: '12px 26px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Explore Services
            </a>
            <button onClick={onGoToPortal} style={{ padding: '12px 26px', backgroundColor: '#f1f5f9', color: '#0066cc', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
              Staff Portal Access →
            </button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" style={{ padding: '60px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <h3 style={{ textAlign: 'center', fontSize: '24px', color: '#004080', marginBottom: '40px', fontWeight: '700' }}>Our Key Capabilities</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
          
          {/* Service Card 1 */}
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>🚁</div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#1e293b' }}>Drone Mapping & Photogrammetry</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              High-resolution aerial surveys delivering accurate 3D point clouds, digital elevation models (DEM), contour mapping, and orthomosaics.
            </p>
          </div>

          {/* Service Card 2 */}
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>📡</div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#1e293b' }}>DGPS & CORS Network Surveys</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Millimeter-level geodetic positioning using static & PPK/RTK GNSS workflows aligned with Survey of India CORS benchmarks.
            </p>
          </div>

          {/* Service Card 3 */}
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '32px', marginBottom: '15px' }}>⛏️</div>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#1e293b' }}>Volumetric Mining & Mineral Surveys</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
              Official sand block demarcation, pit volume computation, and minor mineral audit surveys compliant with state mining guidelines.
            </p>
          </div>

        </div>
      </section>

      {/* Internal Portal Callout Banner */}
      <section style={{ backgroundColor: '#e0f2fe', padding: '40px 20px', margin: '40px 0 0 0', borderTop: '1px solid #bae6fd' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', color: '#0369a1', fontWeight: '700' }}>Are you a SKY360 team member?</h4>
            <p style={{ margin: 0, fontSize: '14px', color: '#0c4a6e' }}>Log in to mark daily attendance, check in on project sites, and report field expenses.</p>
          </div>
          <button 
            onClick={onGoToPortal}
            style={{ padding: '12px 24px', backgroundColor: '#0066cc', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
          >
            Go to Operations Portal
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '30px 20px', textAlign: 'center', fontSize: '13px' }}>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} SKY360 Solutions. All Rights Reserved. | Bengaluru, Karnataka</p>
      </footer>

    </div>
  );
}