import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';         
import Dashboard from './pages/Dashboard';  

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<div>404 - Page Not Found</div>} />
    </Routes>
  );
}

export default App;