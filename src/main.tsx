import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'
import UpdatePrompt from './components/ui/UpdatePrompt.tsx'
import { CURRENT_ENV, envLog } from './config/envConfig'

// Log environment information
envLog(`Application starting in ${CURRENT_ENV} environment`)

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

// Display environment banner in development mode
if (CURRENT_ENV === 'development') {
  const envBanner = document.createElement('div')
  envBanner.style.position = 'fixed'
  envBanner.style.bottom = '0'
  envBanner.style.right = '0'
  envBanner.style.backgroundColor = 'rgba(255, 0, 0, 0.7)'
  envBanner.style.color = 'white'
  envBanner.style.padding = '5px 10px'
  envBanner.style.fontSize = '12px'
  envBanner.style.zIndex = '9999'
  envBanner.style.borderTopLeftRadius = '5px'
  // Use createTextNode to avoid TrustedHTML issues
  envBanner.appendChild(document.createTextNode('DEV MODE'))
  document.body.appendChild(envBanner)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PWAUpdateWrapper />
  </StrictMode>,
)
