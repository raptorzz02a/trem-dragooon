import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { readLightParam } from './light/light';
import { App } from './ui/App';
import './ui/theme.css';

readLightParam(location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
