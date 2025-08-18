// src/pages/ProtectedDialoguePage.js
import React from "react";
import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";
import DialoguePage from "./DialoguePage";

function ProtectedDialoguePage() {
  const { token } = useAuth();

  if (!token) {
    // If not logged in, redirect to the login page
    return <Navigate to="/login" />;
  }

  // If logged in, show the dialogue page
  return <DialoguePage />;
}

export default ProtectedDialoguePage;
