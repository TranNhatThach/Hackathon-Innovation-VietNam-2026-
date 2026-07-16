import json
import httpx
from typing import List, Dict, Any, Generator
from agent.config import FPT_API_KEY, FPT_BASE_URL, FPT_MODEL

class FPTAIFactoryClient:
    """
    Client for FPT AI Factory.
    Designed to work with OpenAI-compatible chat endpoints.
    """
    def __init__(self, api_key: str = FPT_API_KEY, base_url: str = FPT_BASE_URL, model: str = FPT_MODEL):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, headers=self.headers, json=payload)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            return f"Error communicating with FPT AI Factory: {str(e)}"

    def chat_completion_stream(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> Generator[str, None, None]:
        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": True
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                with client.stream("POST", url, headers=self.headers, json=payload) as response:
                    response.raise_for_status()
                    for line in response.iter_lines():
                        if not line:
                            continue
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data_str)
                                content = chunk["choices"][0].get("delta", {}).get("content", "")
                                if content:
                                    yield content
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            yield f"Error in stream connection: {str(e)}"
