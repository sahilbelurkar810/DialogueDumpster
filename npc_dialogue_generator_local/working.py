# main.py
import datetime
import json
import os
import re
from typing import List, Literal, Dict, Any, Union
from routers import auth
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

# --- Load Environment Variables ---
load_dotenv()

# --- App setup ---
app = FastAPI(title="NPC Dialogue Generator (no-auth)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Dialogue Generation-Related Models & Logic ---
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


# --- LLM Connection & Configuration ---
MODEL_NAME = os.getenv("MODEL_NAME", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")
LLM_MODEL_NAME = os.getenv("LLM_MODEL_DESC", "TinyLlama-1.1B (local)")

app.include_router(auth.router, tags=["Authentication"], prefix="/auth")

print(f"Loading model '{MODEL_NAME}' to CPU...")
try:
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME, torch_dtype=torch.float32, low_cpu_mem_usage=True
    )
    model.to("cpu")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"
    print("Model and tokenizer loaded successfully to CPU.")
except Exception as e:
    print(f"Failed to load the model: {e}")
    raise RuntimeError(
        "Failed to load the TinyLlama model. Please check your internet connection, local files, and Hugging Face access."
    )


def create_prompt(data: Dict[str, Any]) -> str:
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


def get_llm_response(prompt: str, num_predict: int) -> str:
    """Generates a response from the locally loaded TinyLlama model."""
    inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
    inputs = {k: v.to("cpu") for k, v in inputs.items()}

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=num_predict,
            num_return_sequences=1,
            do_sample=True,
            temperature=0.75,
            top_p=0.9,
            top_k=50,
            pad_token_id=tokenizer.eos_token_id,
        )

    generated_text = tokenizer.decode(output[0], skip_special_tokens=False)

    generated_dialogue_cleaned = generated_text.strip()
    assistant_marker = "<|assistant|>"
    if assistant_marker in generated_dialogue_cleaned:
        start_index = generated_dialogue_cleaned.rfind(assistant_marker) + len(
            assistant_marker
        )
        generated_dialogue_cleaned = generated_dialogue_cleaned[start_index:].strip()

    # Remove parenthetical action directions and stray system/user tokens
    generated_dialogue_cleaned = re.sub(
        r"\s*\([^()]*\)", "", generated_dialogue_cleaned
    ).strip()
    generated_dialogue_cleaned = re.sub(
        r"(<\|system\|>|</s>|<\|user\|>|<\|assistant\|>|Dialogue:)",
        "",
        generated_dialogue_cleaned,
        flags=re.IGNORECASE,
    ).strip()

    # Ensure sensible truncation/ellipsis handling
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
        "message": f"NPC Dialogue Generator API is running with {LLM_MODEL_NAME} (no auth)!"
    }


@app.post(
    "/generate_dialogue",
    response_model=DialogueResponse,
    status_code=status.HTTP_200_OK,
)
async def generate_dialogue(request: Request):
    """
    Public endpoint (no authentication) to generate NPC dialogue.
    Expects JSON: { "context": "...", "characters": [...], "dialogue_length": "Short|Medium|Long" }
    """
    print(">> Returning dialogue response")
    
    try:
        data = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # If it matches the Pydantic schema (has context and characters), use that.
    if "context" in data and "characters" in data:
        try:
            dialogue_request = DialogueRequest(**data)
            prompt = create_prompt(dialogue_request.dict())
            if dialogue_request.dialogue_length == "Short":
                llm_num_predict = 100
            elif dialogue_request.dialogue_length == "Medium":
                llm_num_predict = 300
            else:
                llm_num_predict = 600
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid input schema: {e}")
    else:
        # Fallback: try to build a prompt directly from whatever was sent
        try:
            llm_num_predict = 400
            prompt = create_prompt(data)
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid input for prompt creation: {e}"
            )

    try:
        full_response_content = get_llm_response(prompt, llm_num_predict)
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z"
        return DialogueResponse(
            generated_dialogue=full_response_content,
            model_used=LLM_MODEL_NAME,
            timestamp=timestamp,
        )
    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Dialogue generation failed: {str(e)}"
        )
    print(">> DONE ")



