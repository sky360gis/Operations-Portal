import React from 'react';
import logo from './assets/logo.png';

export default function LandingPage({ onGoToPortal }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#1e293b' }}>
      
      {/* Top Header / Navigation Bar */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        
        {/* Scaled Logo (1.5x size) without extra header text */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={logo} 
            alt="SKY360 Logo" 
            style={{ height: '82.5px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>

        {/* Clean, Single Action Button in Top Right Corner */}
        <button 
          onClick={onGoToPortal}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#0066cc', 
            color: '#ffffff', 
            border: 'none', 
            borderRadius: '6px', 
            fontWeight: '600', 
            fontSize: '14px', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            boxShadow: '0 2px 6px rgba(0, 102, 204, 0.25)',
            transition: 'background 0.2s'
          }}
        >
          <span>Go to Operations Portal →</span>
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
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <a href="#services" style={{ padding: '12px 28px', backgroundColor: '#0f172a', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>
              Explore Services
            </a>
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

      {/* Footer */}
      <footer style={{ backgroundColor: '#0f172a', color: '#94a3b8', padding: '30px 20px', textAlign: 'center', fontSize: '13px', marginTop: '60px' }}>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} SKY360 Solutions. All Rights Reserved. | Bengaluru, Karnataka</p>
      </footer>

    </div>
  );
}