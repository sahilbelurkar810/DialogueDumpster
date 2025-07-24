from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal, Dict, Any
import datetime
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import os

# --- Model Loading ---
MODEL_NAME = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"

print(f"Loading model '{MODEL_NAME}' to CPU (or trying GPU if available)...")
try:
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=torch.float16,
        low_cpu_mem_usage=True,
    )
    if model.device.type != "cuda":
        model.to("cpu")
        print("Model loaded to CPU.")
    else:
        print(f"Model loaded to GPU: {{(torch.cuda.get_device_name(0))}}")
        if torch.cuda.is_available():
            allocated_bytes = torch.cuda.memory_allocated()
            cached_bytes = torch.cuda.memory_reserved()
            print(f"Allocated GPU Memory: {{(allocated_bytes / (1024**3)):.2f}} GB")
            print(f"Cached GPU Memory: {{(cached_bytes / (1024**3)):.2f}} GB")

except Exception as e:
    print(
        f"Failed to load model to GPU or with 8-bit: {e}. Loading to CPU without quantization."
    )
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME, torch_dtype=torch.float32, low_cpu_mem_usage=True
    )
    model.to("cpu")
    print("Model loaded to CPU.")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

print("Model and Tokenizer loaded successfully.")

# --- FastAPI Setup ---
app = FastAPI()

# CORS Middleware (important for frontend communication)
origins = [
    "http://localhost:3000",  # Your React app's default port
    # Add other frontend origins here if needed (e.g., your deployment URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"],  # Allows all headers from the frontend
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


# --- Prompt Engineering Function ---
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
    return {"message": "NPC Dialogue Generator API is running!"}


# Dialogue Generation Endpoint (now UNPROTECTED for testing)
@app.post("/generate_dialogue", response_model=DialogueResponse)
async def generate_dialogue(request: DialogueRequest):
    print("Generating dialogue (unprotected access)...")

    try:
        prompt = create_prompt(request)

        inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}

        # ADJUSTED max_new_tokens for better length
        if request.dialogue_length == "Short":
            max_new_tokens = 120
        elif request.dialogue_length == "Medium":
            max_new_tokens = 240
        else:  # Long
            max_new_tokens = 400

        with torch.no_grad():
            output = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                num_return_sequences=1,
                do_sample=True,
                temperature=0.75,  # Slightly increased for creativity/less abruptness
                top_p=0.9,
                top_k=50,
                pad_token_id=tokenizer.eos_token_id,
                # eos_token_id=tokenizer.eos_token_id,
            )

        generated_text = tokenizer.decode(output[0], skip_special_tokens=False)

        generated_dialogue_cleaned = ""
        assistant_marker = "<|assistant|>"

        if assistant_marker in generated_text:
            start_index = generated_text.rfind(assistant_marker) + len(assistant_marker)
            generated_dialogue_raw = generated_text[start_index:].strip()

            generated_dialogue_cleaned = (
                generated_dialogue_raw.replace("</s>", "")
                .replace("<|endoftext|>", "")
                .strip()
            )

            if generated_dialogue_cleaned.startswith("Dialogue:"):
                generated_dialogue_cleaned = generated_dialogue_cleaned.replace(
                    "Dialogue:", ""
                ).strip()

            # Post-processing to attempt natural ending
            if generated_dialogue_cleaned:
                last_char = generated_dialogue_cleaned[-1]
                if last_char not in [".", "?", "!", ":", ";"]:
                    last_punc_index = max(
                        generated_dialogue_cleaned.rfind("."),
                        generated_dialogue_cleaned.rfind("?"),
                        generated_dialogue_cleaned.rfind("!"),
                    )
                    if (
                        last_punc_index != -1
                        and last_punc_index > len(generated_dialogue_cleaned) - 25
                    ):  # Check within last 25 chars
                        generated_dialogue_cleaned = generated_dialogue_cleaned[
                            : last_punc_index + 1
                        ]
                    else:
                        generated_dialogue_cleaned += "..."

        else:
            print(
                "Warning: Assistant marker '<|assistant|>' not found. Attempting basic cleanup."
            )
            # Fallback if marker not found - try to remove initial prompt part
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
            model_used=MODEL_NAME,
            timestamp=timestamp,
        )

    except Exception as e:
        print(f"Error during dialogue generation: {e}")
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Dialogue generation failed: {str(e)}"
        )
