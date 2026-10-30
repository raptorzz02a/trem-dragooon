import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { readLightParam } from './light/light';
import { readSenseParam } from './sense/sense';
import { App } from './ui/App';
import './ui/theme.css';

readLightParam(location.search);
readSenseParam(location.search);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
