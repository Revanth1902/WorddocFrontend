import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';
import ConfirmModal from '../components/ConfirmModal';
import Cropper from 'react-easy-crop';
import { Rnd } from 'react-rnd';

const Editor = () => {
  const { id } = useParams();
  
  // Document State
  const [doc, setDoc] = useState({ title: '', content: '' });
  const [images, setImages] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [undoDoc, setUndoDoc] = useState(null);

  // Crop Modal State
  const [cropModal, setCropModal] = useState({ show: false, id: null, src: null });
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Refs for logic
  const editorRef = useRef(null);
  const saveTimeout = useRef(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  /* ====================== RESPONSIVE HANDLER ====================== */
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ====================== FETCH & SOCKETS ====================== */
  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await api.get(`/documents/${id}`);
        setDoc(res.data);
        setUndoDoc(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching doc:", err);
      }
    };
    fetchDoc();

    socket.connect();
    socket.emit('joinDoc', id);
    socket.on('docUpdate', data => {
      if (editorRef.current && data.content !== editorRef.current.innerHTML) {
        setDoc(prev => ({ ...prev, content: data.content }));
      }
    });

    return () => {
      socket.emit('leaveDoc', id);
      socket.off('docUpdate');
      socket.disconnect();
    };
  }, [id]);

  /* ====================== CORE ACTIONS ====================== */
  const triggerAutoSave = () => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveDoc(false), 2000);
  };

  const saveDoc = async (manual = true) => {
    try {
      setSaving(true);
      const currentContent = editorRef.current.innerHTML;
      await api.put(`/documents/${id}`, { 
        title: doc.title, 
        content: currentContent,
        confirmOverwrite: true 
      });
      if (manual) setUndoDoc({ ...doc, content: currentContent });
      socket.emit('docEdit', { docId: id, content: currentContent });
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const format = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current.focus();
    triggerAutoSave();
  };

  /* ====================== IMAGE LOGIC ====================== */
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newImg = {
        id: Date.now(),
        src: reader.result,
        x: 20, 
        y: 20,
        width: windowWidth < 600 ? 180 : 250, 
        height: 'auto'
      };
      setImages(prev => [...prev, newImg]);
      triggerAutoSave();
    };
    reader.readAsDataURL(file);
  };

  const deleteImage = (imgId) => {
    setImages(prev => prev.filter(img => img.id !== imgId));
    triggerAutoSave();
  };

  const handleCropComplete = async () => {
    const image = new Image();
    image.src = cropModal.src;
    await new Promise(r => image.onload = r);
    
    const canvas = document.createElement('canvas');
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(
      image,
      croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height,
      0, 0, croppedAreaPixels.width, croppedAreaPixels.height
    );

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('image', blob, 'cropped.jpg');
      
      try {
        const res = await api.post('/images/upload', formData);
        setImages(prev => prev.map(img => 
          img.id === cropModal.id ? { ...img, src: res.data.url } : img
        ));
      } catch (err) {
        console.error("Upload failed, using local preview", err);
        const localUrl = URL.createObjectURL(blob);
        setImages(prev => prev.map(img => 
          img.id === cropModal.id ? { ...img, src: localUrl } : img
        ));
      }
      setCropModal({ show: false, id: null, src: null });
      triggerAutoSave();
    }, 'image/jpeg');
  };

  if (loading) return <div style={styles.loader}>Opening Document...</div>;

  const isMobile = windowWidth < 768;

  return (
    <div style={styles.container}>
      {/* WORD STYLE RIBBON TOOLBAR */}
      <div style={styles.ribbon}>
        <div style={styles.topRow}>
          <input
            style={styles.titleInput}
            value={doc.title}
            onChange={(e) => setDoc({ ...doc, title: e.target.value })}
            onBlur={() => saveDoc(false)}
            placeholder="Untitled Document"
          />
          <div style={styles.actionBtns}>
            <button onClick={() => saveDoc(true)} style={styles.primaryBtn}>{isMobile ? '💾' : 'Save'}</button>
            <button onClick={() => setShowUndoConfirm(true)} style={styles.secondaryBtn}>↩</button>
          </div>
        </div>

        <div style={styles.formattingRow}>
          <div style={styles.toolGroup}>
            <button onClick={() => format('bold')} style={styles.toolBtn}><b>B</b></button>
            <button onClick={() => format('italic')} style={styles.toolBtn}><i>I</i></button>
            <button onClick={() => format('underline')} style={styles.toolBtn}><u>U</u></button>
          </div>
          <div style={styles.divider} />
          <div style={styles.toolGroup}>
            <button onClick={() => format('insertUnorderedList')} style={styles.toolBtn}>•</button>
            <button onClick={() => format('insertOrderedList')} style={styles.toolBtn}>1.</button>
          </div>
          <div style={styles.divider} />
          <label style={styles.uploadBtn}>
            📷 {isMobile ? '' : 'Insert Image'}
            <input type="file" hidden onChange={handleImageSelect} accept="image/*" />
          </label>
          {saving && <span style={styles.saveIndicator}>{isMobile ? '...' : 'Saving...'}</span>}
        </div>
      </div>

      {/* EDITOR PAGE AREA */}
      <div style={styles.viewport}>
        <div style={{
          ...styles.paper,
          width: isMobile ? '100%' : '850px',
          padding: isMobile ? '20px' : '75px',
          margin: isMobile ? '0' : '20px auto'
        }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={triggerAutoSave}
            style={styles.contentArea}
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />

          {/* DRAGGABLE & RESIZABLE IMAGES */}
          {images.map((img) => (
            <Rnd
              key={img.id}
              default={{ x: img.x, y: img.y, width: img.width, height: 'auto' }}
              bounds="parent"
              lockAspectRatio
              style={styles.rndWrapper}
              onDragStop={(e, d) => {
                setImages(prev => prev.map(i => i.id === img.id ? { ...i, x: d.x, y: d.y } : i));
                triggerAutoSave();
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                setImages(prev => prev.map(i => i.id === img.id ? { 
                  ...i, 
                  width: ref.offsetWidth, 
                  height: ref.offsetHeight,
                  ...position 
                } : i));
                triggerAutoSave();
              }}
            >
              <div style={styles.imgToolbar}>
                <button onClick={() => setCropModal({ show: true, id: img.id, src: img.src })} style={styles.miniBtn}>✂️</button>
                <button onClick={() => deleteImage(img.id)} style={styles.miniBtn}>🗑️</button>
              </div>
              <img src={img.src} style={styles.editorImg} alt="user content" />
            </Rnd>
          ))}
        </div>
      </div>

      {/* FULLSCREEN CROP MODAL */}
      {cropModal.show && (
        <div style={styles.modalBackdrop}>
          <div style={{
            ...styles.cropBox,
            width: isMobile ? '100%' : '600px',
            height: isMobile ? '100%' : '550px'
          }}>
            <div style={styles.modalHeader}>
              <span>Edit Image</span>
              <button onClick={() => setCropModal({ show: false })} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.cropViewport}>
              <Cropper
                image={cropModal.src}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>
            <div style={styles.modalFooter}>
              <button onClick={handleCropComplete} style={styles.applyBtn}>Apply Changes</button>
            </div>
          </div>
        </div>
      )}

      {showUndoConfirm && (
        <ConfirmModal
          message="Discard recent changes and revert?"
          onConfirm={() => { setDoc(undoDoc); setShowUndoConfirm(false); saveDoc(false); }}
          onCancel={() => setShowUndoConfirm(false)}
        />
      )}
    </div>
  );
};

