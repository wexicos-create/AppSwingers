import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import SupabaseAccess from './SupabaseAccess.tsx';
import { initPushNotifications } from './push.ts';
import './index.css';

const root = createRoot(document.getElementById('root')!);
let pushInitialized = false;

function renderRoute() {
  const isAccountRoute = /^\/(registro|ingresar)\/?$/.test(window.location.pathname) || /^#\/(registro|ingresar)\/?$/.test(window.location.hash);
  root.render(isAccountRoute ? <SupabaseAccess key={window.location.pathname + window.location.hash} /> : <App />);

  // Initialize push once, only when visiting the main application.
  if (!isAccountRoute && !pushInitialized) {
    pushInitialized = true;
    initPushNotifications();
  }
}

// Hash navigation stays in the current document, so render the new route.
window.addEventListener('hashchange', renderRoute);
window.addEventListener('popstate', renderRoute);
renderRoute();
