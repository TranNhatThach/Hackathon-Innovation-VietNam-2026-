from typing import List, Callable, Dict, Any
import logging
from agent.core.fpt_client import FPTAIFactoryClient
from agent.core.config import load_prompt
from agent.rag.rag_pipeline import retrieve_context
from agent.core.guardrails import check_emergency

logger = logging.getLogger(__name__)


FALLBACK_RESPONSE = (
    "Xin lỗi, tôi không tìm thấy thông tin chính thức về yêu cầu của bạn trong cơ sở dữ liệu của Bệnh viện Tim Hà Nội. "
    "Vui lòng liên hệ Hotline Bệnh viện: **19001082** (phục vụ 24/7) hoặc email: **cskh@timhanoi.vn** để được hỗ trợ trực tiếp."
)

def is_greeting_query(query: str) -> bool:
    """
    Checks if a user query is a simple greeting or general politeness.
    Greetings do not require RAG document retrieval.
    """
    greetings = [
        "chào", "chao", "hello", "hi", "tạm biệt", "tam biet", "cảm ơn", "cam on", "thank", 
        "bắt đầu", "bat dau", "bác sĩ ơi", "bac si oi", "xin chào", "xin chao", "chào bạn", "chao ban"
    ]
    q = query.strip().lower()
    words = q.split()
    if len(words) <= 5:
        for g in greetings:
            if g in q:
                return True
    return False

import json