/* ====================== STYLES ====================== */
const styles = {
  container: { background: '#f3f4f6', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, Roboto, Arial' },
  loader: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#4b5563' },
  ribbon: {
    background: '#ffffff',
    borderBottom: '1px solid #d1d5db',
    padding: '12px 16px',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
  },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', marginBottom: '10px' },
  titleInput: { border: 'none', fontSize: '18px', fontWeight: 'bold', outline: 'none', flex: 1, color: '#111827' },
  actionBtns: { display: 'flex', gap: '10px' },
  formattingRow: { display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '5px' },
  toolGroup: { display: 'flex', gap: '4px' },
  toolBtn: { 
    width: '38px', height: '38px', background: '#f9fafb', border: '1px solid #e5e7eb', 
    borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' 
  },
  divider: { width: '1px', height: '24px', background: '#e5e7eb' },
  uploadBtn: { 
    background: '#eff6ff', color: '#2563eb', padding: '0 12px', height: '38px', 
    borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '500' 
  },
  primaryBtn: { background: '#2563eb', color: '#fff', border: 'none', padding: '0 20px', height: '38px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  secondaryBtn: { background: '#fff', border: '1px solid #d1d5db', width: '38px', height: '38px', borderRadius: '6px', cursor: 'pointer' },
  saveIndicator: { fontSize: '12px', color: '#6b7280', fontStyle: 'italic', whiteSpace: 'nowrap' },
  
  viewport: { flex: 1, padding: '10px', overflowY: 'auto' },
  paper: { 
    background: '#fff', minHeight: '1000px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
    position: 'relative', borderRadius: '2px', boxSizing: 'border-box' 
  },
  contentArea: { 
    minHeight: '800px', outline: 'none', fontSize: '16px', lineHeight: '1.6', 
    color: '#374151', wordWrap: 'break-word' 
  },
  
  rndWrapper: { zIndex: 5 },
  editorImg: { width: '100%', height: '100%', display: 'block', borderRadius: '4px', pointerEvents: 'none' },
  imgToolbar: { 
    position: 'absolute', top: '-40px', left: '0', display: 'flex', gap: '6px', 
    padding: '4px', background: 'rgba(255,255,255,0.9)', borderRadius: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' 
  },
  miniBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '2px' },
  
  modalBackdrop: { 
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
    background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 
  },
  cropBox: { background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  modalHeader: { padding: '15px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', fontWeight: 'bold' },
  cropViewport: { flex: 1, position: 'relative', background: '#000' },
  modalFooter: { padding: '15px', textAlign: 'center' },
  applyBtn: { 
    background: '#2563eb', color: '#fff', border: 'none', padding: '12px 40px', 
    borderRadius: '30px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' 
  },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }
};

export default Editor;