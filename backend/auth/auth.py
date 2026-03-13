# backend/auth/auth.py
import bcrypt
import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")

#Passwod
def hash_password(plain: str) -> str:
    """Hashes a plain text password using bcrypt."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    """Verifies a plain text password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())

# JWT
def generate_token(user_id: str) -> str:
    """Generates a JWT token for a user, expires in 24 hours."""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(token: str) -> dict | None:
    """Verifies a JWT token. Returns payload if valid, None if expired/invalid."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None