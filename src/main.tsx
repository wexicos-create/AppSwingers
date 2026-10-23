import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import SupabaseAccess from './SupabaseAccess.tsx';
import { initPushNotifications } from './push.ts';
import './index.css';

const isAccountRoute = /^\/(registro|ingresar)\/?$/.test(window.location.pathname);
createRoot(document.getElementById('root')!).render(isAccountRoute ? <SupabaseAccess /> : <App />);

// Real server push (FCM): permission handling, token registration per user
// and foreground message display. Safe no-op when the browser lacks support.
if (!isAccountRoute) initPushNotifications();
