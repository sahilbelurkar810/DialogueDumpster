import React, { useState } from 'react';
import styles from './App.module.css'; // Import CSS module for layout
import './index.css'; // Global styles loaded first

// Import your components
import ContextInput from './components/ContextInput';
import CharacterInputForm from './components/CharacterInputForm';
import DialogueLengthSelector from './components/DialogueLengthSelector';
import ResultDisplay from './components/ResultDisplay'; // Contains Loading/Error/Info messages

const API_URL = "http://127.0.0.1:8000/generate_dialogue";

function App() {
  const [context, setContext] = useState("A lone adventurer encounters a grumpy old wizard guarding a dusty ancient scroll in a forgotten library.");
  const [characters, setCharacters] = useState([
    {"name": "Elias", "personality": "curious and determined", "occupation": "adventurer", "relationship": "stranger to Gandalf"},
    {"name": "Gandalf", "personality": "grumpy and wise", "occupation": "old wizard", "relationship": "guardian of the scroll"}
  ]);
  const [dialogueLength, setDialogueLength] = useState("Medium");
  const [generatedDialogue, setGeneratedDialogue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const handleCharacterChange = (index, field, value) => {
    const updatedCharacters = [...characters];
    updatedCharacters[index] = { ...updatedCharacters[index], [field]: value };
    setCharacters(updatedCharacters);
  };

  const handleAddCharacter = () => {
    setCharacters([
      ...characters,
      { name: "", personality: "", occupation: "", relationship: "" }
    ]);
  };

  const handleRemoveCharacter = (indexToRemove) => {
    if (characters.length > 1) {
      setCharacters(characters.filter((_, index) => index !== indexToRemove));
    }
  };

  const handleGenerateDialogue = async () => {
    setError(null);
    setInfoMessage(null);
    setGeneratedDialogue("");
    setIsLoading(true);

    // Basic validation
    if (!context.trim()) {
      setError("Please provide a game context.");
      setIsLoading(false);
      return;
    }
    if (characters.some(char => !char.name.trim())) {
      setError("Please provide a name for all characters.");
      setIsLoading(false);
      return;
    }
    if (characters.length === 0) {
        setError("Please add at least one character.");
        setIsLoading(false);
        return;
    }

    const payload = {
      context: context,
      characters: characters,
      dialogue_length: dialogueLength
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setGeneratedDialogue(result.generated_dialogue);
      // Format timestamp for better readability
      const formattedTimestamp = new Date(result.timestamp).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      });
      setInfoMessage(`Model: ${result.model_used} | Generated: ${formattedTimestamp}`);
    } catch (e) {
      console.error("Error generating dialogue:", e);
      setError(`Failed to generate dialogue: ${e.message}. Please ensure your FastAPI server is running on http://127.0.0.1:8000.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.appContainer}>
      {/* Header */}
      <header className={styles.header}>
        <h1>DIALOGUE DUMPSTER</h1>
        <p>Bring your game characters to life with dynamic AI-powered conversations.</p>
      </header>

      {/* Context Input Area */}
      <section className={`${styles.sectionCard} ${styles.contextArea}`}>
        <h2>1. Game Context</h2>
        <ContextInput value={context} onChange={(e) => setContext(e.target.value)} />
      </section>

      {/* Characters Input Area */}
      <section className={`${styles.sectionCard} ${styles.charactersArea}`}>
        <h2>2. Characters Involved</h2>
        <CharacterInputForm
          characters={characters}
          onCharacterChange={handleCharacterChange}
          onAddCharacter={handleAddCharacter}
          onRemoveCharacter={handleRemoveCharacter}
        />
      </section>

      {/* Controls Area (Length Selector & Generate Button) */}
      <section className={`${styles.sectionCard} ${styles.controlsArea}`}>
        <h2>3. Dialogue Options</h2>
        <DialogueLengthSelector value={dialogueLength} onChange={(e) => setDialogueLength(e.target.value)} />
        <button
          className={`${styles.generateButton} button-primary`} 
          onClick={handleGenerateDialogue}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "🚀 Generate Dialogue"}
        </button>
      </section>

      {/* Generated Dialogue Output Area */}
      <section className={`${styles.sectionCard} ${styles.outputArea}`}>
        <h2>Generated Dialogue</h2>
        <ResultDisplay
          dialogue={generatedDialogue}
          isLoading={isLoading}
          error={error}
          info={infoMessage}
        />
      </section>
    </div>
  );
}

export default App;