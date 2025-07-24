from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal, Dict, Any
import datetime
import requests # <--- ADD THIS for making HTTP requests
import json
import os # Just in case, though not strictly needed for this version
import re

# --- IMPORTANT: Configure the URL of your Colab LLM server ---
# You must copy this from the output of your Colab notebook after running it!
COLAB_LLM_API_URL = (
    "https://c6191a264962.ngrok-free.app/generate"  # <--- PASTE YOUR COPIED URL HERE
)
# Example: "https://abcdef12345.ngrok-free.app/generate"

# --- FastAPI Setup ---
app = FastAPI()

# CORS Middleware (important for frontend communication)
origins = [
    "http://localhost:3000", # Your React app's default port
    # Add other frontend origins here if needed (e.g., your deployment URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"], # Allows all headers from the frontend
)

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

# --- Prompt Engineering Function (Same as before) ---
def create_prompt(request: DialogueRequest) -> str:
    """
    Constructs the prompt for the LLM based on the request data.
    """
    context = request.context
    dialogue_length_str = request.dialogue_length

    characters_str = ""
    for char in request.characters:
        characters_str += (
            f"- Name: {char.name}, Personality: {char.personality}, "
            f"Occupation: {char.occupation}, Relationship: {char.relationship}\n"
        )
    characters_str = characters_str.strip()

    prompt_template = (
        "<|system|>\n"
        "You are an AI assistant specialized in generating dialogue for video game NPCs. "
        "Your task is to create a dialogue based on the provided context, character details, and their relationships. "
        "Ensure the dialogue is consistent with the characters' personalities, occupations, "
        "and relationships and directly reflects the given context.\n"
        "Adhere to the requested dialogue length:\n"
        "- 'Short': 2-5 exchanges (lines from characters).\n"
        "- 'Medium': 6-10 exchanges.\n"
        "- 'Long': 11-20+ exchanges.\n"
        "Present the dialogue with each character's name followed by a colon and their line, "
        "e.g., 'CharacterName: Their dialogue line.'\n"
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

# --- API Endpoints ---

# Test Root Endpoint
@app.get("/")
async def root():
    return {"message": "NPC Dialogue Generator API is running locally, forwarding to Colab LLM!"}


# Dialogue Generation Endpoint (now calls the Colab LLM)
@app.post("/generate_dialogue", response_model=DialogueResponse)
async def generate_dialogue(request: DialogueRequest):
    print("Local FastAPI: Forwarding request to Colab LLM server...")

    try:
        prompt = create_prompt(request)

        # Map desired length to Colab LLM's max_new_tokens
        # --- Increase max_new_tokens AGGRESSIVELY ---
        if request.dialogue_length == "Short":
            llm_max_new_tokens = 150  # From 120
        elif request.dialogue_length == "Medium":
            llm_max_new_tokens = 300  # From 250
        else:  # Long
            llm_max_new_tokens = 600  # From 400 (This is a lot of tokens, should prevent simple cut-offs)

        # Data to send to the Colab LLM
        colab_payload = {
            "prompt": prompt,
            "max_new_tokens": llm_max_new_tokens,
            "temperature": 0.8,  # Keep this, can experiment between 0.7 and 0.9
            "top_p": 0.9,
            "top_k": 50,
        }

        # Make request to the Colab LLM server
        # Ensure timeout is sufficiently long for LLM generation
        response = requests.post(
            COLAB_LLM_API_URL, json=colab_payload, timeout=180
        )  # Increased timeout to 3 minutes
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)

        colab_result = response.json()
        generated_text = colab_result.get("generated_text", "")

        generated_dialogue_cleaned = ""
        assistant_marker = "<|assistant|>"

        if assistant_marker in generated_text:
            start_index = generated_text.rfind(assistant_marker) + len(assistant_marker)
            generated_dialogue_raw = generated_text[start_index:].strip()

            # Clean up special tokens
            generated_dialogue_cleaned = (
                generated_dialogue_raw.replace("</s>", "")
                .replace("<|endoftext|>", "")
                .strip()
            )

            # If the model sometimes includes the "Dialogue:" header again, remove it
            if generated_dialogue_cleaned.startswith("Dialogue:"):
                generated_dialogue_cleaned = generated_dialogue_cleaned.replace(
                    "Dialogue:", ""
                ).strip()

            # --- NEW/IMPROVED: Post-processing to remove action parts ---
            # Regex to find and remove text within parentheses, including the parentheses themselves.
            # This pattern handles nesting up to a certain degree, and also ensures surrounding whitespace is cleaned.
            # It's important to do this *before* the natural ending check.
            generated_dialogue_cleaned = re.sub(
                r"\s*\([^()]*\)", "", generated_dialogue_cleaned
            ).strip()
            # If there could be nested parentheses, a more complex regex or iterative removal might be needed:
            # while '(' in generated_dialogue_cleaned and ')' in generated_dialogue_cleaned:
            #    generated_dialogue_cleaned = re.sub(r'\([^()]*\)', '', generated_dialogue_cleaned)
            # generated_dialogue_cleaned = generated_dialogue_cleaned.strip()

            # --- NEW/IMPROVED: Post-processing to attempt natural ending ---
            if generated_dialogue_cleaned:
                last_char = generated_dialogue_cleaned[-1]
                # Check for common sentence endings (period, question, exclamation, ellipsis)
                if last_char not in [".", "?", "!", "…"]:  # Added ellipsis
                    # Find the last significant punctuation. Prioritize sentence-ending ones.
                    last_full_stop_index = max(
                        generated_dialogue_cleaned.rfind("."),
                        generated_dialogue_cleaned.rfind("?"),
                        generated_dialogue_cleaned.rfind("!"),
                    )

                    # If a full stop is found and it's not too far back (e.g., within last 50 characters)
                    if (
                        last_full_stop_index != -1
                        and (
                            len(generated_dialogue_cleaned) - (last_full_stop_index + 1)
                        )
                        < 50
                    ):
                        generated_dialogue_cleaned = generated_dialogue_cleaned[
                            : last_full_stop_index + 1
                        ]
                    else:
                        # If no natural full stop, or it's too far back, add an ellipsis
                        generated_dialogue_cleaned += "..."

        else:
            print(
                "Warning: Assistant marker '<|assistant|>' not found in Colab LLM output. Attempting basic cleanup."
            )
            prompt_end_marker_len = len(prompt)
            if len(generated_text) > prompt_end_marker_len:
                generated_dialogue_cleaned = generated_text[
                    prompt_end_marker_len:
                ].strip()
            else:
                generated_dialogue_cleaned = generated_text.strip()
            generated_dialogue_cleaned = (
                generated_dialogue_cleaned.replace("</s>", "")
                .replace("<|endoftext|>", "")
                .strip()
            )

        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"

        return DialogueResponse(
            generated_dialogue=generated_dialogue_cleaned,
            model_used="Zephyr-7B-Beta (via Colab)",
            timestamp=timestamp,
        )

    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Colab LLM server: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to LLM server: {str(e)}. Is your Colab notebook running and Ngrok tunnel active?",
        )
    except Exception as e:
        print(f"Error during dialogue generation: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Dialogue generation failed: {str(e)}"
        )
