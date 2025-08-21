// FILE: src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './auth/AuthProvider';
import RequireAuth from './auth/RequireAuth';
import RequireRole from './auth/RequireRole';

// Import all your page components
import Login from './Login.jsx';
import StudentPlatform from './studentPlatform.jsx';
import TeacherDashboard from './teacherDashboard.jsx';
import Page404 from './Page404.jsx';
import APITest from './APITest.jsx';
import Forbidden from './Forbidden.jsx';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Route to automatically redirect the user from the base URL "/" to "/login" */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/api" element={<APITest />} />

        {/* Protected routes - Student access only */}
        <Route path="/student/platform" element={
          <RequireAuth>
            <RequireRole roles={["student"]}>
              <StudentPlatform />
            </RequireRole>
          </RequireAuth>
        } />

        {/* Protected routes - Teacher access only */}
        <Route path="/teacher/dashboard" element={
          <RequireAuth>
            <RequireRole roles={["teacher"]}>
              <TeacherDashboard />
            </RequireRole>
          </RequireAuth>
        } />

        {/* Error pages */}
        <Route path="/403" element={<Forbidden />} />
        <Route path="*" element={<Page404 />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;