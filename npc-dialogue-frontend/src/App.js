// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";
import { GlobalStyles } from "./GlobalStyles";

import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DialoguePage from "./pages/DialoguePage";
import { AuthProvider } from "./AuthContext";
import ProtectedTokenPage from "./pages/ProtectedTokenPage";
function App() {
  return (
    <AuthProvider>
      <>
        <GlobalStyles />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
          }}
        >
          <Navbar />
          <main
            style={{
              flexGrow: 1,
              padding: "1rem",
              maxWidth: "1400px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/dialogue" element={<DialoguePage />} />
              <Route path="/token" element={<ProtectedTokenPage />} />
            </Routes>
          </main>
        </div>
      </>
    </AuthProvider>
  );
}

export default App;
