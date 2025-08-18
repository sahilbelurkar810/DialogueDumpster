# routers/auth.py
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from auth import utils
from schemas.user import UserCreate, Token, UserModel
import os
import secrets

router = APIRouter()
load_dotenv()
# --- Database Connection ---
MONGODB_URL = os.getenv("MONGODB_URL")
MONGODB_DB_NAME = "npc_forge_db"
MONGODB_COLLECTION_NAME = "users"
client = AsyncIOMotorClient(MONGODB_URL, tls=True, tlsAllowInvalidCertificates=True)
database = client[MONGODB_DB_NAME]
users_collection = database[MONGODB_COLLECTION_NAME]


async def get_user(username: str):
    user_doc = await users_collection.find_one({"username": username})
    if user_doc:
        return UserModel(**user_doc)
    return None


async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user or not utils.verify_password(password, user.hashed_password):
        return False
    return user


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    existing_user = await get_user(user_data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    hashed_password = utils.get_password_hash(user_data.password)
    new_user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": hashed_password,
    }
    result = await users_collection.insert_one(new_user_doc)
    return {"message": "User created successfully", "user_id": str(result.inserted_id)}


@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=utils.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = utils.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/generate-api-token")
async def generate_api_token(
    current_user_username: str = Depends(utils.get_current_user_username),
):
    api_token = secrets.token_hex(32)
    # Store the API token in the user's database entry
    await users_collection.update_one(
        {"username": current_user_username}, {"$set": {"api_token": api_token}}
    )
    return {"api_token": api_token}
