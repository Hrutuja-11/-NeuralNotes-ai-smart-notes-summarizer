import os
import hashlib
import uuid
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.concurrency import run_in_threadpool

from pydantic import BaseModel

import asyncio
from dotenv import load_dotenv

import httpx

load_dotenv()

# Environment variables
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

def _ensure_dirs():
    os.makedirs("backend/uploads", exist_ok=True)
    os.makedirs("backend/media", exist_ok=True)

app = FastAPI(title="SocraticStudy Backend", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://socraticstudy.vercel.app",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ensure_dirs()
app.mount("/media", StaticFiles(directory="backend/media"), name="media")

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

class UploadResponse(BaseModel):
    num_pages: int
    pages: List[str]
    metadata: Dict[str, Any] = {}

class SummarizeRequest(BaseModel):
    page_number: int
    text: str
    format: Optional[str] = "paragraph"

class SummarizeYouTubeRequest(BaseModel):
    url: str

class TTSRequest(BaseModel):
    summary: str

class DoubtRequest(BaseModel):
    question: str
    context: str

class QuizRequest(BaseModel):
    text: str

class FlashcardRequest(BaseModel):
    text: str

# In-memory caches
SUMMARY_CACHE: Dict[str, Any] = {}

def _hash_key(prefix: str, *parts: str) -> str:
    h = hashlib.sha256()
    for p in parts:
        h.update(p.encode("utf-8"))
    return f"{prefix}:{h.hexdigest()}"

@app.post("/upload_pdf", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    path = os.path.join("backend/uploads", f"{uuid.uuid4()}_{file.filename}")
    try:
        with open(path, "wb") as f:
            f.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")

    try:
        import pdfplumber
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"pdfplumber not installed: {e}")

    pages_text: List[str] = []
    meta: Dict[str, Any] = {}
    try:
        with pdfplumber.open(path) as pdf:
            meta = pdf.metadata or {}
            for page in pdf.pages:
                txt = page.extract_text() or ""
                pages_text.append(txt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read PDF: {e}")

    return UploadResponse(num_pages=len(pages_text), pages=pages_text, metadata=meta)

async def _openrouter_chat(system_prompt: str, user_prompt: str, model: str = "google/gemini-2.0-flash-001") -> str:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": FRONTEND_ORIGIN,
        "X-Title": "SocraticStudy"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as ac:
            res = await ac.post(f"{OPENROUTER_BASE}/chat/completions", headers=headers, json=payload)
            
            if res.status_code == 429:
                raise HTTPException(status_code=429, detail="AI Rate limit reached via OpenRouter. Please wait a moment.")
            
            res.raise_for_status()
            data = res.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        error_info = e.response.text
        raise HTTPException(status_code=e.response.status_code, detail=f"OpenRouter API error: {error_info}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with OpenRouter: {e}")

@app.post("/summarize")
async def summarize(req: SummarizeRequest):
    key = _hash_key("sum", str(req.page_number), req.format, req.text)
    if key in SUMMARY_CACHE:
        return {"summary": SUMMARY_CACHE[key], "format": req.format, "cached": True}

    if req.format == "bullets":
        system = "You are an expert academic assistant."
        user = (
            "Summarize the following text as concise bullet points, one idea per bullet.\n\n"
            + req.text
        )
    elif req.format == "mindmap":
        system = "You are an expert academic assistant."
        user = (
            "Organize the following text into a hierarchical mind map outline with main topics and subtopics.\n\n"
            + req.text
        )
    elif req.format == "flashcards":
        system = "You are an expert academic assistant."
        user = (
            "Extract key terms and definitions from the following text as a list of flashcard pairs. "
            "You MUST return ONLY valid JSON formatted exactly as: `{\"flashcards\": [{\"term\": \"...\", \"definition\": \"...\"}]}`\n\n"
            + req.text
        )
    else:
        system = "You are an expert academic assistant."
        user = (
            "Write a clear paragraph summary of the following text, focusing on key ideas, formulas, and definitions suitable for revision.\n\n"
            + req.text
        )
    
    summary = await _openrouter_chat(system, user)
    
    if req.format == "flashcards":
        import json
        cleaned = summary.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        try:
            parsed = json.loads(cleaned)
            summary_out = parsed.get("flashcards", [])
        except json.JSONDecodeError:
            summary_out = []
    else:
        summary_out = summary

    SUMMARY_CACHE[key] = summary_out
    return {"summary": summary_out, "format": req.format, "cached": False}

@app.post("/summarize-youtube")
async def summarize_youtube(req: SummarizeYouTubeRequest):
    try:
        from transcriber import download_youtube_audio, transcribe_audio, get_youtube_transcript
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcriber module error: {e}")
        
    try:
        # 1. Attempt instant transcription via YouTube API
        try:
            transcript = await run_in_threadpool(get_youtube_transcript, req.url)
            print("Successfully extracted instant YouTube transcript!")
        except Exception as transcript_err:
            print(f"Transcript API failed: {transcript_err}. Falling back to downloading and transcribing audio...")
            # 2. Download audio on a background thread
            audio_path = await run_in_threadpool(download_youtube_audio, req.url)
            # 3. Transcribe on a background thread
            transcript = await run_in_threadpool(transcribe_audio, audio_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process YouTube video: {e}")
        
    # 3. Summarize using existing OpenRouter logic
    system = "You are an expert academic assistant."
    user = (
        "Summarize this lecture transcript clearly and concisely, focusing on key ideas, concepts, and definitions suitable for revision. "
        "Use bullet points where appropriate.\n\n"
        + transcript
    )
    
    summary = await _openrouter_chat(system, user)
    return {"summary": summary, "transcript": transcript}

@app.post("/summarize-video-file")
async def summarize_video_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.mp4', '.mp3', '.wav', '.m4a', '.weba')):
        raise HTTPException(status_code=400, detail="Unsupported audio/video format.")
        
    try:
        from transcriber import transcribe_audio, TEMP_DIR
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcriber module error: {e}")
        
    path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_{file.filename}")
    try:
        with open(path, "wb") as f:
            f.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")
        
    try:
        # Transcribe directly on a background thread
        transcript = await run_in_threadpool(transcribe_audio, path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to transcribe media file: {e}")
        
    # Summarize transcript
    system = "You are an expert academic assistant."
    user = (
        "Summarize this lecture transcript clearly and concisely, focusing on key ideas, concepts, and definitions suitable for revision. "
        "Use bullet points where appropriate.\n\n"
        + transcript
    )
    
    summary = await _openrouter_chat(system, user)
    return {"summary": summary, "transcript": transcript}

@app.post("/tts")
async def tts(req: TTSRequest):
    try:
        from gtts import gTTS
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"gTTS not installed: {e}")

    if not req.summary.strip():
        raise HTTPException(status_code=400, detail="Summary is empty")
    filename = f"tts_{uuid.uuid4()}.mp3"
    filepath = os.path.join("backend/media", filename)
    try:
        tts = gTTS(text=req.summary)
        tts.save(filepath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")

    return {"url": f"/media/{filename}"}

@app.post("/doubt")
async def doubt(req: DoubtRequest):
    system = (
        "You are an expert academic tutor. You are helping a student understand their study material. "
        "Use the provided context (which is the full text of the student's PDF) to answer their question accurately. "
        "If the answer is found in the text, explain it clearly. If the question requires reasoning based on the text, provide that reasoning. "
        "If the context is truly insufficient to answer, explain why and ask for more details."
    )
    user = (
        f"STUDY MATERIAL (FULL CONTEXT):\n{req.context}\n\n"
        f"STUDENT QUESTION:\n{req.question}\n\n"
        "Please provide a helpful, educational response."
    )
    
    answer = await _openrouter_chat(system, user)
    return {"answer": answer}

@app.post("/generate-quiz")
async def generate_quiz(req: QuizRequest):
    system = (
        "You are an expert educational AI. Your task is to generate a multiple-choice quiz based on the provided text. "
        "You MUST return ONLY valid JSON. Do not include any markdown formatting, headers, or conversational text. "
        "The JSON structure must match this EXACT format:\n"
        '{"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A"}]}'
    )
    user = f"Generate a 5-question quiz for the following text:\n\n{req.text}"
    
    response_text = await _openrouter_chat(system, user)
    
    # Strip markdown code fences if Gemini added them
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
        
    import json
    try:
        data = json.loads(response_text.strip())
        return data
    except json.JSONDecodeError:
        print(f"Failed to parse JSON: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to parse quiz JSON from AI model.")

@app.post("/generate-flashcards")
async def generate_flashcards(req: FlashcardRequest):
    system = (
        "You are an expert educational AI. Your task is to extract key terms and concepts from the provided text and format them as flashcards. "
        "You MUST return ONLY valid JSON. Do not include any markdown formatting, headers, or conversational text. "
        "The JSON structure must match this EXACT format:\n"
        '{"flashcards": [{"term": "...", "definition": "..."}]}'
    )
    user = f"Extract 5-10 key terms and definitions as flashcards from the following text:\n\n{req.text}"
    
    response_text = await _openrouter_chat(system, user)
    
    # Strip markdown code fences if Gemini added them
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
        
    import json
    try:
        data = json.loads(response_text.strip())
        return data
    except json.JSONDecodeError:
        print(f"Failed to parse JSON: {response_text}")
        raise HTTPException(status_code=500, detail="Failed to parse flashcard JSON from AI model.")


@app.get("/")
async def root():
    return {"status": "ok", "message": "SocraticStudy API with OpenRouter is running"}

@app.get("/health")
async def health():
    return {"status": "ok"}