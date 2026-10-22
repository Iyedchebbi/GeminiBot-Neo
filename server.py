import json
import os
import sys
import threading
import urllib.parse
import urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

# 1. Load environment variables (.env, fallback to .env.txt)
BASE_DIR = Path(__file__).resolve().parent
if (BASE_DIR / ".env").exists():
    load_dotenv(BASE_DIR / ".env")
elif (BASE_DIR / ".env.txt").exists():
    load_dotenv(BASE_DIR / ".env.txt")
else:
    load_dotenv()

DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free"

CURATED_MODELS = [
    {
        "id": "nvidia/nemotron-3-ultra-550b-a55b:free",
        "name": "Nvidia Nemotron 3 Ultra (Free)",
        "badge": "FREE",
        "category": "Popular",
        "desc": "Powerful 550B flagship model optimized for reasoning and chat."
    },
    {
        "id": "google/gemma-4-26b-a4b-it:free",
        "name": "Google Gemma 4 26B (Free)",
        "badge": "FREE",
        "category": "Google",
        "desc": "Google's lightweight open model fine-tuned for instruction following."
    },
    {
        "id": "nvidia/nemotron-3.5-lightning:free",
        "name": "Nvidia Nemotron 3.5 Lightning (Free)",
        "badge": "FREE",
        "category": "Fast",
        "desc": "Ultra fast low-latency model for quick queries and coding."
    },
    {
        "id": "minimax/minimax-m3.1-flash:free",
        "name": "MiniMax M3.1 Flash (Free)",
        "badge": "FREE",
        "category": "Fast",
        "desc": "Responsive, high-throughput general purpose model."
    },
    {
        "id": "cohere/north-mini-code:free",
        "name": "Cohere North Mini Code (Free)",
        "badge": "FREE",
        "category": "Coding",
        "desc": "Specialized for programming, code explanation, and debugging."
    },
    {
        "id": "nvidia/nemotron-3.5-super-vl:free",
        "name": "Nvidia Nemotron 3.5 Super VL (Free)",
        "badge": "FREE",
        "category": "Vision",
        "desc": "Vision-language multimodal model with rich visual understanding."
    },
    {
        "id": "meta-llama/llama-3.3-70b-instruct:free",
        "name": "Meta Llama 3.3 70B (Free)",
        "badge": "FREE",
        "category": "Popular",
        "desc": "State-of-the-art open-weights model from Meta."
    },
    {
        "id": "google/gemini-2.0-flash-exp:free",
        "name": "Google Gemini 2.0 Flash (Free)",
        "badge": "FREE",
        "category": "Google",
        "desc": "Google next-gen multimodal speed & reasoning engine."
    }
]

def get_client():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return None
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )

class GeminiBotHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        directory = str(BASE_DIR / "web")
        super().__init__(*args, directory=directory, **kwargs)

    def log_message(self, format, *args):
        sys.stderr.write(f"[{self.log_date_time_string()}] {format % args}\n")
        sys.stderr.flush()

    def send_json(self, status_code, data, is_head=False):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        if not is_head:
            self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/status":
            return self.send_json(200, {"status": "online"}, is_head=True)
        elif path == "/api/models":
            return self.send_json(200, {"models": []}, is_head=True)
        return super().do_HEAD()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/status":
            api_key = os.getenv("OPENROUTER_API_KEY", "")
            has_key = bool(api_key.strip())
            masked_key = (api_key[:8] + "..." + api_key[-4:]) if len(api_key) > 12 else ("Configured" if has_key else "Missing")
            return self.send_json(200, {
                "status": "online",
                "has_api_key": has_key,
                "masked_key": masked_key,
                "default_model": DEFAULT_MODEL,
                "app_name": "GeminiBot Neo"
            })

        elif path == "/api/models":
            models = list(CURATED_MODELS)
            try:
                req = urllib.request.Request("https://openrouter.ai/api/v1/models", headers={"User-Agent": "GeminiBot/1.0"})
                with urllib.request.urlopen(req, timeout=3) as resp:
                    if resp.status == 200:
                        remote_data = json.loads(resp.read().decode("utf-8"))
                        remote_models = remote_data.get("data", [])
                        existing_ids = {m["id"] for m in models}
                        for rm in remote_models:
                            rid = rm.get("id", "")
                            if ":free" in rid and rid not in existing_ids:
                                rname = rm.get("name", rid.split("/")[-1])
                                models.append({
                                    "id": rid,
                                    "name": f"{rname} (Free)",
                                    "badge": "FREE",
                                    "category": "OpenRouter",
                                    "desc": rm.get("description", "Free tier model on OpenRouter")[:90]
                                })
            except Exception:
                pass

            return self.send_json(200, {"models": models})

        # Static assets (HTML, CSS, JS) handled by SimpleHTTPRequestHandler
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/settings":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(content_len).decode("utf-8")
                data = json.loads(body) if body else {}

                new_key = data.get("api_key", "").strip()
                if new_key:
                    os.environ["OPENROUTER_API_KEY"] = new_key
                    env_path = BASE_DIR / ".env"
                    env_lines = []
                    if env_path.exists():
                        env_lines = [l for l in env_path.read_text(encoding="utf-8").splitlines() if not l.startswith("OPENROUTER_API_KEY=")]
                    env_lines.insert(0, f"OPENROUTER_API_KEY={new_key}")
                    env_path.write_text("\n".join(env_lines) + "\n", encoding="utf-8")

                return self.send_json(200, {"success": True, "message": "Settings saved successfully."})
            except Exception as e:
                return self.send_json(500, {"error": str(e)})

        elif path == "/api/chat":
            content_len = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_len).decode("utf-8")
            try:
                data = json.loads(body) if body else {}
            except Exception:
                return self.send_json(400, {"error": "Invalid JSON in request payload"})

            messages = data.get("messages", [])
            model = data.get("model", DEFAULT_MODEL)
            temperature = float(data.get("temperature", 0.7))
            system_prompt = data.get("system_prompt", "You are an intelligent, helpful, and creative AI assistant called GeminiBot.")
            stream_mode = data.get("stream", True)

            client = get_client()
            if not client:
                return self.send_json(400, {
                    "error": "OPENROUTER_API_KEY is not set. Please add it in settings or the .env file."
                })

            if not messages:
                return self.send_json(400, {"error": "No messages provided."})

            full_messages = []
            if system_prompt:
                full_messages.append({"role": "system", "content": system_prompt})
            full_messages.extend(messages)

            if stream_mode:
                self.send_response(200)
                self.send_header("Content-Type", "text/event-stream")
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Connection", "close")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()

                try:
                    stream = client.chat.completions.create(
                        model=model,
                        messages=full_messages,
                        temperature=temperature,
                        stream=True,
                    )

                    for chunk in stream:
                        delta = chunk.choices[0].delta if chunk.choices else None
                        content = getattr(delta, "content", None) or ""
                        if content:
                            event_data = json.dumps({"content": content})
                            self.wfile.write(f"data: {event_data}\n\n".encode("utf-8"))
                            self.wfile.flush()

                    self.wfile.write(b"data: [DONE]\n\n")
                    self.wfile.flush()
                except Exception as e:
                    err_msg = json.dumps({"error": str(e)})
                    self.wfile.write(f"data: {err_msg}\n\n".encode("utf-8"))
                    self.wfile.write(b"data: [DONE]\n\n")
                    self.wfile.flush()
                finally:
                    self.close_connection = True
                return
            else:
                try:
                    response = client.chat.completions.create(
                        model=model,
                        messages=full_messages,
                        temperature=temperature,
                    )
                    reply = response.choices[0].message.content
                    return self.send_json(200, {
                        "content": reply,
                        "model": model,
                    })
                except Exception as e:
                    return self.send_json(500, {"error": str(e)})

        return self.send_json(404, {"error": f"Endpoint not found: {path}"})


def run_server(port=5000, host="127.0.0.1"):
    for p in range(port, port + 10):
        try:
            httpd = HTTPServer((host, p), GeminiBotHandler)
            print(f"\n=======================================================", flush=True)
            print(f"  🌌 GeminiBot Neo Server Running at: http://{host}:{p}", flush=True)
            print(f"=======================================================\n", flush=True)
            return httpd, p
        except OSError:
            continue
    raise RuntimeError("Could not bind to any port in range.")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    httpd, actual_port = run_server(port=port)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...", flush=True)
        httpd.server_close()
