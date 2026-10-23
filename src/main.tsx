import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { initPushNotifications } from './push.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Real server push (FCM): permission handling, token registration per user
// and foreground message display. Safe no-op when the browser lacks support.
initPushNotifications();
