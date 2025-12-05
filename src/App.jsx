import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Login from "./Pages/Login.jsx";
import Signup from "./Pages/Signup.jsx"; 
import Admin from "./Pages/Admin.jsx";
import Teacher from "./Pages/Teacher.jsx";

const baseStyles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    fontFamily: "Inter, system-ui, sans-serif",
    backgroundColor: "transparent",
    color: "#F9FAF5",
  },
};


function PrivateRoute({ children, allowedRole }) {
  const { user, role, loading } = useAuth();

  
  if (loading) return <div>Chargement...</div>;

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && allowedRole !== role) {
   
    return <Navigate to={role === "admin" ? "/admin" : "/teacher"} replace />;
  }

  return children;
}

export default function App() {
 
  useEffect(() => {
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.backgroundColor = "transparent";
  }, []);

  return (
    <div style={baseStyles.page}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Routes Publiques */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} /> {/* <--- ROUTE AJOUTÉE */}

            {/* Routes Privées Admin */}
            <Route
              path="/admin"
              element={
                <PrivateRoute allowedRole="admin">
                  <Admin />
                </PrivateRoute>
              }
            />

            {/* Routes Privées Enseignant */}
            <Route
              path="/teacher"
              element={
                <PrivateRoute allowedRole="teacher">
                  <Teacher />
                </PrivateRoute>
              }
            />

            {/* Redirection par défaut */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}