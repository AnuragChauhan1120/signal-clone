'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, Video, Send, CheckCheck, MoreVertical, ShieldAlert } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://127.0.0.1:8001';

export default function SignalDashboard() {
  // Authentication & Navigation Context States
  const [user, setUser] = useState<any>(null);
  const [phoneInput, setPhoneInput] = useState('+123456789');
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  
  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auth Handling Form Submits
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: phoneInput }),
    });
    if (res.ok) {
      const userData = await res.json();
      setUser(userData);
    } else {
      alert("Auth Error: Try using seeded values like '+123456789' or '+987654321'");
    }
  };

  // Pull Active Chats Index
  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE_URL}/api/conversations/${user.id}`)
      .then((res) => res.json())
      .then((data) => setConversations(data));

    // Connect WebSocket Pipelines
    const ws = new WebSocket(`${WS_BASE_URL}/ws/${user.id}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.event_type === 'new_message') {
        const incoming = payload.data;
        if (activeChat && incoming.conversation_id === activeChat.id) {
          setMessages((prev) => [...prev, incoming]);
        }
        // Refresh sidebar previews
        fetch(`${API_BASE_URL}/api/conversations/${user.id}`)
          .then((res) => res.json())
          .then((data) => setConversations(data));
      }
    };

    return () => ws.close();
  }, [user, activeChat]);

  // Load Message Threads when target selected
  const openConversation = (chat: any) => {
    setActiveChat(chat);
    fetch(`${API_BASE_URL}/api/messages/${chat.id}`)
      .then((res) => res.json())
      .then((data) => setMessages(data));
  };

  // Fire message data object through websocket channel
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current || !activeChat) return;

    const dispatchPayload = {
      event_type: "send_message",
      data: {
        conversation_id: activeChat.id,
        text: typedMessage
      }
    };
    socketRef.current.send(JSON.stringify(dispatchPayload));
    setTypedMessage('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // View fallback state if unauthenticated
  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#121212]">
        <div className="w-full max-w-md p-8 bg-[#1e1e1e] rounded-2xl border border-zinc-800 shadow-xl text-center">
          <div className="w-16 h-16 bg-[#2c6bed] rounded-2xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg shadow-blue-900/30">
            S
          </div>
          <h2 className="text-2xl font-bold mb-2">Set up your profile</h2>
          <p className="text-zinc-400 text-sm mb-6">Enter your registered phone number to link your device.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="text" 
              value={phoneInput} 
              onChange={(e) => setPhoneInput(e.target.value)}
              className="w-full px-4 py-3 bg-[#262626] border border-zinc-700 rounded-lg focus:outline-none focus:border-[#2c6bed] text-white font-mono tracking-wide"
              placeholder="+123456789"
            />
            <button type="submit" className="w-full py-3 bg-[#2c6bed] hover:bg-[#1b5ae0] transition rounded-lg font-medium text-white">
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#121212] overflow-hidden select-none">
      {/* --- Sidebar (Conversations Canvas) --- */}
      <aside className="w-80 border-r border-zinc-800 flex flex-col bg-[#1a1a1a]">
        <header className="p-4 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <img src={user.avatar_url} alt="Me" className="w-9 h-9 rounded-full bg-zinc-700" />
            <span className="font-semibold text-sm truncate max-w-[120px]">{user.display_name}</span>
          </div>
          <button onClick={() => alert("Settings Modal Placeholder (Coming Soon)")} className="p-1.5 hover:bg-zinc-800 rounded-full text-zinc-400">
            <MoreVertical size={18} />
          </button>
        </header>

        <div className="p-3">
          <div className="relative flex items-center bg-[#262626] rounded-full px-3 py-1.5 border border-transparent focus-within:border-zinc-700">
            <Search size={16} className="text-zinc-500 mr-2" />
            <input type="text" placeholder="Search" className="bg-transparent text-sm w-full focus:outline-none text-zinc-200" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {conversations.map((chat) => (
            <div 
              key={chat.id} 
              onClick={() => openConversation(chat)}
              className={`p-3 flex gap-3 items-center cursor-pointer transition ${activeChat?.id === chat.id ? 'bg-[#2c6bed]/10 border-l-4 border-[#2c6bed]' : 'hover:bg-zinc-800/50'}`}
            >
              <div className="w-11 h-11 bg-zinc-700 rounded-full flex items-center justify-center font-bold text-sm text-zinc-300">
                {chat.name ? chat.name[0] : "👤"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h4 className="font-medium text-sm truncate text-zinc-100">{chat.name || "Direct Message"}</h4>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 truncate">{chat.last_message}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* --- Main Chat Stage --- */}
      <main className="flex-1 flex flex-col bg-[#121212]">
        {activeChat ? (
          <>
            <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#1a1a1a]/90 backdrop-blur">
              <div>
                <h3 className="font-semibold text-sm text-zinc-100">{activeChat.name || "Direct Message"}</h3>
                <p className="text-[11px] text-zinc-500">Simulating End-to-End Encryption</p>
              </div>
              <div className="flex items-center gap-4 text-zinc-400">
                <button onClick={() => alert("Calling placeholder")} className="hover:text-white transition"><Phone size={18} /></button>
                <button onClick={() => alert("Video placeholder")} className="hover:text-white transition"><Video size={18} /></button>
              </div>
            </header>

            {/* Message Flow Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#121212]">
              <div className="max-w-xs mx-auto mb-6 bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-center text-zinc-400 text-xs flex gap-2 items-center">
                <ShieldAlert size={16} className="text-[#2c6bed] shrink-0" />
                <span>All messages display unencrypted locally but are intercepted via safe WebSocket pipelines.</span>
              </div>

              {messages.map((msg) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-md px-3.5 py-2 rounded-2xl text-sm relative group shadow-sm ${
                      isMe ? 'bg-[#2c6bed] text-white rounded-tr-sm' : 'bg-[#262626] text-zinc-100 rounded-tl-sm'
                    }`}>
                      <p className="leading-relaxed break-words pr-8">{msg.text}</p>
                      <div className="absolute bottom-1 right-2 flex items-center gap-1">
                        <span className="text-[9px] opacity-60">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMe && <CheckCheck size={11} className="text-blue-200" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Footer */}
            <form onSubmit={sendMessage} className="p-4 bg-[#1a1a1a] border-t border-zinc-800 flex items-center gap-3">
              <input 
                type="text" 
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder="Signal Message" 
                className="flex-1 bg-[#262626] text-sm text-zinc-100 px-4 py-2.5 rounded-full border border-zinc-700/50 focus:outline-none focus:border-[#2c6bed] placeholder-zinc-500"
              />
              <button type="submit" className="p-2.5 bg-[#2c6bed] hover:bg-[#1b5ae0] text-white rounded-full transition shadow-md shadow-blue-900/20">
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500">
            <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center mb-3 text-zinc-400">💬</div>
            <p className="text-sm">Select a contact or group from the column to start messaging.</p>
          </div>
        )}
      </main>
    </div>
  );
}
