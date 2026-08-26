import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './store/AppStore'
import { PrefsProvider } from './store/Prefs'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/Confirm'
import './styles/base.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AppProvider>
            <PrefsProvider>
              <App />
            </PrefsProvider>
          </AppProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
