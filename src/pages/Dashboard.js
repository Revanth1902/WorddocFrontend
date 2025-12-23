import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import ConfirmModal from '../components/ConfirmModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDoc, setDeleteDoc] = useState(null);

const fetchDocs = async () => {
  try {
    const res = await api.get('/documents'); // cookie sent automatically
    setDocs(res.data);
  } catch (err) {
    console.error('Error fetching docs:', err.response?.status, err.response?.data);
  }
};


  useEffect(() => {
    fetchDocs();
  }, []);

  const handleCreate = async () => {
    const res = await api.post('/documents');
    navigate(`/doc/${res.data._id}`);
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

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <h2>My Documents</h2>
        <button onClick={handleCreate}>+ New Document</button>
        {loading ? <p>Loading...</p> : (
          <ul>
            {docs.map(doc => (
              <li key={doc._id}>
                <span onClick={() => navigate(`/doc/${doc._id}`)}>{doc.title || 'Untitled'}</span>
                <button onClick={() => setDeleteDoc(doc)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <main className="dashboard-main">
        <h1>Welcome to your Dashboard</h1>
        <p>Select a document or create a new one to start editing.</p>
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

export default Dashboard;
