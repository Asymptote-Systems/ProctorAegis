// FILE: src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";

// Import all your page components
import Login from './Login.jsx';
import StudentPlatform from './studentPlatform.jsx';
import TeacherDashboard from './teacherDashboard.jsx';
import Page404 from './Page404.jsx';
import APITest from './APITest.jsx'; // Keeping your original API Test route

function App() {
  return (
    <Routes>
      {/* Route to automatically redirect the user from the base URL "/" to "/login" */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Your application's main pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/student/platform" element={<StudentPlatform />} />
      <Route path="/teacher/dashboard" element={<TeacherDashboard />} />

      {/* Your original API Test route is preserved */}
      <Route path="/api" element={<APITest />} />

      {/* This is the catch-all route for any page that doesn't exist */}
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
}

export default App;