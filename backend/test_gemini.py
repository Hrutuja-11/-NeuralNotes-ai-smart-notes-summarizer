import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key: {api_key[:10]}...")

client = genai.Client(api_key=api_key)

try:
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents="Hello, are you there?",
    )
    print("Response successful!")
    print(response.text)
except Exception as e:
    print(f"Error occurred: {e}")
