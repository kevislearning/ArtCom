import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { GoogleOAuthWrapper } from './components/GoogleOAuthWrapper'
import { store } from './store'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <GoogleOAuthWrapper>
        <App />
      </GoogleOAuthWrapper>
    </Provider>
  </StrictMode>,
)
