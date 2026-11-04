import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/frank-ruhl-libre/400.css';
import '@fontsource/frank-ruhl-libre/700.css';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import './ui/styles.css';
import { App } from './ui/App';
import { initStore } from './ui/store';

registerSW({ immediate: true });

const root = createRoot(document.getElementById('root')!);
root.render(<p className="loading">טוען את היער…</p>);

initStore().then(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
