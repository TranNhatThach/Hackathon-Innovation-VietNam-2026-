from typing import List, Callable, Dict, Any
from agent.fpt_client import FPTAIFactoryClient
from agent.config import load_prompt

class Tool:
    """
    ADK-style tool wrapper.
    """
    def __init__(self, name: str, func: Callable, description: str):
        self.name = name
        self.func = func
        self.description = description

    def run(self, *args, **kwargs) -> Any:
        return self.func(*args, **kwargs)

class ADKAgent:
    """
    ADK 2.0 Agent representation.
    Manages system instructions, loaded tools, and the LLM runtime.
    """
    def __init__(self, name: str, system_prompt_file: str, tools: List[Tool] = None):
        self.name = name
        self.system_instruction = load_prompt(system_prompt_file)
        self.tools = tools or []
        self.client = FPTAIFactoryClient()
        self.tool_map = {tool.name: tool for tool in self.tools}

    def register_tool(self, tool: Tool):
        self.tool_map[tool.name] = tool
        self.tools.append(tool)

    def execute(self, user_query: str, history: List[Dict[str, str]] = None) -> str:
        messages = [
            {"role": "system", "content": self.system_instruction}
        ]
        if history:
            messages.extend(history)
            
        messages.append({"role": "user", "content": user_query})
        
        # Simple agent cycle (supporting direct completion or tool orchestration stub)
        response_text = self.client.chat_completion(messages)
        return response_text

    def execute_stream(self, user_query: str, history: List[Dict[str, str]] = None):
        messages = [
            {"role": "system", "content": self.system_instruction}
        ]
        if history:
            messages.extend(history)
            
        messages.append({"role": "user", "content": user_query})
        return self.client.chat_completion_stream(messages)

# Example Instantiation of standard agents
def create_default_agent() -> ADKAgent:
    # Set up system agent using system.md
    return ADKAgent(name="GeneralAgent", system_prompt_file="system.md")
