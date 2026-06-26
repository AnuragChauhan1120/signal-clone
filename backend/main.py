import json
from typing import Dict, List
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, database
import os
from dotenv import load_dotenv

load_dotenv(override=True)
raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://127.0.0.1:3002",
)
origins = [origin.strip().rstrip("/") for origin in raw_origins.split(",") if origin.strip()]

app = FastAPI(title="Signal Clone Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=database.engine)

# In-memory manager tracking active WebSocket connections per User ID
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(json.dumps(message))

manager = ConnectionManager()

# --- Auto Seed Sample Data ---
@app.on_event("startup")
def seed_data():
    db = database.SessionLocal()
    if db.query(models.User).count() == 0:
        # Create mock users
        alice = models.User(id="user_alice", phone_number="+123456789", display_name="Alice (You)", avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=Alice")
        bob = models.User(id="user_bob", phone_number="+987654321", display_name="Bob Smith", avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=Bob")
        charlie = models.User(id="user_charlie", phone_number="+555555555", display_name="Charlie Crew", avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=Charlie")
        db.add_all([alice, bob, charlie])
        
        # Create a 1-on-1 and a group chat
        c1 = models.Conversation(id="conv_direct", name=None, is_group=False)
        c2 = models.Conversation(id="conv_group", name="Project Launch Group", is_group=True)
        db.add_all([c1, c2])
        
        # Assign members
        db.add_all([
            models.ConversationMember(conversation_id="conv_direct", user_id="user_alice"),
            models.ConversationMember(conversation_id="conv_direct", user_id="user_bob"),
            models.ConversationMember(conversation_id="conv_group", user_id="user_alice"),
            models.ConversationMember(conversation_id="conv_group", user_id="user_bob"),
            models.ConversationMember(conversation_id="conv_group", user_id="user_charlie")
        ])
        
        # Add initial messages
        db.add(models.Message(id="m1", conversation_id="conv_direct", sender_id="user_bob", text="Hey Alice! Did you check out the new design workflow?", status="read"))
        db.commit()
    db.close()

# --- API Endpoints ---
@app.post("/api/auth/login")
def mock_login(payload: dict, db: Session = Depends(database.get_db)):
    phone = payload.get("phone_number")
    user = db.query(models.User).filter(models.User.phone_number == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not registered. Use seeded numbers: +123456789 or +987654321")
    return {"id": user.id, "display_name": user.display_name, "phone_number": user.phone_number, "avatar_url": user.avatar_url}

@app.get("/api/conversations/{user_id}")
def get_conversations(user_id: str, db: Session = Depends(database.get_db)):
    # Pull conversations where the target user is a member
    member_convs = db.query(models.ConversationMember.conversation_id).filter(models.ConversationMember.user_id == user_id).subquery()
    conversations = db.query(models.Conversation).filter(models.Conversation.id.in_(member_convs)).all()
    
    result = []
    for conv in conversations:
        # Dynamic fallback name for 1-on-1 conversations
        conv_name = conv.name
        if not conv.is_group:
            other_member = db.query(models.User).join(models.ConversationMember).filter(
                models.ConversationMember.conversation_id == conv.id,
                models.ConversationMember.user_id != user_id
            ).first()
            conv_name = other_member.display_name if other_member else "Signal User"
            
        last_msg = db.query(models.Message).filter(models.Message.conversation_id == conv.id).order_by(models.Message.created_at.desc()).first()
        result.append({
            "id": conv.id,
            "name": conv_name,
            "is_group": conv.is_group,
            "last_message": last_msg.text if last_msg else "No messages yet",
            "status": last_msg.status if last_msg else "sent",
            "timestamp": last_msg.created_at.isoformat() if last_msg else conv.created_at.isoformat()
        })
    return result

@app.get("/api/messages/{conversation_id}")
def get_messages(conversation_id: str, db: Session = Depends(database.get_db)):
    return db.query(models.Message).filter(models.Message.conversation_id == conversation_id).order_by(models.Message.created_at.asc()).all()

# --- Real-Time Routing Socket ---
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, db: Session = Depends(database.get_db)):
    await manager.connect(user_id, websocket)
    try:
        while True:
            raw_data = await websocket.receive_text()
            payload = json.loads(raw_data)
            
            if payload.get("event_type") == "send_message":
                msg_data = payload["data"]
                
                # Mock E2EE simulation layer
                simulated_encrypted_text = f"🔒 {msg_data['text']}" 
                print(f"[E2EE Simulated Payload]: {simulated_encrypted_text}")
                
                # Save to database
                new_msg = models.Message(
                    id=f"msg_{db.query(models.Message).count() + 1}",
                    conversation_id=msg_data["conversation_id"],
                    sender_id=user_id,
                    text=msg_data["text"],
                    status="sent"
                )
                db.add(new_msg)
                db.commit()
                
                # Broadcast out to all active conversation participants
                participants = db.query(models.ConversationMember.user_id).filter(models.ConversationMember.conversation_id == msg_data["conversation_id"]).all()
                broadcast_payload = {
                    "event_type": "new_message",
                    "data": {
                        "id": new_msg.id,
                        "conversation_id": new_msg.conversation_id,
                        "sender_id": new_msg.sender_id,
                        "text": new_msg.text,
                        "status": new_msg.status,
                        "created_at": new_msg.created_at.isoformat()
                    }
                }
                for p in participants:
                    await manager.send_personal_message(broadcast_payload, p.user_id)
                    
    except WebSocketDisconnect:
        manager.disconnect(user_id)
