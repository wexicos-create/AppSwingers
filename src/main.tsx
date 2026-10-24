import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { initPushNotifications } from './push.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Local mode (sin base de datos): permisos de notificación y recordatorios
// locales. No-op seguro cuando el navegador no tiene soporte.
initPushNotifications();
