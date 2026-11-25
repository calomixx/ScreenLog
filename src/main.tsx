import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { cleanupLegacyStorage } from './utils/legacyCleanup';
import { installFirestoreDiagnosticsGlobal } from './lib/firestore';
import './index.css';

cleanupLegacyStorage();
installFirestoreDiagnosticsGlobal();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
