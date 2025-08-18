# main.py
import datetime
import json
import os
import re
import requests
from typing import List, Literal, Dict, Any, Union
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from routers import auth


# --- Pydantic Models for API Requests/Responses ---
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


load_dotenv()
# --- LLM Connection & Configuration ---
COLAB_LLM_API_URL = os.getenv("COLAB_LLM_API_URL")
COLAB_LLM_MODEL_NAME = "Zephyr-7B-Beta (via Colab)"

if not COLAB_LLM_API_URL:
    raise HTTPException(status_code=500, detail="COLAB_LLM_API_URL is not set in .env")
MONGODB_URL = os.getenv("MONGODB_URL")
SECRET_KEY = os.getenv("SECRET_KEY")

# --- FastAPI App Initialization & CORS ---
app = FastAPI(title="NPC Dialogue API")

origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(auth.router, tags=["Authentication"], prefix="/auth")


# --- LLM Prompt & API Functions ---
def create_prompt(data: Dict[str, Any]) -> str:
    # (Your existing create_prompt function)
    context = data.get("context", "")
    dialogue_length_str = data.get("dialogue_length", "Medium")
    characters_str = ""
    for char in data.get("characters", []):
        characters_str += (
            f"- Name: {char.get('name', '')}, Personality: {char.get('personality', '')}, "
            f"Occupation: {char.get('occupation', '')}, Relationship: {char.get('relationship', '')}\n"
        )
    characters_str = characters_str.strip()

    prompt_template = (
        "<|system|>\n"
        "You are an AI assistant specialized in generating dialogue for video game NPCs. "
        "Your task is to create a dialogue based on the provided context, character details, and their relationships. "
        "Ensure the dialogue is consistent with the characters' personalities, occupations, "
        "and relationships and directly reflects the given context.\n"
        "**IMPORTANT: The output must be pure conversation, without any action descriptions, stage directions, or text in parentheses. Only provide character names and their spoken lines.**\n"
        "</s>\n"
        "<|user|>\n"
        f"Context: {context}\n\n"
        f"Characters:\n{characters_str}\n\n"
        f"Dialogue Length: {dialogue_length_str}\n\n"
        "Dialogue:\n"
        "</s>\n"
        "<|assistant|>"
    )
    return prompt_template


def get_colab_response(prompt: str, num_predict: int) -> str:
    """Sends a request to the Colab LLM API and processes the response."""
    colab_payload = {
        "prompt": prompt,
        "max_new_tokens": num_predict,
        "temperature": 0.8,
        "top_p": 0.9,
        "top_k": 50,
    }
    response = requests.post(COLAB_LLM_API_URL, json=colab_payload, timeout=180)
    response.raise_for_status()
    colab_result = response.json()
    # Check if 'generated_text' exists, if not, return an empty string
    generated_text = colab_result.get("generated_text", "")

    # Post-processing from Colab LLM's raw output
    generated_dialogue_cleaned = generated_text.strip()
    assistant_marker = "<|assistant|>"
    if assistant_marker in generated_dialogue_cleaned:
        start_index = generated_dialogue_cleaned.rfind(assistant_marker) + len(
            assistant_marker
        )
        generated_dialogue_cleaned = generated_dialogue_cleaned[start_index:].strip()

    generated_dialogue_cleaned = re.sub(
        r"\s*\([^()]*\)", "", generated_dialogue_cleaned
    ).strip()
    generated_dialogue_cleaned = re.sub(
        r"(<|system|>|<|user|>|<|assistant|>|Dialogue:)",
        "",
        generated_dialogue_cleaned,
        flags=re.IGNORECASE,
    ).strip()

    if generated_dialogue_cleaned:
        last_char = generated_dialogue_cleaned[-1]
        if last_char not in [".", "?", "!", "…"]:
            last_punc_index = max(
                generated_dialogue_cleaned.rfind("."),
                generated_dialogue_cleaned.rfind("?"),
                generated_dialogue_cleaned.rfind("!"),
            )
            if (
                last_punc_index != -1
                and (len(generated_dialogue_cleaned) - (last_punc_index + 1)) < 25
            ):
                generated_dialogue_cleaned = generated_dialogue_cleaned[
                    : last_punc_index + 1
                ]
            else:
                generated_dialogue_cleaned += "..."

    return generated_dialogue_cleaned


# --- API Endpoints ---
@app.get("/")
async def root():
    return {
        "message": f"NPC Dialogue Generator API is running with {COLAB_LLM_MODEL_NAME}!"
    }


@app.post("/generate_dialogue", response_model=DialogueResponse)
async def generate_dialogue(request: Request):
    try:
        data = await request.json()
    except json.JSONDecodeError:
        data = {}

    if "context" in data and "characters" in data:
        try:
            dialogue_request = DialogueRequest(**data)
            prompt = create_prompt(dialogue_request.dict())
            if dialogue_request.dialogue_length == "Short":
                llm_num_predict = 150
            elif dialogue_request.dialogue_length == "Medium":
                llm_num_predict = 300
            else:
                llm_num_predict = 600
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid form-based input: {e}"
            )
    else:
        try:
            llm_num_predict = 400
            prompt = create_prompt(data)
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid JSON schema input: {e}"
            )

    try:
        full_response_content = get_colab_response(prompt, llm_num_predict)

        # Post-processing from Colab LLM's raw output
        generated_dialogue_cleaned = full_response_content.strip()
        assistant_marker = "<|assistant|>"
        if assistant_marker in generated_dialogue_cleaned:
            start_index = generated_dialogue_cleaned.rfind(assistant_marker) + len(
                assistant_marker
            )
            generated_dialogue_cleaned = generated_dialogue_cleaned[
                start_index:
            ].strip()

        generated_dialogue_cleaned = re.sub(
            r"\s*\([^()]*\)", "", generated_dialogue_cleaned
        ).strip()
        generated_dialogue_cleaned = re.sub(
            r"(<|system|>|<|user|>|<|assistant|>|Dialogue:)",
            "",
            generated_dialogue_cleaned,
            flags=re.IGNORECASE,
        ).strip()

        if generated_dialogue_cleaned:
            last_char = generated_dialogue_cleaned[-1]
            if last_char not in [".", "?", "!", "…"]:
                last_punc_index = max(
                    generated_dialogue_cleaned.rfind("."),
                    generated_dialogue_cleaned.rfind("?"),
                    generated_dialogue_cleaned.rfind("!"),
                )
                if (
                    last_punc_index != -1
                    and (len(generated_dialogue_cleaned) - (last_punc_index + 1)) < 25
                ):
                    generated_dialogue_cleaned = generated_dialogue_cleaned[
                        : last_punc_index + 1
                    ]
                else:
                    generated_dialogue_cleaned += "..."

        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        return DialogueResponse(
            generated_dialogue=generated_dialogue_cleaned,
            model_used=COLAB_LLM_MODEL_NAME,
            timestamp=timestamp,
        )

    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to LLM server: {str(e)}. Is your Colab notebook running and Ngrok tunnel active?",
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Dialogue generation failed: {str(e)}"
        )
