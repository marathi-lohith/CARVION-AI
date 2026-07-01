import os
import environ
import sys

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common.gemini_client import get_gemini_client

# Load env
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

api_key = os.environ.get("GEMINI_API_KEY", "")
print("API KEY:", api_key)

try:
    client = get_gemini_client()
    # List models
    print("Listing models:")
    for model in client.models.list():
        print(model.name)
except Exception as e:
    print("Error listing models:", str(e))