class Tool:
    """
    ADK-style tool wrapper.
    """
    def __init__(self, name: str, func: Callable, description: str, parameters: Dict[str, Any] = None):
        self.name = name
        self.func = func
        self.description = description
        self.parameters = parameters or {}

    def run(self, *args, **kwargs) -> Any:
        return self.func(*args, **kwargs)

    def to_openai_schema(self) -> Dict[str, Any]:
        """
        Generates OpenAI compatible function calling schema.
        """
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }

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

    def _prepare_messages(self, user_query: str, history: List[Dict[str, str]] = None) -> tuple:
        """
        Prepares message history and the augmented system prompt with RAG context.
        Returns a tuple of (messages_list, has_docs_or_is_greeting)
        """
        # 1. Determine if RAG retrieval is required
        if is_greeting_query(user_query):
            # General greeting, bypass RAG to avoid hotline fallback
            system_prompt = self.system_instruction
            has_context = True
        # Check if query is looking for booking/appointment actions (so it bypasses RAG fallback check)
        elif any(kw in user_query.lower() for kw in [
            "đặt lịch", "dat lich", "hẹn khám", "hen kham",
            "lịch bác sĩ", "lich bac si", "lịch khám", "lich kham",
            "bác sĩ nào", "bac si nao", "tìm bác sĩ", "tim bac si",
            "danh sách bác sĩ", "ds bac si", "chuyên khoa", "chuyen khoa",
            "khung giờ trống", "khung gio trong", "còn trống", "con trong",
        ]):
            # Booking/scheduling/doctor-search queries will use Tools
            system_prompt = (
                f"{self.system_instruction}\n\n"
                "## HƯỚNG DẪN SỬ DỤNG CÔNG CỤ (TOOLS):\n"
                "Bạn có quyền truy cập các công cụ hỗ trợ tra cứu, đăng ký đặt lịch khám và tìm kiếm bác sĩ.\n"
                "- Dùng `search_doctors` khi người dùng hỏi về danh sách bác sĩ, chuyên khoa, hoặc muốn tìm bác sĩ phù hợp.\n"
                "- Dùng `get_doctor_schedule` khi người dùng hỏi về lịch trống của một bác sĩ vào một ngày cụ thể.\n"
                "- Dùng `book_appointment` khi người dùng muốn xác nhận đặt lịch (đã có tên bác sĩ, ngày, giờ, tên bệnh nhân và SĐT).\n"
                "TUYỆT ĐỐI không từ chối hoặc báo không tìm thấy thông tin trước khi đã gọi công cụ phù hợp.\n"
                "Nếu thiếu thông tin để gọi công cụ, hãy hỏi người dùng từng bước."
            )
            has_context = True
        else:
            # Informational query, fetch context from Qdrant (threshold = 0.35)
            docs = retrieve_context(user_query, limit=3, threshold=0.35)
            
            if docs:
                # ✅ FOUND RELEVANT DOCUMENTS - Use strict RAG mode
                # Construct context-aware prompt
                context_items = []
                for doc in docs:
                    context_items.append(f"--- NGUỒN: {doc['title']} ---\n{doc['text']}")
                context_str = "\n\n".join(context_items)
                
                system_prompt = (
                    f"{self.system_instruction}\n\n"
                    "## THÔNG TIN NGỮ CẢNH HỖ TRỢ (RAG):\n"
                    "Bạn PHẢI trả lời câu hỏi dựa TRÊN VÀ CHỈ TRÊN các thông tin ngữ cảnh chính thức dưới đây. \n"
                    "Khi trả lời, bạn PHẢI trích dẫn rõ nguồn từ phần nào của tài liệu (ví dụ: 'Theo phần [Quy định về Bảo hiểm Y tế (BHYT)]...' hoặc 'Theo bảng giá dịch vụ [Bảng giá Dịch vụ Khám bệnh thông dụng]...').\n"
                    "Tuyệt đối không tự suy diễn hoặc bịa đặt thông tin y khoa, giá dịch vụ hay lịch khám nằm ngoài ngữ cảnh.\n\n"
                    f"{context_str}"
                )
            else:
                # ❌ NO RELEVANT DOCUMENTS - Use flexible mode (general knowledge + guardrails)
                system_prompt = (
                    f"{self.system_instruction}\n\n"
                    "## LƯU Ý KỸ THUẬT (RẤT QUAN TRỌNG):\n"
                    "Không tìm thấy thông tin cụ thể về yêu cầu này trong cơ sở dữ liệu của Bệnh viện Tim Hà Nội.\n"
                    "Bạn PHẢI tuân thủ các quy tắc sau:\n"
                    "1. TUYỆT ĐỐI không tự tiện bịa đặt hay suy diễn bất kỳ địa chỉ, số điện thoại, email hoặc hotline giả nào (ví dụ: các hotline 1900 6165, 024 3834 8888, hoặc địa chỉ tại Nguyễn Đình Hoàn).\n"
                    "2. Nếu cần cung cấp thông tin liên hệ hoặc địa chỉ, chỉ sử dụng thông tin chính thức đã có trong System Prompt:\n"
                    "   - Cơ sở 1: 92 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội.\n"
                    "   - Cơ sở 2: Số 695 Lạc Long Quân, Tây Hồ, Hà Nội.\n"
                    "   - Hotline hỗ trợ 24/7: 19001082.\n"
                    "   - Email: cskh@timhanoi.vn.\n"
                    "3. Không được bịa đặt thông tin y khoa, giá dịch vụ hay lịch khám cụ thể nằm ngoài tri thức chính thức.\n"
                )
            
            has_context = True

        messages = [
            {"role": "system", "content": system_prompt}
        ]
        if history:
            messages.extend(history)
            
        messages.append({"role": "user", "content": user_query})
        return messages, has_context

    def _check_and_get_cache(self, user_query: str, history: List[Dict[str, str]] = None) -> str | None:
        if history:
            return None
        if is_greeting_query(user_query):
            return None
        if any(kw in user_query.lower() for kw in [
            "đặt lịch", "dat lich", "hẹn khám", "hen kham",
            "lịch bác sĩ", "lich bac si", "lịch khám", "lich kham",
            "bác sĩ nào", "bac si nao", "tìm bác sĩ", "tim bac si",
            "danh sách bác sĩ", "ds bac si", "chuyên khoa", "chuyen khoa",
            "khung giờ trống", "khung gio trong", "còn trống", "con trong",
        ]):
            return None
        
        try:
            from agent.core.redis_client import redis_cache
            cache_key = redis_cache.get_cache_key(user_query)
            cached_val = redis_cache.get(cache_key)
            if cached_val:
                logger.info(f"Redis Cache HIT for query: {user_query.encode('ascii', errors='ignore').decode('ascii')}")
                return cached_val
        except Exception as e:
            logger.warning(f"Error checking cache: {e}")
        return None

    def _set_cache(self, user_query: str, response: str, history: List[Dict[str, str]] = None):
        if history or not response:
            return
        if is_greeting_query(user_query):
            return
        if any(kw in user_query.lower() for kw in [
            "đặt lịch", "dat lich", "hẹn khám", "hen kham",
            "lịch bác sĩ", "lich bac si", "lịch khám", "lich kham",
            "bác sĩ nào", "bac si nao", "tìm bác sĩ", "tim bac si",
            "danh sách bác sĩ", "ds bac si", "chuyên khoa", "chuyen khoa",
            "khung giờ trống", "khung gio trong", "còn trống", "con trong",
        ]):
            return
        
        try:
            from agent.core.redis_client import redis_cache
            cache_key = redis_cache.get_cache_key(user_query)
            redis_cache.set(cache_key, response, ex=900)  # 15 minutes TTL
            logger.info(f"Cached response in Redis for query: {user_query.encode('ascii', errors='ignore').decode('ascii')}")
        except Exception as e:
            logger.warning(f"Error saving to cache: {e}")

    def execute(self, user_query: str, history: List[Dict[str, str]] = None) -> str:
        # Check Cache
        cached_response = self._check_and_get_cache(user_query, history)
        if cached_response:
            return cached_response

        # Check emergency guardrail
        emergency_warning = check_emergency(user_query)
        if emergency_warning:
            return emergency_warning

        messages, has_context = self._prepare_messages(user_query, history)
        if not has_context:
            return FALLBACK_RESPONSE
            
        # Tool execution loop
        for _ in range(5):
            tools_schema = [t.to_openai_schema() for t in self.tools if hasattr(t, "to_openai_schema")]
            message = self.client.chat_completion(messages, tools=tools_schema if tools_schema else None)
            tool_calls = message.get("tool_calls")
            if not tool_calls:
                res_content = message.get("content", "")
                if res_content:
                    self._set_cache(user_query, res_content, history)
                return res_content
            
            messages.append(message)
            for tool_call in tool_calls:
                func_name = tool_call["function"]["name"]
                func_args = json.loads(tool_call["function"]["arguments"])
                tool_call_id = tool_call.get("id")
                
                if func_name in self.tool_map:
                    try:
                        result = self.tool_map[func_name].run(**func_args)
                    except Exception as e:
                        result = f"Error executing tool {func_name}: {str(e)}"
                else:
                    result = f"Tool {func_name} not found."
                
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "name": func_name,
                    "content": result
                })
        
        return "Xin lỗi, đã xảy ra lỗi vòng lặp xử lý cuộc gọi công cụ quá giới hạn."

    def execute_stream(self, user_query: str, history: List[Dict[str, str]] = None):
        # Check Cache
        cached_response = self._check_and_get_cache(user_query, history)
        if cached_response:
            def cached_generator():
                yield cached_response
            return cached_generator()

        # Check emergency guardrail
        emergency_warning = check_emergency(user_query)
        if emergency_warning:
            def emergency_generator():
                yield emergency_warning
            return emergency_generator()

        messages, has_context = self._prepare_messages(user_query, history)
        if not has_context:
            def fallback_generator():
                yield FALLBACK_RESPONSE
            return fallback_generator()
            
        # Tool execution loop (non-streaming until tool calls resolve)
        for _ in range(5):
            tools_schema = [t.to_openai_schema() for t in self.tools if hasattr(t, "to_openai_schema")]
            message = self.client.chat_completion(messages, tools=tools_schema if tools_schema else None)
            tool_calls = message.get("tool_calls")
            if not tool_calls:
                # No more tool calls — stream the final answer.
                # IMPORTANT: append the last assistant message first so the LLM has full context
                messages.append(message)
                
                def caching_stream_generator():
                    full_response = []
                    try:
                        for chunk in self.client.chat_completion_stream(messages):
                            full_response.append(chunk)
                            yield chunk
                    finally:
                        compiled = "".join(full_response)
                        if compiled:
                            self._set_cache(user_query, compiled, history)

                return caching_stream_generator()

            # Append assistant message with tool_calls before processing them
            messages.append(message)
            for tool_call in tool_calls:
                func_name = tool_call["function"]["name"]
                try:
                    func_args = json.loads(tool_call["function"]["arguments"])
                except json.JSONDecodeError:
                    func_args = {}
                tool_call_id = tool_call.get("id")

                if func_name in self.tool_map:
                    try:
                        result = self.tool_map[func_name].run(**func_args)
                    except Exception as e:
                        result = f"Error executing tool {func_name}: {str(e)}"
                else:
                    result = f"Tool {func_name} not found."

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "name": func_name,
                    "content": result
                })

        def loop_exceeded_generator():
            yield "Xin lỗi, đã xảy ra lỗi vòng lặp xử lý công cụ quá giới hạn."
        return loop_exceeded_generator()



