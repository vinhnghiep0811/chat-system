# 💬 Realtime Chat System

A full-stack **real-time chat application** built with **Next.js, Django, Django Channels, Redis, and PostgreSQL**.  
The system supports **instant messaging, friend management, threaded replies, and read receipts** using **WebSocket-based communication**.

This project demonstrates building a **scalable real-time backend architecture** with modern web technologies.

---

# 🚀 Features

### 👤 Authentication
- User registration with email verification
- JWT-based authentication
- Secure login / logout with HTTP-only cookies
- Protected routes in frontend

### 🤝 Friend System
- Send friend requests using **username or email**
- Accept / reject friend requests
- Maintain a list of friends
- Automatically create conversation when friendship is accepted

### 💬 Realtime Chat
- 1-to-1 private conversations
- Send and receive messages instantly via **WebSocket**
- Automatic message synchronization between users

### 🧵 Threaded Messages
- Reply to specific messages
- Thread view for discussion inside a conversation
- Nested conversation structure

### 👁️ Read Receipts
- Detect when a message has been seen
- Real-time updates for message status

### 📡 WebSocket Communication
- Persistent connection using **Django Channels**
- Redis as channel layer
- Real-time message broadcasting

---

### Communication Flow

1. Users authenticate via **REST API**
2. Messages are sent via **WebSocket**
3. Django Channels processes events
4. Redis broadcasts messages to connected clients
5. Clients update UI in real time

---

# 🛠️ Tech Stack

## Backend
- **Python**
- **Django**
- **Django REST Framework**
- **Django Channels**
- **Redis**
- **PostgreSQL**
- **SimpleJWT**

## Frontend
- **Next.js**
- **React**
- **TypeScript**
- **TailwindCSS**

## DevOps
- **Docker**
- **Docker Compose**
- **Render (deployment)**

---

## 🎥 Demo

### 🔗 Live Demo

You can try the application here:

**Frontend:**  
👉 [Live Demo Link](https://chat-system-bay.vercel.app/auth/login)

**Backend API:**  
👉 [API Endpoint](https://chat-system-nx89.onrender.com)

---
