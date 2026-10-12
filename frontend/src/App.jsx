import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import MentorDashboard from "./pages/MentorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AddStudent from "./pages/AddStudent";

export default function App(){return <AuthProvider><Routes>
  <Route path="/login" element={<Login/>}/>
  <Route path="/mentor" element={<ProtectedRoute role="mentor"><MentorDashboard/></ProtectedRoute>}/>
  <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard/></ProtectedRoute>}/>
  <Route path="/add-student" element={<ProtectedRoute><AddStudent/></ProtectedRoute>}/>
  <Route path="*" element={<Navigate to="/login" replace/>}/>
</Routes></AuthProvider>}