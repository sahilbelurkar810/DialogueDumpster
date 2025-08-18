# main.py
import datetime
import json
import os
from typing import List, Literal, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from routers import auth
from huggingface_hub import InferenceClient

# Load environment variables
load_dotenv()
API_TOKEN = os.getenv("HF_TOKEN")

# --- Model name constant ---
LLM_MODEL_NAME = "openai/gpt-oss-120b"

# --- App setup ---
app = FastAPI(title="NPC Dialogue Generator (no-auth)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class Character(BaseModel):
    name: str
    personality: str
    occupation: str
    relationship: str

class DialogueRequest(BaseModel):
    context: str
    characters: List[Character] = Field(min_items=1)
    dialogue_length: Literal["Short", "Medium", "Long"]

class DialogueResponse(BaseModel):
    generated_dialogue: str
    model_used: str
    timestamp: str

# --- Include authentication routes ---
app.include_router(auth.router, tags=["Authentication"], prefix="/auth")

# --- Hugging Face client ---
client = InferenceClient(api_key=API_TOKEN)
def create_prompt(data: Dict[str, Any]) -> str:
    context = data.get("context", "")
    dialogue_length_str = data.get("dialogue_length", "Medium")

    # Map dialogue length to target number of exchanges
    length_mapping = {"Short": 24, "Medium": 48, "Long": 62}
    target_lines = length_mapping.get(dialogue_length_str, 48)

    characters = data.get("characters", [])
    character_names = [c.get('name', '') for c in characters]
    
    characters_str = "\n".join(
        f"- Name: {c.get('name', '')}, Personality: {c.get('personality', '')}, "
        f"Occupation: {c.get('occupation', '')}, Relationship: {c.get('relationship', '')}"
        for c in characters
    )
    
    # Create example showing how to alternate between characters
    example_pattern = ""
    if len(character_names) >= 2:
        example_pattern = f"\nExample format:\n{character_names[0]}: [their dialogue]\n"
        if len(character_names) >= 2:
            example_pattern += f"{character_names[1]}: [their dialogue]\n"
        if len(character_names) >= 3:
            example_pattern += f"{character_names[2]}: [their dialogue]\n"
        example_pattern += "...and so on, alternating between all characters.\n"

    return (
        "<|system|>\n"
        "You are an AI assistant specialized in generating dialogue for video game NPCs. "
        "Your task is to create a dialogue based on the provided context, character details, and their relationships. "
        f"Write exactly {target_lines} turns of dialogue, cycling through all {len(characters)} characters in order. "
        "Each character should speak in turn, then move to the next character, then cycle back to the first. "
        "Ensure the dialogue is consistent with the characters' personalities, occupations, "
        "and relationships and directly reflects the given context.\n"
        f"{example_pattern}"
        "**CRITICAL: Output ONLY the dialogue lines in the format 'CharacterName: dialogue text'. "
        "Do NOT include any explanations, planning, reasoning, or commentary. "
        "Start immediately with the first character's line.**\n"
        "</s>\n"
        "<|user|>\n"
        f"Context: {context}\n\n"
        f"Characters (speak in this order, cycling through):\n{characters_str}\n\n"
        f"Generate exactly {target_lines} lines of dialogue now:\n"
        "</s>\n"
        "<|assistant|>\n"
    )
    
def get_llm_response(prompt: str, num_predict: int, target_lines: int = 48) -> str:
    try:
        completion = client.chat.completions.create(
            model=LLM_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=num_predict,
            temperature=0.8
        )

        if not completion or not completion.choices:
            raise ValueError(f"Empty response from LLM: {completion}")

        message = completion.choices[0].message

        # Get all available content
        all_content = []
        if message.content:
            all_content.append(("content", message.content))
        if hasattr(message, 'reasoning_content') and message.reasoning_content:
            all_content.append(("reasoning_content", message.reasoning_content))
        
        def extract_dialogue_aggressively(text, source_name):
            # Split text into chunks and look for dialogue in each
            potential_dialogue = []
            
            # Look for sections that might contain dialogue
            sections = []
            
            # Split by common separators
            for separator in ['\n\n', ':\n', 'dialogue:\n', 'conversation:\n']:
                if separator.lower() in text.lower():
                    sections.extend(text.split(separator))
            
            # If no sections found, treat whole text as one section
            if not sections:
                sections = [text]
            
            for section in sections:
                lines = section.split('\n')
                section_dialogue = []
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # More flexible dialogue detection
                    if ':' in line:
                        parts = line.split(':', 1)
                        if len(parts) == 2:
                            name_part = parts[0].strip()
                            dialogue_part = parts[1].strip()
                            
                            # Remove numbers from the beginning of name_part (e.g., "1. Elias" -> "Elias")
                            clean_name = name_part
                            if name_part and name_part[0].isdigit():
                                # Remove leading numbers and dots/spaces
                                clean_name = name_part.lstrip('0123456789. ').strip()
                            
                            # Check if this looks like character dialogue
                            if (clean_name and dialogue_part and
                                len(clean_name) <= 25 and  # Allow longer names
                                not clean_name.lower().startswith(('step', 'line', 'turn', 'note', 'example')) and
                                not any(word in clean_name.lower() for word in 
                                       ['user', 'assistant', 'system', 'we need', 'total', 'after']) and
                                len(dialogue_part) > 5 and  # Meaningful dialogue
                                dialogue_part[0] not in ['(', '[', '<'] and  # Not stage directions
                                not dialogue_part.lower().startswith(('exactly', 'we need', 'so ', 'since'))):
                                
                                section_dialogue.append(f"{clean_name}: {dialogue_part}")
                
                # If this section has more dialogue than what we found so far, use it
                if len(section_dialogue) > len(potential_dialogue):
                    potential_dialogue = section_dialogue
            
            print(f"Found {len(potential_dialogue)} dialogue lines in {source_name}")
            if len(potential_dialogue) > 0:
                print(f"First few lines from {source_name}: {potential_dialogue[:3]}")
            
            return potential_dialogue
        
        # Try to extract from all content sources
        best_dialogue = []
        for source_name, content in all_content:
            dialogue_lines = extract_dialogue_aggressively(content, source_name)
            if len(dialogue_lines) > len(best_dialogue):
                best_dialogue = dialogue_lines
        
        # If we found dialogue lines, format and return them
        if best_dialogue:
            # Take up to target_lines
            final_lines = best_dialogue[:target_lines]
            
            # Format with spacing
            formatted_lines = []
            for i, line in enumerate(final_lines):
                formatted_lines.append(line)
                if i < len(final_lines) - 1:
                    formatted_lines.append("")
            
            return "\n".join(formatted_lines)
        
        # If still no dialogue found, try to manually generate it from the character info
        # This is a fallback approach
        print("No dialogue found in model output, attempting fallback generation...")
        
        # Try a simpler, more direct prompt
        simple_prompt = f"""Generate dialogue between characters. Just write the lines:

{prompt.split('Characters (speak in this order, cycling through):')[1].split('Generate exactly')[0]}

Write conversation lines in this format:
CharacterName: What they say

Start now:"""
        
        # Make another API call with simpler prompt
        try:
            simple_completion = client.chat.completions.create(
                model=LLM_MODEL_NAME,
                messages=[{"role": "user", "content": simple_prompt}],
                max_tokens=min(num_predict, 400),  # Limit tokens for fallback
                temperature=0.9
            )
            
            if simple_completion and simple_completion.choices:
                fallback_message = simple_completion.choices[0].message
                fallback_content = fallback_message.content or getattr(fallback_message, "reasoning_content", "") or ""
                
                if fallback_content:
                    fallback_dialogue = extract_dialogue_aggressively(fallback_content, "fallback")
                    if fallback_dialogue:
                        final_lines = fallback_dialogue[:min(target_lines, 12)]  # Limit fallback to fewer lines
                        formatted_lines = []
                        for i, line in enumerate(final_lines):
                            formatted_lines.append(line)
                            if i < len(final_lines) - 1:
                                formatted_lines.append("")
                        return "\n".join(formatted_lines)
        
        except Exception as fallback_error:
            print(f"Fallback generation failed: {fallback_error}")
        
        # Final fallback: return detailed debug info
        debug_info = "DIALOGUE EXTRACTION FAILED\n"
        debug_info += f"Sources checked: {len(all_content)}\n\n"
        
        for source_name, content in all_content:
            debug_info += f"=== {source_name.upper()} ===\n"
            debug_info += f"Length: {len(content)} characters\n"
            debug_info += f"First 500 chars:\n{content[:500]}\n"
            debug_info += "="*50 + "\n\n"
        
        return debug_info

    except Exception as e:
        raise RuntimeError(f"LLM request failed: {e}")





# --- API Endpoints ---
@app.get("/")
async def root():
    return {"message": f"NPC Dialogue Generator API is running with {LLM_MODEL_NAME} (no auth)!"}
# Add this new endpoint for JSON file uploads
@app.post("/generate_dialogue_from_file", response_model=DialogueResponse)
async def generate_dialogue_from_file(
    file: UploadFile = File(...),
    dialogue_length: Literal["Short", "Medium", "Long"] = Form(...)
):
    # Validate file type
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    try:
        # Read and parse JSON file
        content = await file.read()
        json_data = json.loads(content.decode('utf-8'))
        
        # Extract data from JSON
        context = json_data.get("context", "")
        characters_data = json_data.get("characters", [])
        
        # Validate JSON structure
        if not context:
            raise HTTPException(status_code=400, detail="JSON must contain 'context' field")
        
        if not characters_data or not isinstance(characters_data, list):
            raise HTTPException(status_code=400, detail="JSON must contain 'characters' array")
        
        # Convert to Character objects
        characters = []
        for char_data in characters_data:
            if not all(key in char_data for key in ['name', 'personality', 'occupation', 'relationship']):
                raise HTTPException(
                    status_code=400, 
                    detail="Each character must have 'name', 'personality', 'occupation', and 'relationship' fields"
                )
            characters.append(Character(**char_data))
        
        # Create dialogue request
        dialogue_request = DialogueRequest(
            context=context,
            characters=characters,
            dialogue_length=dialogue_length
        )
        
        # Generate dialogue using existing logic
        prompt = create_prompt(dialogue_request.dict())
        
        length_config = {
            "Short": {"max_tokens": 300, "target_lines": 24},
            "Medium": {"max_tokens": 800, "target_lines": 48},
            "Long": {"max_tokens": 1200, "target_lines": 62}
        }
        config = length_config[dialogue_length]
        
        full_response_content = get_llm_response(
            prompt, 
            config["max_tokens"], 
            config["target_lines"]
        )
        
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        return DialogueResponse(
            generated_dialogue=full_response_content,
            model_used=LLM_MODEL_NAME,
            timestamp=timestamp
        )
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dialogue generation failed: {str(e)}")

# Also update your existing endpoint to handle both JSON requests and form data
@app.post("/generate_dialogue", response_model=DialogueResponse)
async def generate_dialogue(request: Request):
    try:
        # Try to parse as JSON first
        data = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    try:
        dialogue_request = DialogueRequest(**data)
        prompt = create_prompt(dialogue_request.dict())

        length_config = {
            "Short": {"max_tokens": 300, "target_lines": 24},
            "Medium": {"max_tokens": 800, "target_lines": 48},
            "Long": {"max_tokens": 1200, "target_lines": 62}
        }
        config = length_config[dialogue_request.dialogue_length]
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid input schema: {e}")

    try:
        full_response_content = get_llm_response(
            prompt, 
            config["max_tokens"], 
            config["target_lines"]
        )
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        return DialogueResponse(
            generated_dialogue=full_response_content,
            model_used=LLM_MODEL_NAME,
            timestamp=timestamp
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dialogue generation failed: {str(e)}")