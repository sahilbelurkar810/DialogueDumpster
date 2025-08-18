// src/components/ContextInput.js
import React from "react";
import styled from "styled-components";

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex-grow: 1;
`;

const StyledLabel = styled.label`
  color: var(--color-text-muted);
  font-size: 0.875rem;
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  height: 10rem;
  padding: 1rem;
  background-color: var(--color-dark-bg);
  border: 1px solid var(--color-dark-border);
  border-radius: var(--border-radius-lg);
  resize: vertical;
  flex-grow: 1;
`;

function ContextInput({ value, onChange }) {
  return (
    <InputGroup>
      <StyledLabel htmlFor="context">Game Context</StyledLabel>
      <StyledTextarea
        id="context"
        value={value}
        onChange={onChange}
        placeholder="e.g., A lone adventurer encounters a grumpy old wizard..."
      />
    </InputGroup>
  );
}

export default ContextInput;
