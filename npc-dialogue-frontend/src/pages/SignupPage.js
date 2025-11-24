// src/pages/SignupPage.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";

const AuthContainer = styled.div`
  max-width: 500px;
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.18);
`;

const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

const StyledInput = styled.input`
  width: 100%;
`;

const ErrorMessage = styled.p`
  color: var(--color-accent-red);
  font-size: 0.875rem;
  margin-top: -0.5rem;
`;

// const API_URL = "http://127.0.0.1:8000";
const API_URL = "https://dialoguedumpster.onrender.com";

function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

   const handleSignup = async (e) => {
     e.preventDefault();
     setError("");

     if (password !== confirmPassword) {
       setError("Passwords do not match.");
       return;
     }

     const payload = { username, email, password };

     try {
       const response = await fetch(`${API_URL}/auth/signup`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload),
       });

       if (!response.ok) {
         const errorData = await response.json();
         // --- MODIFICATION: Log the full error for debugging ---
         console.error("Backend Validation Error:", errorData);
         throw new Error(
           errorData.detail?.[0]?.msg || errorData.detail || "Signup failed."
         );
       }

       alert("Signup successful! Please log in.");
       navigate("/login");
     } catch (e) {
       setError(e.message);
     }
   };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexGrow: 1,
      }}
    >
      <AuthContainer>
        <h2
          style={{
            fontSize: "2.5rem",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          Join the Forge
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          Create your account and start generating dialogues!
        </p>

        <AuthForm onSubmit={handleSignup}>
          <StyledInput
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <StyledInput
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <StyledInput
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <StyledInput
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
          >
            Create Account
          </button>
        </AuthForm>

        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--color-text-muted)",
            textAlign: "center",
            marginTop: "1.5rem",
          }}
        >
          Already have an account? <Link to="/login">Login Here</Link>
        </p>
      </AuthContainer>
    </div>
  );
}

export default SignupPage;
