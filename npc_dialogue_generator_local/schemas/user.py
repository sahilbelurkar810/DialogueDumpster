from pydantic import BaseModel, EmailStr, Field
from typing import Union, Optional
from bson import ObjectId





class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        # The 'handler' argument is passed by Pydantic V2.
        # We need to accept it but we don't necessarily have to use it.
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string", format="ObjectId")


class UserModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str
    email: EmailStr
    hashed_password: str
    api_token: Optional[str] = None 

    class Config:
        # 'orm_mode' has been renamed to 'from_attributes' in V2
        from_attributes = True
        json_encoders = {ObjectId: str}
        # The 'arbitrary_types_allowed' config is not needed in V2 for this case


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3)
    email: EmailStr
    password: str = Field(..., min_length=6)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Union[str, None] = None
