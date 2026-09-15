import { createRoot } from 'react-dom/client';

import App from './App';
import { AuthProvider } from '@/auth/AuthContext';
import { AppProviders } from '@/components/AppProviders';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <AuthProvider>
      <App />
    </AuthProvider>
  </AppProviders>,
);
