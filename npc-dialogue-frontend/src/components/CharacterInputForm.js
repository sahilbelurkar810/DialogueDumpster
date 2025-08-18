// src/components/CharacterInputForm.js
import React from "react";
import styled from "styled-components";
import { FaTrashAlt, FaPlusSquare } from "react-icons/fa"; // Make sure to install react-icons

const FormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
  max-height: 300px;
`;

const CharacterCard = styled.div`
  background-color: var(--color-dark-bg);
  padding: 1rem;
  border: 1px solid var(--color-dark-border);
  border-radius: var(--border-radius-lg);
  position: relative;
`;

const InputRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 0.75rem;
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background-color: var(--color-accent-red);
  color: white;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

function CharacterInputForm({
  characters,
  onCharacterChange,
  onAddCharacter,
  onRemoveCharacter,
}) {
  return (
    <FormWrapper>
      {characters.map((char, index) => (
        <CharacterCard key={index}>
          <h3 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
            Character {index + 1}
          </h3>
          <InputRow>
            <input
              type="text"
              placeholder="Name"
              value={char.name}
              onChange={(e) => onCharacterChange(index, "name", e.target.value)}
            />
            <input
              type="text"
              placeholder="Personality"
              value={char.personality}
              onChange={(e) =>
                onCharacterChange(index, "personality", e.target.value)
              }
            />
            <input
              type="text"
              placeholder="Occupation"
              value={char.occupation}
              onChange={(e) =>
                onCharacterChange(index, "occupation", e.target.value)
              }
            />
            <input
              type="text"
              placeholder="Relationship"
              value={char.relationship}
              onChange={(e) =>
                onCharacterChange(index, "relationship", e.target.value)
              }
            />
          </InputRow>
          {characters.length > 1 && (
            <RemoveButton
              type="button"
              onClick={() => onRemoveCharacter(index)}
            >
              <FaTrashAlt size={14} />
            </RemoveButton>
          )}
        </CharacterCard>
      ))}
      <button className="btn btn-secondary" onClick={onAddCharacter}>
        <FaPlusSquare style={{ marginRight: "0.5rem" }} /> Add Another Character
      </button>
    </FormWrapper>
  );
}

export default CharacterInputForm;
