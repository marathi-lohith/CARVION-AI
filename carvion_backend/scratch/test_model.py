import os
import environ
import sys

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from common.gemini_client import get_gemini_client

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

client = get_gemini_client()

models_to_test = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-3.5-flash"]

for m in models_to_test:
    try:
        print(f"Testing model {m}:")
        response = client.models.generate_content(
            model=m,
            contents="Say hello in one word."
        )
        print(f"  Success! Response: {response.text.strip()}")
    except Exception as e:
        print(f"  Failed for model {m}: {str(e)}")
