// src/pages/LoginPage.js
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../AuthContext";

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

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const formBody = new URLSearchParams();
    formBody.append("username", username);
    formBody.append("password", password);

    try {
      const response = await fetch(`${API_URL}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Login failed.");
      }

      const result = await response.json();
      login({ username }, result.access_token);
      navigate("/dialogue");
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
          Login to the Forge
        </h2>
        <p
          style={{
            color: "var(--color-text-muted)",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          Access your saved dialogues and preferences.
        </p>

        <AuthForm onSubmit={handleLogin}>
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
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "1rem" }}
          >
            Enter the Game
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
          Don't have an account? <Link to="/signup">Sign Up Here</Link>
        </p>
      </AuthContainer>
    </div>
  );
}

export default LoginPage;
