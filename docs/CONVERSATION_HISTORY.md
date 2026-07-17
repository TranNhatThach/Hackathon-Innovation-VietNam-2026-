# Conversation History Feature

This document describes the **Conversation History** implementation, which enables persistent storage of chat conversations in PostgreSQL.

## Overview

The conversation history feature stores all user messages and assistant responses in a PostgreSQL database, allowing:
- ✅ Persistent chat history across sessions
- ✅ Multi-turn conversation tracking
- ✅ User conversation management
- ✅ Conversation retrieval and deletion

## Architecture

### Database Schema

#### `conversations` Table
Represents a conversation session between a user and the agent.

```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,          -- User identifier
    session_id VARCHAR(255) NOT NULL,       -- Unique session identifier
    title VARCHAR(500),                     -- Optional conversation title
    created_at TIMESTAMP DEFAULT NOW(),     -- Creation timestamp
    updated_at TIMESTAMP DEFAULT NOW()      -- Last update timestamp
);
CREATE INDEX idx_user_session ON conversations(user_id, session_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
```

#### `messages` Table
Stores individual messages within a conversation.

```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,       -- Foreign key to conversations
    role VARCHAR(50) NOT NULL,              -- "user" or "assistant"
    content TEXT NOT NULL,                  -- Message content
    created_at TIMESTAMP DEFAULT NOW(),     -- Creation timestamp
    tools_used VARCHAR(500),                -- Comma-separated tool names (optional)
    model VARCHAR(100)                      -- LLM model used (optional)
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
```

## API Endpoints

### 1. POST `/api/chat`
Send a chat message with conversation persistence.

**Request:**
```json
{
  "message": "Tôi muốn đặt lịch khám bệnh",
  "session_id": "abc123def456",           // Optional - generated if not provided
  "user_id": "user@example.com",          // Optional - uses IP if not provided
  "history": [],                          // Optional - loaded from DB if not provided
  "stream": false                         // Optional - enable streaming
}
```

**Response:**
```json
{
  "response": "Xin chào! Tôi có thể giúp bạn...",
  "session_id": "abc123def456",
  "from_db": false
}
```

### 2. GET `/api/chat/history/{session_id}`
Retrieve full conversation history by session ID.

**Response:**
```json
{
  "session_id": "abc123def456",
  "messages": [
    {
      "role": "user",
      "content": "Chào"
    },
    {
      "role": "assistant",
      "content": "Xin chào bạn!"
    }
  ]
}
```

### 3. GET `/api/chat/conversations/{user_id}`
List all conversations for a user.

**Response:**
```json
{
  "user_id": "user@example.com",
  "conversations": [
    {
      "id": 1,
      "session_id": "abc123def456",
      "title": "Chat Session 2026-07-17 10:30:00",
      "created_at": "2026-07-17T10:30:00",
      "updated_at": "2026-07-17T10:35:00",
      "message_count": 5
    }
  ]
}
```

### 4. DELETE `/api/chat/history/{session_id}`
Delete a conversation and all its messages.

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted"
}
```

## Usage Examples

### Python - Using Requests Library

```python
import requests
import uuid

BASE_URL = "http://localhost:8000"
session_id = str(uuid.uuid4())
user_id = "patient_001"

# Send first message
response = requests.post(
    f"{BASE_URL}/api/chat",
    json={
        "message": "Tôi muốn đặt lịch khám bệnh",
        "session_id": session_id,
        "user_id": user_id
    }
)
print(response.json())

# Send follow-up message (history automatically loaded from DB)
response = requests.post(
    f"{BASE_URL}/api/chat",
    json={
        "message": "Tôi muốn khám với bác sĩ Nguyễn Văn Hùng",
        "session_id": session_id,
        "user_id": user_id
    }
)
print(response.json())

# Retrieve conversation history
response = requests.get(f"{BASE_URL}/api/chat/history/{session_id}")
print(response.json())

# List all conversations for user
response = requests.get(f"{BASE_URL}/api/chat/conversations/{user_id}")
print(response.json())
```

### JavaScript - Using Fetch API

```javascript
const BASE_URL = "http://localhost:8000";
const sessionId = crypto.randomUUID();
const userId = "patient_001";

