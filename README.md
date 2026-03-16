# SocraticStudy 📚

SocraticStudy is an intelligent, AI-powered study companion designed to help students master their course material. By uploading your PDF notes or textbooks, SocraticStudy processes the document to generate study summaries, explain complex concepts, synthesize text into audio, and answer custom doubts using advanced LLMs with massive context windows.

---

## 🌟 Key Features

1. **AI Document Summarization**
   Extracts text from uploaded PDFs and generates clear, student-friendly summaries perfect for rapid revision. Supports a standard academic mode as well as an "Explain Like I'm 5" (ELI5) mode for simpler breakdowns.
   
2. **Interactive Doubt Solver**
   A dedicated chat interface allows you to ask targeted questions about your study material. By leveraging the immense context window of modern LLMs, the **entire text** of your document is sent to the AI for highly accurate, hallucination-free reasoning based directly on your professor's notes.
   
3. **Text-To-Speech (TTS) Integration**
   Converts generated text summaries into listenable MP3 audio streams on the fly, allowing you to review your study notes while commuting or multitasking.

4. **Efficient AI Processing (Rate-Limit Safe)**
   Re-engineered to send documents in optimized bulk requests. Instead of hitting strict Free Tier rate limits with page-by-page calls, SocraticStudy compiles the entire document and requests sweeping, comprehensive logic in a single shot—saving AI quotas and API costs while maintaining lightning-fast performance.

---

## 🏗 Architecture & Tech Stack

The application is built completely serverless and stateless for scalability, utilizing a decoupled Client/API architecture.

### **Frontend**
- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** Custom CSS with CSS Variables & modern aesthetics (Glassmorphism, animations)
- **PDF Handling:** `pdfjs-dist` (Extracts text natively in the browser before sending to the backend)
- **Icons:** `lucide-react`

### **Backend**
- **Framework:** FastAPI (Python)
- **Language:** Python 3.x
- **AI Integration:** OpenRouter API (`httpx` for async REST calls)
- **Model Used:** `google/gemini-2.0-flash-001` (Via OpenRouter) - Chosen for its 1,000,000+ token context window, perfect for digesting full PDF textbooks without chunking/RAG limitations.
- **Audio Processing:** `gTTS` (Google Text-to-Speech)
- **Server:** `uvicorn` (ASGI Server)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- An API Key from [OpenRouter](https://openrouter.ai/)

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
   
   pip install -r requirements.txt
   ```

3. **Backend Configuration**
   Create a `.env` file inside the `backend/` directory:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   FRONTEND_ORIGIN=http://localhost:3000
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

   The application will be accessible at `http://localhost:3000`.

---

## 📂 File Structure

```text
SocraticStudy/
├── backend/                  # FastAPI Application
│   ├── main.py               # Core API logic, OpenRouter endpoints & TTS routes
│   ├── requirements.txt      # Python dependencies
│   ├── .env                  # Environment Variables 
│   ├── uploads/              # Transient PDF dump directory
│   └── media/                # Cached TTS .mp3 audio assets
├── src/                      # React Frontend Source Code
│   ├── components/           # Reusable UI components
│   ├── services/             # API client services
│   │   ├── backendClient.ts  # Fetches answers & summaries from FastAPI
│   │   └── langchainService.ts # Local PDF context orchestrator
│   ├── App.tsx               # Main frontend interface logic
│   ├── index.css             # Global dark-mode aesthetic styling
│   └── main.tsx              # React DOM entry point
├── package.json              # NPM scripts and dependencies
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Project Documentation
```

## 📝 License
This project is licensed under the MIT License.