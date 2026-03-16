# SocraticStudy 📚🧠

**SocraticStudy** is an intelligent, AI-powered study companion designed to help students, researchers, and lifelong learners master their course material faster. By leveraging advanced LLMs with massive context windows, SocraticStudy can ingest full textbooks, YouTube videos, and lectures to generate study summaries, explain complex concepts, synthesize audio, create quizzes, and answer custom doubts.

---

## 🌟 Key Features

### 📄 Smart Document & Media Processing
- **PDF Uploads:** Extract text natively from PDF textbooks and notes.
- **YouTube Integration:** Paste a YouTube URL to automatically download audio, transcribe it, and process the video content.
- **Local Media Support:** Upload local audio and video files (`.mp4`, `.mp3`, `.wav`) for automatic transcription and summarization.

### 📝 Advanced Summarization
- **Multiple Formats:** Choose between Paragraphs, Bullet Points, Mind-Map Outlines, or Flashcard summaries.
- **Explain Like I'm 5 (ELI5):** Toggle ELI5 mode to break down complex academic jargon into simple, digestible concepts.
- **Page-by-Page Breakdown:** For PDFs, summaries are generated and cached page-by-page so you can study sequentially.

### 💬 Interactive Doubt Solver (Q&A)
- A dedicated chat interface allows you to ask targeted questions about your study material. 
- By leveraging the immense context window of modern AI models (like Gemini 2.0 Flash), the **entire text** of your document/video is sent to the AI for highly accurate, hallucination-free reasoning based directly on the source material.

### 🎯 Active Recall & Testing
- **AI Quiz Generation:** Automatically generate multiple-choice quizzes based on the uploaded document or video transcript to test your knowledge.
- **AI Flashcards:** Generate interactive 3D flashcards for active recall and spaced repetition study sessions.

### 🎧 Text-To-Speech (TTS) & Presentation Mode
- **Listen Anywhere:** Converts generated text summaries into listenable MP3 audio streams on the fly.
- **Fullscreen Autoplay:** Enter fullscreen mode to turn your PDF pages into a presentation. The app will automatically read the summary for the current page and advance to the next page when finished.

### ⚡ Efficient AI Processing (Rate-Limit Safe)
- Re-engineered to handle massive context. Instead of hitting strict Free Tier rate limits with small page-by-page calls for Q&A, SocraticStudy compiles the entire document and requests sweeping, comprehensive logic—saving AI quotas while maintaining high performance.

---

## 🏗 Architecture & Tech Stack

SocraticStudy is built as a decoupled Client/API architecture for maximum scalability and responsiveness.

### **Frontend**
- **Framework:** React 19 + Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS with modern, aesthetic UI components (Glassmorphism, smooth animations)
- **PDF Handling:** `pdfjs-dist` (Extracts text natively in the browser)

### **Backend**
- **Framework:** FastAPI (Python)
- **Language:** Python 3.x
- **AI Integration:** OpenRouter API (`httpx` for async REST calls)
- **Model Used:** `google/gemini-2.0-flash-001` (Via OpenRouter) - Chosen for its 1,000,000+ token context window, perfect for digesting full PDF textbooks.
- **Media Processing:** `yt-dlp` (YouTube downloads), `ffmpeg` (Audio extraction), `google-genai` (Audio transcription)
- **Audio Synthesis:** `gTTS` (Google Text-to-Speech)
- **Server:** `uvicorn` (ASGI Server)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Python](https://www.python.org/) (v3.10+)
- [FFmpeg](https://ffmpeg.org/) (Required for media processing)
- An API Key from [OpenRouter](https://openrouter.ai/)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/) (For audio transcription)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/SocraticStudy.git
   cd SocraticStudy
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   
   # Activate virtual environment
   # Windows:
   .\venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Backend Configuration**
   Create a `.env` file inside the `backend/` directory:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   FRONTEND_ORIGIN=http://localhost:5173
   ```

4. **Frontend Setup**
   Open a new terminal at the project root:
   ```bash
   npm install
   ```

5. **Run the Application Locally**
   
   Start the Backend Server:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```
   
   Start the Frontend Dev Server:
   ```bash
   npm run dev
   ```

   The application will be accessible at `http://localhost:5173`.

---

## 📂 File Structure

```text
SocraticStudy/
├── backend/                  # FastAPI Application
│   ├── main.py               # Core API logic, routing, processing
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment Variables 
│   ├── uploads/              # Transient media dump directory
│   └── media/                # Cached TTS .mp3 audio assets
├── components/               # React Frontend Components
│   ├── PdfUploader.tsx       # Drag-and-drop file upload UI
│   ├── PdfViewer.tsx         # Document rendering
│   ├── SummaryPanel.tsx      # Main summary & TTS interface
│   ├── DoubtPanel.tsx        # Interactive Q&A chat
│   ├── Quiz.tsx              # Multiple-choice quiz UI
│   └── Flashcard.tsx         # 3D interactive flashcards
├── services/                 # API client services
│   ├── backendClient.ts      # Fetches answers & summaries from FastAPI
│   └── langchainService.ts   # Local vector orchestration
├── App.tsx                   # Main frontend interface & Hero Page
├── index.html                # HTML entry point & Tailwind config
├── vite.config.ts            # Vite build configuration
└── README.md                 # Project Documentation
```

## 📝 License
This project is licensed under the MIT License.