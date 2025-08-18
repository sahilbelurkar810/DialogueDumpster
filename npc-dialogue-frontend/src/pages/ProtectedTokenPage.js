// src/pages/ProtectedTokenPage.js
import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import styled from "styled-components";
import { useAuth } from "../AuthContext";

const TokenContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  background-color: var(--color-dark-surface);
  border-radius: var(--border-radius-lg);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-dark-border);
`;

const TokenDisplay = styled.div`
  background-color: var(--color-dark-bg);
  border: 1px solid var(--color-dark-border);
  border-radius: var(--border-radius-lg);
  padding: 1rem;
  font-family: "Space Mono", monospace;
  word-wrap: break-word;
  color: var(--color-accent-green);
  text-align: center;
  margin-top: 1rem;
`;

const API_URL = "http://127.0.0.1:8000";

function TokenPage() {
  const { token } = useAuth();
  const [apiToken, setApiToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateToken = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/auth/generate-api-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Send the JWT with the request
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate API token.");
      }

      const result = await response.json();
      setApiToken(result.api_token);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TokenContainer>
      <h2
        style={{
          fontSize: "2.5rem",
          textAlign: "center",
          marginBottom: "1rem",
        }}
      >
        API Token Management
      </h2>
      <p
        style={{
          color: "var(--color-text-muted)",
          textAlign: "center",
          marginBottom: "2rem",
        }}
      >
        Your personal API token is required to make authenticated calls to our
        API endpoints.
      </p>
      <button
        className="btn btn-primary"
        style={{ width: "100%" }}
        onClick={handleGenerateToken}
        disabled={isLoading}
      >
        {isLoading ? "Generating..." : "Generate New API Token"}
      </button>
      {error && (
        <p
          style={{
            color: "var(--color-accent-red)",
            marginTop: "1rem",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}
      {apiToken && <TokenDisplay>{apiToken}</TokenDisplay>}
    </TokenContainer>
  );
}

function ProtectedTokenPage() {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" />;
  }
  return <TokenPage />;
}

export default ProtectedTokenPage;
