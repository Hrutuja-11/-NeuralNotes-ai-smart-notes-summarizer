import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=api_key)

try:
    print("Searching for 1.5-flash...")
    found = False
    for model in client.models.list():
        if "1.5-flash" in model.name:
            print(f"FOUND: {model.name}")
            found = True
    if not found:
        print("NOT FOUND")
except Exception as e:
    print(f"Error: {e}")
