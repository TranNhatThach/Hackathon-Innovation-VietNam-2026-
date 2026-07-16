import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Project root path
ROOT_DIR = Path(__file__).parent.parent

# FPT AI Factory Configuration
FPT_API_KEY = os.getenv("FPT_AI_FACTORY_API_KEY", "")
FPT_BASE_URL = os.getenv("FPT_AI_FACTORY_BASE_URL", "https://api.fpt.ai/v1")
FPT_MODEL = os.getenv("FPT_AI_FACTORY_MODEL", "gpt-4o-mini")

# Gemini Fallback Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Prompts Directory
PROMPTS_DIR = ROOT_DIR / "prompts"

def load_prompt(filename: str) -> str:
    path = PROMPTS_DIR / filename
    if not path.exists():
        return f"Prompt {filename} not found."
    with open(path, "r", encoding="utf-8") as f:
        return f.read()
