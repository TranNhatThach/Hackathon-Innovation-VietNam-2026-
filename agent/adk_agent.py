import json
from datetime import date
from typing import Any, Callable, Dict, List

import httpx
from pydantic import BaseModel, Field

from agent.config import FPT_API_KEY, FPT_BASE_URL, FPT_MODEL, load_prompt
from agent.fpt_client import FPTAIFactoryClient


class Tool:
    """ADK-style tool wrapper."""

    def __init__(self, name: str, func: Callable, description: str) -> None:
        self.name = name
        self.func = func
        self.description = description

    def run(self, *args: Any, **kwargs: Any) -> Any:
        return self.func(*args, **kwargs)


class ADKAgent:
    """
    ADK 2.0 Agent representation.
    Manages system instructions, loaded tools, and the LLM runtime.
    """

    def __init__(
        self,
        name: str,
        system_prompt_file: str,
        tools: List[Tool] | None = None,
    ) -> None:
        self.name = name
        self.system_instruction = load_prompt(system_prompt_file)
        self.tools = tools or []
        self.client = FPTAIFactoryClient()
        self.tool_map = {tool.name: tool for tool in self.tools}

    def register_tool(self, tool: Tool) -> None:
        self.tool_map[tool.name] = tool
        self.tools.append(tool)

    def execute(
        self,
        user_query: str,
        history: List[Dict[str, str]] | None = None,
    ) -> str:
        messages = [{"role": "system", "content": self.system_instruction}]
        if history:
            messages.extend(history)

        messages.append({"role": "user", "content": user_query})
        return self.client.chat_completion(messages)

    def execute_stream(
        self,
        user_query: str,
        history: List[Dict[str, str]] | None = None,
    ):
        messages = [{"role": "system", "content": self.system_instruction}]
        if history:
            messages.extend(history)

        messages.append({"role": "user", "content": user_query})
        return self.client.chat_completion_stream(messages)


class AgentDecision(BaseModel):
    answer: str = Field(min_length=1)
    confidence_score: float = Field(ge=0.0, le=1.0)


class GovernedContext(BaseModel):
    title: str
    owner: str
    approval_status: str
    effective_date: date
    review_date: date
    version: str
    version_history: list[dict[str, Any]]
    content: str
    score: float


class HospitalConciergeAgent(ADKAgent):
    """
    ADK 2.0 governed RAG agent for Hanoi Heart Hospital.
    Uses FPT AI Factory (OpenAI-compatible) with zero-hallucination guardrails.
    """

    def __init__(
        self,
        *,
        api_key: str = FPT_API_KEY,
        base_url: str = FPT_BASE_URL,
        chat_model: str = FPT_MODEL,
        embedding_model: str = "text-embedding-3-small",
    ) -> None:
        super().__init__(
            name="HospitalConciergeAgent",
            system_prompt_file="hospital_concierge.md",
        )
        self._chat_model = chat_model
        self._embedding_model = embedding_model
        self._base_url = base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._async_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
        )

    async def embed(self, text: str) -> list[float]:
        response = await self._async_client.post(
            f"{self._base_url}/embeddings",
            headers=self._headers,
            json={
                "model": self._embedding_model,
                "input": text,
            },
        )
        response.raise_for_status()

        vector = response.json()["data"][0]["embedding"]
        if not isinstance(vector, list) or not vector:
            raise ValueError("FPT AI Factory returned an invalid embedding vector.")

        return [float(value) for value in vector]

    async def generate_grounded_answer(
        self,
        *,
        user_message: str,
        contexts: list[GovernedContext],
    ) -> AgentDecision:
        official_context = "\n\n".join(
            (
                f"[title={context.title}; owner={context.owner}; "
                f"approval_status={context.approval_status}; "
                f"effective_date={context.effective_date.isoformat()}; "
                f"review_date={context.review_date.isoformat()}; "
                f"version={context.version}; score={context.score:.3f}]\n"
                f"{context.content}"
            )
            for context in contexts
        )

        response = await self._async_client.post(
            f"{self._base_url}/chat/completions",
            headers=self._headers,
            json={
                "model": self._chat_model,
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": self.system_instruction},
                    {
                        "role": "user",
                        "content": (
                            f"OFFICIAL_CONTEXT:\n{official_context}\n\n"
                            f"USER_MESSAGE:\n{user_message}"
                        ),
                    },
                ],
            },
        )
        response.raise_for_status()

        raw_content = response.json()["choices"][0]["message"]["content"]
        if not isinstance(raw_content, str):
            raise ValueError("FPT AI Factory returned a non-text completion.")

        normalized_content = raw_content.strip()
        if normalized_content.startswith("```"):
            normalized_content = normalized_content.removeprefix("```json")
            normalized_content = normalized_content.removeprefix("```").strip()
            if normalized_content.endswith("```"):
                normalized_content = normalized_content[:-3].strip()

        decision = AgentDecision.model_validate(json.loads(normalized_content))
        if not decision.answer.strip():
            raise ValueError("FPT AI Factory returned an empty answer.")

        return decision

    async def aclose(self) -> None:
        await self._async_client.aclose()


def create_default_agent() -> ADKAgent:
    return ADKAgent(name="GeneralAgent", system_prompt_file="system.md")


def create_hospital_concierge_agent(**kwargs: Any) -> HospitalConciergeAgent:
    return HospitalConciergeAgent(**kwargs)
