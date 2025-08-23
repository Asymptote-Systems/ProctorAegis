// FILE: src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from './auth/AuthProvider';
import RequireAuth from './auth/RequireAuth';
import RequireRole from './auth/RequireRole';

// Import all your page components
import Login from './Login.jsx';
import StudentPlatform from './StudentPlatform.jsx';
import TeacherDashboard from './TeacherDashboard.jsx';
import StudentDashboard from "./StudentDashboard";
import Page404 from './Page404.jsx';
import APITest from './APITest.jsx';
import Forbidden from './Forbidden.jsx';

function App() {
  return (
    <AuthProvider>
      <>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/api" element={<APITest />} />

          {/* Protected Student Routes */}
          {/* <Route 
            path="/student/dashboard" 
            element={
              <RequireAuth>
                <RequireRole roles={["student"]}>
                  <StudentDashboard />
                </RequireRole>
              </RequireAuth>
            } 
          /> */}
          <Route 
            path="/student/platform/:examId" 
            element={
              <RequireAuth>
                <RequireRole roles={["student"]}>
                  <StudentPlatform />
                </RequireRole>
              </RequireAuth>
            } 
          />

          {/* Protected Teacher Routes */}
          <Route 
            path="/teacher/dashboard" 
            element={
              <RequireAuth>
                <RequireRole roles={["teacher", "admin"]}>
                  <TeacherDashboard />
                </RequireRole>
              </RequireAuth>
            } 
          />
          {/* Protected Student Routes */}
          <Route
            path="/student/dashboard"
            element={
              <RequireAuth>
                <RequireRole roles={["student"]}>
                  <StudentDashboard />
                </RequireRole>
              </RequireAuth>
            }
          />

          {/* --- 2. ADD THE NEW ROUTE FOR THE PROFILES PAGE --- */}
          {/* <Route 
            path="/profiles" 
            element={
              <RequireAuth>
                <RequireRole roles={["teacher", "admin"]}>
                  <ProfilesPage />
                </RequireRole>
              </RequireAuth>
            } 
          /> */}

          {/* Error pages */}
          <Route path="/403" element={<Forbidden />} />
          <Route path="*" element={<Page404 />} />
        </Routes>
      </>
    </AuthProvider>
  );
}

export default App;