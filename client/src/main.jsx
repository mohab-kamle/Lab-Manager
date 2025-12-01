// Polyfill for Node.js Buffer (needed for @react-pdf/renderer)
import { Buffer } from 'buffer';
window.Buffer = Buffer;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// import 'bootstrap/dist/css/bootstrap.min.css';
import './custom.scss';
import { AuthProvider } from './context/AuthContext.jsx';
import { LabProvider } from './context/LabContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <LabProvider>
        <App />
      </LabProvider>
    </AuthProvider>
  </StrictMode>,
)
