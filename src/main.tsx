import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import UpdatePrompt from './components/ui/UpdatePrompt.tsx'


// PWA update component
const PWAUpdateWrapper = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  

  
  // Register service worker for PWA
  const updateSW = registerSW({
    onNeedRefresh() {
      setNeedRefresh(true);
    },
    onOfflineReady() {
      // App ready to work offline
    },
  });
  

  
  return (
    <>
      <App />
      <UpdatePrompt 
        updateAvailable={needRefresh} 
        onUpdate={() => updateSW(true)} 
      />
    </>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PWAUpdateWrapper />
  </StrictMode>,
)
