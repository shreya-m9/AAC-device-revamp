from fastapi import FastAPI, File, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import shutil, os

app = FastAPI()

RECORDINGS_DIR = "recordings"
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# ── Upload a recording from the browser ──
@app.post("/upload-voice")
async def upload_voice(word: str = Form(...), audio: UploadFile = File(...)):
    with open(f"{RECORDINGS_DIR}/{word}.webm", "wb") as f:
        shutil.copyfileobj(audio.file, f)
    return {"status": "saved"}

# ── Serve a recording ──
@app.get("/recordings/{word}")
async def get_recording(word: str):
    path = f"{RECORDINGS_DIR}/{word}.webm"
    if os.path.exists(path):
        return FileResponse(path, media_type="audio/webm")
    return {"error": "not found"}

# ── Check if a recording exists ──
@app.get("/has-recording/{word}")
async def has_recording(word: str):
    exists = os.path.exists(f"{RECORDINGS_DIR}/{word}.webm")
    return {"exists": exists}

# ── Serve frontend ──
app.mount("/", StaticFiles(directory="../", html=True), name="static")