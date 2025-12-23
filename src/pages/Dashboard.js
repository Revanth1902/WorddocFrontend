import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Handle screen resizing to auto-close/open sidebar
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents');
      setDocs(res.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
      else console.error('Error fetching docs:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await api.post('/documents');
      navigate(`/doc/${res.data._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/documents/${id}`, { data: { confirmDelete: true } });
      setDocs(docs.filter(d => d._id !== id));
      setDeleteDoc(null);
    } catch (err) {
      console.error(err);
    }
  };

  const isMobile = windowWidth <= 768;

  return (
    <div style={styles.dashboardContainer}>
      {/* MOBILE HEADER (Hamburger & Title) */}
      {isMobile && (
        <header style={styles.mobileHeader}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.hamburgerBtn}>
            ☰
          </button>
          <div style={styles.mobileLogo}>WordClone</div>
        </header>
      )}

      {/* SIDEBAR */}
      <aside style={{
        ...styles.sidebar,
        left: isSidebarOpen ? '0' : '-280px', // Slide in/out animation logic
        width: isMobile ? '280px' : '300px',
        boxShadow: isMobile && isSidebarOpen ? '5px 0 15px rgba(0,0,0,0.2)' : 'none'
      }}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>My Documents</h2>
          {isMobile && <button onClick={() => setIsSidebarOpen(false)} style={styles.closeSidebarBtn}>✕</button>}
        </div>

        <button onClick={handleCreate} style={styles.createBtn}>
          <span style={{ fontSize: '24px', marginRight: '10px' }}>+</span> 
          New Document
        </button>

        <div style={styles.docListContainer}>
          {loading ? (
            <div style={styles.loadingText}>Loading...</div>
          ) : (
            <ul style={styles.docList}>
              {docs.length === 0 && <p style={styles.emptyText}>No documents yet.</p>}
              {docs.map(doc => (
                <li key={doc._id} style={styles.docItem}>
                  <div 
                    style={styles.docTitleWrapper} 
                    onClick={() => navigate(`/doc/${doc._id}`)}
                  >
                    <span style={styles.docIcon}>📄</span>
                    <span style={styles.docTitleText}>{doc.title || 'Untitled'}</span>
                  </div>
                  <button onClick={() => setDeleteDoc(doc)} style={styles.deleteBtn} title="Delete">
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          style={styles.sidebarOverlay}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <main style={{
        ...styles.mainContent,
        marginLeft: isMobile ? '0' : '300px'
      }}>
        <div style={styles.welcomeHero}>
          <h1 style={styles.mainTitle}>Welcome to your Workspace</h1>
          <p style={styles.subTitle}>Select a document from the sidebar to continue your work or create a fresh one.</p>
          
          {/* Quick Actions for Mobile Dashboard view */}
          {docs.length > 0 && isMobile && (
            <div style={styles.quickActions}>
              <h3>Recent Documents</h3>
              {docs.slice(0, 3).map(doc => (
                 <div key={doc._id} onClick={() => navigate(`/doc/${doc._id}`)} style={styles.mobileCard}>
                    <span>📄 {doc.title || 'Untitled'}</span>
                    <span>→</span>
                 </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {deleteDoc && (
        <ConfirmModal
          message={`Are you sure you want to delete "${deleteDoc.title || 'Untitled'}"?`}
          onConfirm={() => handleDelete(deleteDoc._id)}
          onCancel={() => setDeleteDoc(null)}
        />
      )}
    </div>
  );
};

/* ====================== INLINE STYLES ====================== */
const styles = {
  dashboardContainer: {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    width: '100vw',
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    background: '#f8f9fa',
    overflow: 'hidden',
  },
  mobileHeader: {
    position: 'fixed',
    top: 0,
    width: '100%',
    height: '60px',
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    alignItems: 'center',
    padding: '0 15px',
    zIndex: 100,
  },
  hamburgerBtn: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#5f6368',
  },
  mobileLogo: {
    marginLeft: '15px',
    fontWeight: 'bold',
    fontSize: '18px',
    color: '#1a73e8',
  },
  sidebar: {
    position: 'fixed',
    height: '100vh',
    background: '#fff',
    borderRight: '1px solid #dadce0',
    transition: 'left 0.3s ease',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: {
    fontSize: '1.2rem',
    color: '#202124',
    margin: 0,
  },
  closeSidebarBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
  },
  createBtn: {
    margin: '0 20px 20px 20px',
    padding: '12px',
    background: '#fff',
    border: '1px solid #dadce0',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(60,64,67, 0.3)',
    transition: 'background 0.2s',
    color: '#3c4043',
  },
  docListContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 10px',
  },
  docList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  docItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 15px',
    borderRadius: '0 20px 20px 0',
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginBottom: '4px',
  },
  docTitleWrapper: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    overflow: 'hidden',
  },
  docIcon: {
    marginRight: '12px',
    color: '#1a73e8',
  },
  docTitleText: {
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: '#3c4043',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#dadce0',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '5px',
    transition: 'color 0.2s',
  },
  sidebarOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.4)',
    zIndex: 150,
  },
  mainContent: {
    flex: 1,
    padding: '40px',
    marginTop: '60px', // For mobile header space
    transition: 'margin-left 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  welcomeHero: {
    maxWidth: '600px',
    width: '100%',
    marginTop: '10vh',
  },
  mainTitle: {
    fontSize: '2rem',
    color: '#202124',
    marginBottom: '15px',
  },
  subTitle: {
    color: '#5f6368',
    fontSize: '1.1rem',
    lineHeight: '1.6',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9aa0a6',
    fontSize: '14px',
    marginTop: '20px',
  },
  loadingText: {
    textAlign: 'center',
    padding: '20px',
    color: '#5f6368',
  },
  quickActions: {
    marginTop: '40px',
    textAlign: 'left',
  },
  mobileCard: {
    background: '#fff',
    border: '1px solid #dadce0',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
};

export default Dashboard;