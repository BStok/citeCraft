import os
import json
import firebase_admin
from firebase_admin import credentials, auth

if not firebase_admin._apps:
    cred_dict = json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT"])
    cred = credentials.Certificate(cred_dict)
    firebase_admin.initialize_app(cred)


def verify_firebase_token(token: str):
    try:
        return auth.verify_id_token(token)
    except Exception:
        return None