// Send message
const response = await fetch(`${BASE_URL}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Tôi muốn đặt lịch khám bệnh",
    session_id: sessionId,
    user_id: userId
  })
});

const data = await response.json();
console.log("Session ID:", data.session_id);
console.log("Response:", data.response);

// Retrieve history
const historyResponse = await fetch(
  `${BASE_URL}/api/chat/history/${sessionId}`
);
const history = await historyResponse.json();
console.log("History:", history.messages);
```

## Implementation Details

### ConversationService

The `ConversationService` class in `backend/app/services.py` provides:

```python
# Create a new conversation
conversation = ConversationService.create_conversation(
    db, user_id, session_id, title
)

# Get conversation by session ID
conversation = ConversationService.get_conversation_by_session(db, session_id)

# Get conversation history (list of messages)
history = ConversationService.get_conversation_history(db, session_id)

# Add a message to conversation
message = ConversationService.add_message(
    db, session_id, role, content, tools_used, model
)

# List all conversations for a user
conversations = ConversationService.get_user_conversations(db, user_id)

# Delete a conversation
success = ConversationService.delete_conversation(db, session_id)
```

## Setup & Migration

### 1. Initialize Database Tables

```bash
# Run migration script
python scripts/migrate_db.py
```

Or it will automatically create tables on first FastAPI startup.

### 2. Test Conversation History

```bash
# Run test suite
python scripts/test_conversation_history.py
```

Expected output:
```
INFO:root:1. Testing create_conversation...
INFO:root:   ✓ Created conversation 1
INFO:root:2. Testing add_message...
INFO:root:   ✓ Added user message 1
INFO:root:   ✓ Added assistant message 2
...
INFO:root:✓ ALL TESTS PASSED!
```

## Frontend Integration

### Example React Component

```jsx
import { useState, useEffect } from 'react';

export function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize session on mount
  useEffect(() => {
    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
  }, []);

  // Send message
  const handleSendMessage = async (text) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          user_id: 'user@example.com'
        })
      });
      
      const data = await response.json();
      
      // Add messages to state
      setMessages(prev => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: data.response }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      {messages.map((msg, idx) => (
        <div key={idx} className={msg.role}>
          {msg.content}
        </div>
      ))}
    </div>
  );
}
```

## Data Retention Policy

- **Conversations** are stored indefinitely
- **Messages** are preserved with conversation
- **Cleanup** can be done via DELETE endpoint or batch scripts
- **Consider implementing** automated retention policies for compliance

## Performance Considerations

1. **Indexing**: Both tables include indexes on common query fields
2. **Pagination**: History retrieval supports `limit` parameter
3. **Cleanup**: Old conversations should be archived/deleted periodically
4. **Query Optimization**: 
   - Conversation lookup is O(1) via session_id
   - History retrieval uses indexed queries

## Security Considerations

1. **User Isolation**: Always validate `user_id` matches request context
2. **Session Hijacking**: Use secure session tokens (not exposed in URL)
3. **Data Privacy**: Implement encryption for sensitive data at rest
4. **Access Control**: Add authentication middleware to chat endpoints
5. **Audit Logging**: Track who accessed what conversations

## Future Enhancements

- [ ] Implement conversation search (full-text search on messages)
- [ ] Add export/archive functionality
- [ ] Implement batch cleanup scripts
- [ ] Add analytics/metrics dashboard
- [ ] Support conversation sharing between users
- [ ] Implement conversation export (PDF, JSON)
- [ ] Add rate limiting per user/session
- [ ] Implement message editing/deletion

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### Table Not Found

```bash
# Re-run migration
python scripts/migrate_db.py

# Or restart FastAPI (auto-creates on startup)
docker compose restart backend
```

### Missing Messages

- Ensure `session_id` is consistent across requests
- Check database permissions for `INSERT` operations
- Verify connection pooling isn't causing isolation issues

---

**Last Updated**: 2026-07-17  
**Feature Status**: ✅ Complete & Tested