# Example Instantiation of standard agents
def create_default_agent(system_prompt_file: str = "system.md") -> ADKAgent:
    agent = ADKAgent(name="GeneralAgent", system_prompt_file=system_prompt_file)

    # Import tool functions from agent.tools.tools
    from agent.tools.tools import get_doctor_schedule, book_appointment, search_doctors, escalate_to_human

    # Tool 1: Search doctors by specialty or name
    search_tool = Tool(
        name="search_doctors",
        func=search_doctors,
        description=(
            "Tìm kiếm bác sĩ tại Bệnh viện Tim Hà Nội theo chuyên khoa hoặc tên. "
            "Dùng khi bệnh nhân hỏi 'bác sĩ nào chuyên về X?', 'danh sách bác sĩ', 'tìm bác sĩ tim mạch Nhi', v.v."
        ),
        parameters={
            "type": "object",
            "properties": {
                "specialty": {
                    "type": "string",
                    "description": "Từ khóa chuyên khoa cần tìm (ví dụ: 'rối loạn nhịp', 'tim mạch nhi', 'can thiệp', 'phẫu thuật'). Để trống nếu không lọc theo chuyên khoa."
                },
                "name": {
                    "type": "string",
                    "description": "Tên bác sĩ cần tìm (ví dụ: 'Lan', 'Hùng'). Để trống nếu không lọc theo tên."
                }
            },
            "required": []
        }
    )
    agent.register_tool(search_tool)

    # Tool 2: Get doctor schedule for a specific date
    schedule_tool = Tool(
        name="get_doctor_schedule",
        func=get_doctor_schedule,
        description=(
            "Tra cứu các khung giờ làm việc còn trống của bác sĩ tại Bệnh viện Tim Hà Nội "
            "dựa trên tên bác sĩ và ngày khám. Dùng khi bệnh nhân hỏi lịch khám của bác sĩ cụ thể."
        ),
        parameters={
            "type": "object",
            "properties": {
                "doctor_name": {
                    "type": "string",
                    "description": "Tên bác sĩ cần tra cứu (ví dụ: 'BS Hùng', 'Trần Thị Lan', 'Lê Minh Tuấn')"
                },
                "date": {
                    "type": "string",
                    "description": "Ngày cần tra cứu lịch khám (định dạng YYYY-MM-DD, ví dụ: 2026-07-18)"
                }
            },
            "required": ["doctor_name", "date"]
        }
    )
    agent.register_tool(schedule_tool)

    # Tool 3: Book an appointment
    booking_tool = Tool(
        name="book_appointment",
        func=book_appointment,
        description=(
            "Đăng ký đặt lịch hẹn khám bệnh chính thức cho bệnh nhân tại Bệnh viện Tim Hà Nội. "
            "Chỉ gọi tool này khi đã có đủ: tên bệnh nhân, số điện thoại, tên bác sĩ, ngày và khung giờ cụ thể."
        ),
        parameters={
            "type": "object",
            "properties": {
                "patient_name": {
                    "type": "string",
                    "description": "Họ và tên đầy đủ của bệnh nhân khám bệnh"
                },
                "phone": {
                    "type": "string",
                    "description": "Số điện thoại liên hệ của bệnh nhân (10-11 chữ số)"
                },
                "doctor_name": {
                    "type": "string",
                    "description": "Tên bác sĩ khám bệnh (ví dụ: 'Nguyễn Văn Hùng', 'BS Lan')"
                },
                "date": {
                    "type": "string",
                    "description": "Ngày khám bệnh (định dạng YYYY-MM-DD, ví dụ: 2026-07-18)"
                },
                "time_slot": {
                    "type": "string",
                    "description": "Khung giờ khám bệnh đã chọn (ví dụ: '08:30 - 09:00')"
                }
            },
            "required": ["patient_name", "phone", "doctor_name", "date", "time_slot"]
        }
    )
    agent.register_tool(booking_tool)

    # Tool 4: Escalate to human operator
    escalate_tool = Tool(
        name="escalate_to_human",
        func=escalate_to_human,
        description=(
            "Chuyển giao cuộc hội thoại của bệnh nhân cho nhân viên hỗ trợ y tế thực tế khi bệnh nhân yêu cầu gặp người thật, "
            "hỏi thông tin nằm ngoài cơ sở dữ liệu RAG, tỏ ra giận dữ, hoặc cần giải quyết khiếu nại."
        ),
        parameters={
            "type": "object",
            "properties": {
                "patient_phone": {
                    "type": "string",
                    "description": "Số điện thoại liên hệ của bệnh nhân (10-11 chữ số) để nhân viên liên hệ lại hoặc tra cứu"
                },
                "reason": {
                    "type": "string",
                    "description": "Lý do chuyển tiếp hỗ trợ (ví dụ: 'Hỏi về bảo hiểm xã hội trái tuyến', 'Yêu cầu gặp người thật')"
                },
                "urgent": {
                    "type": "boolean",
                    "description": "Trạng thái khẩn cấp (chuyển sang True nếu tình huống cần giải quyết gấp)"
                }
            },
            "required": ["patient_phone", "reason"]
        }
    )
    agent.register_tool(escalate_tool)

    return agent
