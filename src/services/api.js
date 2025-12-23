// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://rol-notes-backend.onrender.com',
  withCredentials: true
});

export default api;
