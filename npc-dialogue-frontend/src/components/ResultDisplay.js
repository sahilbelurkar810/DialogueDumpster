// src/components/ResultDisplay.js
import React from "react";
import styled, { keyframes } from "styled-components";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const DisplayContainer = styled.div`
  position: relative;
  min-height: 300px;
  flex-grow: 1;
  background-color: var(--color-dark-bg);
  border: 1px solid var(--color-dark-border);
  border-radius: var(--border-radius-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
`;

const OutputTextarea = styled.textarea`
  flex-grow: 1;
  width: 100%;
  padding: 0.3rem;
  background-color: transparent;
  color: var(--color-text-light);
  border: none;
  outline: none;
  resize: none;
  overflow-y: auto;
  font-family: var(--font-family-mono);
  line-height: 1.8;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background-color: rgba(17, 24, 39, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  border-radius: var(--border-radius-lg);
  gap: 1.03rem;
`;

const Spinner = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  border: 4px solid var(--color-text-muted);
  border-top: 4px solid var(--color-accent-primary);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const InfoMessage = styled.div`
  font-size: 0.875rem;
  color: var(--color-text-muted);
  background-color: var(--color-dark-surface);
  border: 1px solid var(--color-dark-border);
  padding: 0.5rem;
  border-radius: var(--border-radius-lg);
`;

const ErrorMessage = styled.div`
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-accent-red);
  color: var(--color-accent-red);
  padding: 1rem;
  border-radius: var(--border-radius-lg);
  font-size: 0.875rem;
  text-align: center;
`;

const Placeholder = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
  font-style: italic;
  font-family: var(--font-family-mono);
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`;

function ResultDisplay({
  dialogue,
  isLoading,
  error,
  info,
  onDownloadTxt,
  onDownloadPdf,
  downloadAvailable,
}) {
  return (
    <DisplayContainer>
      {isLoading && (
        <LoadingOverlay>
          <Spinner />
          <p>Generating dialogue...</p>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
            This might take a moment.
          </p>
        </LoadingOverlay>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {dialogue && !isLoading && !error && (
        <>
          <OutputTextarea value={dialogue} rows="10" readOnly disabled />
          <ButtonGroup>
            <button
              className="btn btn-secondary"
              onClick={onDownloadTxt}
              disabled={!downloadAvailable}
            >
              Download TXT
            </button>
            <button
              className="btn btn-primary"
              onClick={onDownloadPdf}
              disabled={!downloadAvailable}
            >
              Download PDF
            </button>
          </ButtonGroup>
        </>
      )}
      {info && !isLoading && !error && <InfoMessage>{info}</InfoMessage>}
      {!dialogue && !isLoading && !error && (
        <Placeholder>Your generated dialogue will appear here.</Placeholder>
      )}
    </DisplayContainer>
  );
}

export default ResultDisplay;
