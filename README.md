<div align="center">

# 🌌 GeminiBot Neo

### Next-Generation AI Chat Workspace

A sleek, immersive AI chatbot with a **premium glassmorphic web UI** and a **terminal CLI mode**.  
Powered by **free high-intelligence models** via [OpenRouter](https://openrouter.ai/).

[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![OpenRouter](https://img.shields.io/badge/API-OpenRouter-blueviolet)](https://openrouter.ai/)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🖥️ **Web GUI** | Premium glassmorphic interface with animated orbs, sidebar, and dark theme |
| 💬 **Real-Time Streaming** | Server-Sent Events (SSE) for token-by-token AI responses |
| 🤖 **Multi-Model Support** | Switch between 8+ curated free models (Nvidia, Google, Meta, Cohere…) |
| ⌨️ **Terminal CLI** | Lightweight interactive chat directly in your terminal |
| ⚙️ **In-App Settings** | Configure API key and preferences from the web UI — no restart needed |
| 🔒 **Secure by Design** | API keys stored in `.env`, never committed to version control |
| 🧪 **Unit Tests** | Built-in tests for environment, client, models, and static assets |

---

## 🏗️ Project Structure

```
gemini_bot/
├── main.py              # Entry point — launches Web GUI or CLI
├── server.py            # HTTP server, API endpoints, model catalog
├── requirements.txt     # Python dependencies
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
├── LICENSE              # MIT License
├── web/                 # Frontend static assets
│   ├── index.html       # Main HTML page
│   ├── style.css        # Glassmorphic dark-theme styles
│   └── app.js           # Client-side logic (chat, streaming, settings)
└── tests/
    └── test_api.py      # Unit tests for backend components
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.9+** installed on your machine
- A **free OpenRouter API key** — [get one here](https://openrouter.ai/)

### 1. Clone the Repository

```bash
git clone https://github.com/Iyedchebbi/GeminiBot-Neo.git
cd GeminiBot-Neo
```

### 2. Create a Virtual Environment (Recommended)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Your API Key

Copy the example environment file and add your key:

```bash
cp .env.example .env
```

Then open `.env` and replace the placeholder:

```env
OPENROUTER_API_KEY=sk-or-v1-your_actual_key_here
```

---

## 💻 Usage

### Web GUI Mode (Default)

```bash
python main.py
```

This starts a local server and automatically opens your browser at `http://127.0.0.1:5000`.

**Custom port:**

```bash
python main.py --port 8080
```

### Terminal CLI Mode

```bash
python main.py --cli
```

**CLI Commands:**
| Command | Action |
|---------|--------|
| Type your message | Chat with the AI |
| `model <name>` | Switch to a different model |
| `exit` or `quit` | End the session |

---

## 🔌 API Endpoints

The built-in HTTP server exposes these endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/status` | Server health check + API key status |
| `GET` | `/api/models` | List all available models (curated + OpenRouter free tier) |
| `POST` | `/api/chat` | Send a chat request (supports streaming via SSE) |
| `POST` | `/api/settings` | Update API key at runtime |

### Example: Chat Request

```json
POST /api/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Explain quantum computing in simple terms" }
  ],
  "model": "nvidia/nemotron-3-ultra-550b-a55b:free",
  "temperature": 0.7,
  "stream": true
}
```

---

## 🤖 Available Models

All models below are **free** via OpenRouter:

| Model | Provider | Category |
|-------|----------|----------|
| Nemotron 3 Ultra 550B | Nvidia | Popular |
| Gemma 4 26B | Google | Google |
| Nemotron 3.5 Lightning | Nvidia | Fast |
| MiniMax M3.1 Flash | MiniMax | Fast |
| North Mini Code | Cohere | Coding |
| Nemotron 3.5 Super VL | Nvidia | Vision |
| Llama 3.3 70B | Meta | Popular |
| Gemini 2.0 Flash | Google | Google |

> Additional free models from OpenRouter are automatically discovered and appended at runtime.

---

## 🧪 Running Tests

```bash
python -m pytest tests/ -v
# or
python -m unittest tests/test_api.py
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python · `http.server` · OpenAI SDK (OpenRouter-compatible) |
| **Frontend** | HTML5 · CSS3 (Glassmorphism) · Vanilla JavaScript |
| **Fonts** | Outfit · JetBrains Mono (Google Fonts) |
| **Icons** | Font Awesome 6 |
| **API Gateway** | OpenRouter (unified access to 100+ LLMs) |

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. **Fork** this repository
2. Create a **feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m "Add amazing feature"`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Iyed Chebbi**  
- GitHub: [@Iyedchebbi](https://github.com/Iyedchebbi)

---

<div align="center">

*Built with ❤️ and AI — GeminiBot Neo © 2026*

</div>
