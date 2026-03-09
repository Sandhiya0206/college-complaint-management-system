import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import StudentPage from './pages/StudentPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import WorkerPage from './pages/WorkerPage.jsx'
import NotFound from './pages/NotFound.jsx'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import StudentDashboard from './components/student/StudentDashboard.jsx'
import AdminDashboard from './components/admin/AdminDashboard.jsx'
import WorkerDashboard from './components/worker/WorkerDashboard.jsx'

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LandingPage />} />
        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
        </Route>
        <Route
          path="/worker"
          element={
            <ProtectedRoute role="worker">
              <WorkerPage />
            </ProtectedRoute>
          }
        >
          <Route index element={<WorkerDashboard />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default App
