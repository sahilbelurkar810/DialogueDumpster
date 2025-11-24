# main.py
import datetime
import json
import os
from typing import List, Literal, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
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
    allow_origins=["*"],  
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


# ============================================================
# PROMPT CREATION (FIXED)
# ============================================================
def create_prompt(data: Dict[str, Any]) -> str:
    context = data["context"]
    dialogue_length_str = data["dialogue_length"]  # DO NOT default
    characters = data["characters"]

    # Map dialogue length → number of turns
    length_mapping = {"Short": 24, "Medium": 48, "Long": 62}
    target_lines = length_mapping[dialogue_length_str]

    characters_str = "\n".join(
        f"- Name: {c['name']}, Personality: {c['personality']}, "
        f"Occupation: {c['occupation']}, Relationship: {c['relationship']}"
        for c in characters
    )

    character_names = [c["name"] for c in characters]

    example_pattern = ""
    if len(character_names) >= 2:
        example_pattern = (
            "\nExample format:\n" +
            "\n".join([f"{n}: [their dialogue]" for n in character_names[:3]]) +
            "\n...and so on, strictly rotating.\n"
        )

    # ---------------- FIXED: f-string for {target_lines} ----------------
    return f"""
<|system|>
You are an AI assistant generating dialogue for NPCs in video games.

STRICT RULES:
- Generate EXACTLY {target_lines} dialogue lines.
- Follow strict rotation of characters in the given order.
- Format MUST be: CharacterName: dialogue text
- NO actions, NO asterisks (*), NO parentheses, NO stage directions.
- ONLY plain spoken dialogue.
- If any character would perform an action, OMIT it entirely.

{example_pattern}
Begin immediately with the first character.
</s>

<|user|>
Context: {context}

Characters (speak in this exact order, cycling continuously):
{characters_str}

Generate exactly {target_lines} lines of pure dialogue:
</s>

<|assistant|>
""".strip()


# ============================================================
# LLM RESPONSE PROCESSING (unchanged except higher token use)
# ============================================================
def get_llm_response(prompt: str, num_predict: int, target_lines: int = 48) -> str:
    try:
        completion = client.chat.completions.create(
            model=LLM_MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=num_predict,
            temperature=0.7
        )

        message = completion.choices[0].message
        content = message.content or ""

        # Extract lines matching Character: text
        lines = []
        for line in content.split("\n"):
            if ":" in line:
                name, text = line.split(":", 1)
                if name.strip() and text.strip():
                    lines.append(f"{name.strip()}: {text.strip()}")

        # Trim to target_lines
        if len(lines) >= target_lines:
            return "\n".join(lines[:target_lines])

        return "\n".join(lines)

    except Exception as e:
        raise RuntimeError(f"LLM request failed: {e}")


# ============================================================
# API ENDPOINTS
# ============================================================
@app.get("/")
async def root():
    return {"message": f"NPC Dialogue Generator API running with {LLM_MODEL_NAME}"}


# ============================================================
# JSON FILE UPLOAD (FIXED)
# ============================================================
@app.post("/generate_dialogue_from_file", response_model=DialogueResponse)
async def generate_dialogue_from_file(
    file: UploadFile = File(...),
    dialogue_length: Literal["Short", "Medium", "Long"] = Form(None)
):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON files supported")

    try:
        content = await file.read()
        json_data = json.loads(content.decode("utf-8"))

        context = json_data.get("context")
        characters_data = json_data.get("characters")
        json_length = json_data.get("dialogue_length")

        if dialogue_length is None:  
            dialogue_length = json_length or "Medium"

        characters = [Character(**c) for c in characters_data]

        dialogue_request = DialogueRequest(
            context=context,
            characters=characters,
            dialogue_length=dialogue_length
        )

        prompt = create_prompt(dialogue_request.dict())

        length_config = {
            "Short":  {"max_tokens": 1500, "target_lines": 20},
            "Medium": {"max_tokens": 3000, "target_lines": 30},
            "Long":   {"max_tokens": 4500, "target_lines": 40}
        }
        config = length_config[dialogue_length]

        dialogue = get_llm_response(prompt, config["max_tokens"], config["target_lines"])

        return DialogueResponse(
            generated_dialogue=dialogue,
            model_used=LLM_MODEL_NAME,
            timestamp=datetime.datetime.utcnow().isoformat() + "Z"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# DIRECT JSON POST ENDPOINT
# ============================================================
@app.post("/generate_dialogue", response_model=DialogueResponse)
async def generate_dialogue(request: Request):
    try:
        data = await request.json()
        dialogue_request = DialogueRequest(**data)

        prompt = create_prompt(dialogue_request.dict())

        length_map = {
            "Short":  {"max_tokens": 1500, "target_lines": 20},
            "Medium": {"max_tokens": 3000, "target_lines": 30},
            "Long":   {"max_tokens": 4500, "target_lines": 40}
        }
        config = length_map[dialogue_request.dialogue_length]

        dialogue = get_llm_response(prompt, config["max_tokens"], config["target_lines"])

        return DialogueResponse(
            generated_dialogue=dialogue,
            model_used=LLM_MODEL_NAME,
            timestamp=datetime.datetime.utcnow().isoformat() + "Z"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
