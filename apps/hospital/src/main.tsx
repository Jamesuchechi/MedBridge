import React from 'react'
import ReactDOM from 'react-dom/client'

const App = () => (
  <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
    <h1>Hospital Dashboard Placeholder</h1>
    <p>This is the internal portal for healthcare providers.</p>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
