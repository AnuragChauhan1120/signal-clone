from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, CheckConstraint
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=True)  # Name for groups, null for 1-on-1
    is_group = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ConversationMember(Base):
    __tablename__ = "conversation_members"
    conversation_id = Column(String, ForeignKey("conversations.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    is_admin = Column(Boolean, default=False)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, index=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    status = Column(String, default="sent") # sending, sent, delivered, read
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        CheckConstraint(status.in_(["sending", "sent", "delivered", "read"]), name="valid_status"),
    )