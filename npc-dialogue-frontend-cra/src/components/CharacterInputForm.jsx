import React from "react";
import styles from "./CharacterInputForm.module.css";
import InputField from "./InputField"; // We'll create this helper component

function CharacterInputForm({
  characters,
  onCharacterChange,
  onAddCharacter,
  onRemoveCharacter,
}) {
  return (
    <div className={styles.characterForm}>
      {characters.map((char, index) => (
        <div key={index} className={styles.characterCard}>
          <h3 className={styles.cardTitle}>Character {index + 1}</h3>
          <div className={styles.inputRow}>
            <InputField
              label="Name"
              value={char.name}
              onChange={(e) => onCharacterChange(index, "name", e.target.value)}
              placeholder="e.g., Karo"
            />
            <InputField
              label="Personality"
              value={char.personality}
              onChange={(e) =>
                onCharacterChange(index, "personality", e.target.value)
              }
              placeholder="e.g., vengeful and intense"
            />
          </div>
          <div className={styles.inputRow}>
            <InputField
              label="Occupation"
              value={char.occupation}
              onChange={(e) =>
                onCharacterChange(index, "occupation", e.target.value)
              }
              placeholder="e.g., blade dancer"
            />
            <InputField
              label="Relationship"
              value={char.relationship}
              onChange={(e) =>
                onCharacterChange(index, "relationship", e.target.value)
              }
              placeholder="e.g., enemy of Rhael"
            />
          </div>
          {characters.length > 1 && (
            <button
              type="button"
              onClick={() => onRemoveCharacter(index)}
              className={styles.removeButton}
            >
              Remove Character
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={onAddCharacter}
        className={styles.addButton}
      >
        ➕ Add Another Character
      </button>
    </div>
  );
}

export default CharacterInputForm;
