// src/pages/DialoguePage.js
import React, { useState } from 'react';
import styled from 'styled-components';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // For better PDF table/grid support

// Import your components
import ContextInput from '../components/ContextInput';
import CharacterInputForm from '../components/CharacterInputForm';
import DialogueLengthSelector from '../components/DialogueLengthSelector';
import ResultDisplay from '../components/ResultDisplay';

const DialogueGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
  
  /* Custom scrollbar styles */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--color-dark-surface);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--color-accent-primary);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--color-accent-secondary);
  }
`;

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  /* Custom scrollbar styles */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--color-dark-surface);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--color-accent-primary);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--color-accent-secondary);
  }
`;

const OutputContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 600px; /* Fixed height */
  min-height: 600px; /* Ensure minimum height */
  
  /* Custom scrollbar styles */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: var(--color-dark-surface);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: var(--color-accent-primary);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--color-accent-secondary);
  }
`;

const StyledButton = styled.button`
  width: 100%;
  margin-top: auto;
`;

const ToggleWrapper = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
`;

const ToggleSwitch = styled.label`
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
`;

const ToggleSlider = styled.span`
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--color-dark-surface);
    transition: 0.4s;
    border-radius: 34px;
    
    &:before {
        position: absolute;
        content: "";
        height: 26px;
        width: 26px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: 0.4s;
        border-radius: 50%;
    }
`;

const ToggleInput = styled.input`
    opacity: 0;
    width: 0;
    height: 0;

    &:checked + ${ToggleSlider} {
        background-color: var(--color-accent-primary);
    }
    &:checked + ${ToggleSlider}:before {
        transform: translateX(26px);
    }
`;

const StyledJsonUpload = styled.div`
  min-height: 10rem;
  font-family: var(--font-family-mono);
  background-color: var(--color-dark-bg);
  border: 1px solid var(--color-dark-border);
  border-radius: var(--border-radius-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  
  &:hover {
    border-color: var(--color-accent-primary);
  }
`;

const FileInput = styled.input`
  display: none;
`;

function DialoguePage() {
  const [useJsonMode, setUseJsonMode] = useState(false);
  const [jsonFileContent, setJsonFileContent] = useState(null); // Changed state name
  const [jsonFileName, setJsonFileName] = useState(''); // New state for filename

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
  const handleAddCharacter = () => { setCharacters([...characters, { name: "", personality: "", occupation: "", relationship: "" }]); };
  const handleRemoveCharacter = (indexToRemove) => { if (characters.length > 1) { setCharacters(characters.filter((_, index) => index !== indexToRemove)); } };

  const API_URL = "http://127.0.0.1:8000/generate_dialogue";

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === "application/json") {
        setJsonFileName(file.name); // Store the filename
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const jsonContent = JSON.parse(e.target.result);
            setJsonFileContent(jsonContent); // Store the content
            setError(null);
          } catch (err) {
            setError("Invalid JSON format. Please upload a valid JSON file.");
            setJsonFileContent(null);
          }
        };
        reader.readAsText(file);
      } else {
        setError("Invalid file type. Please upload a JSON file.");
        setJsonFileName('');
        setJsonFileContent(null);
      }
    }
  };

  const handleDownloadTxt = () => {
    if (generatedDialogue) {
      const element = document.createElement("a");
      const file = new Blob([generatedDialogue], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = "dialogue_script.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const handleDownloadPdf = () => {
    if (generatedDialogue) {
      const doc = new jsPDF();
      doc.setFont('Inter', 'normal');
      const lines = doc.splitTextToSize(generatedDialogue, 180); // Split text into lines that fit the page
      doc.text(lines, 10, 10);
      doc.save("dialogue_script.pdf");
    }
  };

  const handleGenerateDialogue = async () => {
    setError(null); setInfoMessage(null); setGeneratedDialogue(""); setIsLoading(true);
    let payload;

    if (useJsonMode) {
      if (!jsonFileContent) {
        setError("Please upload a valid JSON file.");
        setIsLoading(false);
        return;
      }
      payload = jsonFileContent;
    } else {
      if (!context.trim()) { setError("Please provide a game context."); setIsLoading(false); return; }
      if (characters.some(char => !char.name.trim())) { setError("Please provide a name for all characters."); setIsLoading(false); return; }
      if (characters.length === 0) { setError("Please add at least one character."); setIsLoading(false); return; }
      payload = { context, characters, dialogue_length: dialogueLength };
    }

    try {
      const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      setGeneratedDialogue(result.generated_dialogue);
      const formattedTimestamp = new Date(result.timestamp).toLocaleString();
      setInfoMessage(`Model: ${result.model_used} | Generated: ${formattedTimestamp}`);
    } catch (e) {
      console.error("Error generating dialogue:", e);
      setError(`Failed to generate dialogue: ${e.message}. Please ensure your FastAPI server is running.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: 'var(--color-dark-surface)', borderRadius: 'var(--border-radius-lg)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', border: '1px solid var(--color-dark-border)' }}>
      <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>Dialogue Forge</h2>
      
      <ToggleWrapper>
          <span>Use JSON File</span>
          <ToggleSwitch>
              <ToggleInput type="checkbox" checked={useJsonMode} onChange={() => setUseJsonMode(!useJsonMode)} />
              <ToggleSlider />
          </ToggleSwitch>
      </ToggleWrapper>

      <DialogueGrid>
        <FormContainer>
          {useJsonMode ? (
            <StyledJsonUpload onClick={() => document.getElementById('json-file-input').click()}>
              <input id="json-file-input" type="file" accept=".json" onChange={handleFileUpload} />
              {jsonFileName ? (
                <span>File uploaded: {jsonFileName}</span>
              ) : (
                <span>Click to upload JSON file</span>
              )}
            </StyledJsonUpload>
          ) : (
            <>
              <ContextInput value={context} onChange={(e) => setContext(e.target.value)} />
              <CharacterInputForm characters={characters} onCharacterChange={handleCharacterChange} onAddCharacter={handleAddCharacter} onRemoveCharacter={handleRemoveCharacter} />
              <DialogueLengthSelector value={dialogueLength} onChange={(e) => setDialogueLength(e.target.value)} />
            </>
          )}
          <StyledButton className="btn btn-primary" onClick={handleGenerateDialogue} disabled={isLoading}>
            {isLoading ? "Generating..." : "🚀 Generate Dialogue"}
          </StyledButton>
        </FormContainer>
        <OutputContainer>
          <ResultDisplay
            dialogue={generatedDialogue}
            isLoading={isLoading}
            error={error}
            info={infoMessage}
            onDownloadTxt={handleDownloadTxt}
            onDownloadPdf={handleDownloadPdf}
            downloadAvailable={!!generatedDialogue}
          />
        </OutputContainer>
      </DialogueGrid>
    </div>
  );
}

export default DialoguePage;