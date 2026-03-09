import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { ComplaintProvider } from './context/ComplaintContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <ComplaintProvider>
            <App />
            <ToastContainer
              position="top-right"
              autoClose={4000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnHover
              draggable
              theme="light"
            />
          </ComplaintProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
)
