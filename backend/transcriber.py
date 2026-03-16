import os
import uuid
import subprocess
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
import subprocess
import yt_dlp
import imageio_ffmpeg

# Ensure ffmpeg is found in PATH by yt-dlp and faster-whisper without requiring a system restart
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
os.environ["PATH"] += os.pathsep + os.path.dirname(ffmpeg_exe)

from faster_whisper import WhisperModel

# Ensure temp directory exists for downloads
TEMP_DIR = "backend/media/temp"
os.makedirs(TEMP_DIR, exist_ok=True)

# Initialize the model once. Using "tiny" as suggested for speed on CPU, but it can be changed to "base" or "small".
# compute_type="int8" is good for CPU inference.
print("Loading Whisper Model...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")

def download_youtube_audio(url: str) -> str:
    """Downloads audio from a YouTube URL and returns the local file path."""
    file_id = str(uuid.uuid4())
    out_tmpl = os.path.join(TEMP_DIR, f"{file_id}.%(ext)s")
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'ffmpeg_location': imageio_ffmpeg.get_ffmpeg_exe(),
        'outtmpl': out_tmpl,
        'quiet': True,
        'no_warnings': True
    }
    
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
    
    # yt-dlp might append .mp3 due to the postprocessor
    expected_path = os.path.join(TEMP_DIR, f"{file_id}.mp3")
    if not os.path.exists(expected_path):
        # Fallback in case of weird formats
        for f in os.listdir(TEMP_DIR):
            if f.startswith(file_id):
                return os.path.join(TEMP_DIR, f)
        raise FileNotFoundError("Audio file was not generated.")
        
    return expected_path

def transcribe_audio(file_path: str) -> str:
    """Uses Faster-Whisper to transcribe an audio/video file."""
    print(f"Transcribing {file_path}...")
    segments, info = model.transcribe(file_path, beam_size=5)
    
    transcription = []
    for segment in segments:
        transcription.append(segment.text)
        
    full_text = " ".join(transcription).strip()
    return full_text

def extract_video_id(url: str) -> str:
    """Extracts the YouTube video ID from various URL formats."""
    parsed = urlparse(url)
    if parsed.hostname == 'youtu.be':
        return parsed.path[1:]
    if parsed.hostname in ('www.youtube.com', 'youtube.com'):
        if parsed.path == '/watch':
            return parse_qs(parsed.query)['v'][0]
        if parsed.path.startswith('/embed/'):
            return parsed.path.split('/')[2]
        if parsed.path.startswith('/v/'):
            return parsed.path.split('/')[2]
    raise ValueError("Could not extract video ID from URL")

def get_youtube_transcript(url: str) -> str:
    """Fetches the transcript instantly using YouTube's hidden caption API."""
    video_id = extract_video_id(url)
    transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
    return " ".join([t['text'] for t in transcript_list])

