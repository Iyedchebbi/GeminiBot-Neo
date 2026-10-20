import os
import sys
import webbrowser
import threading
import time
from pathlib import Path
from dotenv import load_dotenv

# Ensure environment is loaded from .env or .env.txt
BASE_DIR = Path(__file__).resolve().parent
if (BASE_DIR / ".env").exists():
    load_dotenv(BASE_DIR / ".env")
elif (BASE_DIR / ".env.txt").exists():
    load_dotenv(BASE_DIR / ".env.txt")
else:
    load_dotenv()

from server import run_server, DEFAULT_MODEL, get_client

def start_gui(port=5000):
    """Launch the GeminiBot Neo web GUI and open the browser."""
    print("=" * 60)
    print("  🌌 Launching GeminiBot Neo Immersive Workspace...")
    print("=" * 60)

    # Start browser after server starts
    def open_browser():
        time.sleep(1.2)
        url = f"http://127.0.0.1:{actual_port}"
        print(f"  👉 Opening browser at: {url}")
        webbrowser.open(url)

    httpd, actual_port = run_server(port=port)
    threading.Thread(target=open_browser, daemon=True).start()

    print(f"\n  ✅ Server running at http://127.0.0.1:{actual_port}")
    print("  Press Ctrl+C to stop.\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Shutting down server gracefully...")
        httpd.server_close()

def start_cli():
    """Terminal CLI interactive chat loop."""
    print("=" * 60)
    print("  🤖 GeminiBot Terminal CLI Mode")
    print(f"  Model: {DEFAULT_MODEL}")
    print("  Type 'exit' to quit, 'model <name>' to change model.")
    print("=" * 60)

    client = get_client()
    if not client:
        print("\n❌ Error: OPENROUTER_API_KEY is missing from .env or .env.txt")
        print("Please configure your API key in .env\n")
        sys.exit(1)

    model = DEFAULT_MODEL
    messages = []

    while True:
        try:
            query = input("\nYou: ").strip()
            if not query:
                continue

            if query.lower() in ("exit", "quit"):
                print("Goodbye!")
                break

            if query.lower().startswith("model "):
                model = query.split(" ", 1)[1].strip()
                print(f" Switched model to: {model}")
                continue

            messages.append({"role": "user", "content": query})

            print("AI: ", end="", flush=True)
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True
            )

            full_reply = ""
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                content = getattr(delta, "content", None) or ""
                if content:
                    print(content, end="", flush=True)
                    full_reply += content
            print()

            messages.append({"role": "assistant", "content": full_reply})

        except KeyboardInterrupt:
            print("\nSession ended.")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            if messages and messages[-1]["role"] == "user":
                messages.pop()

if __name__ == "__main__":
    if "--cli" in sys.argv:
        start_cli()
    else:
        port = 5000
        for i, arg in enumerate(sys.argv):
            if arg in ("--port", "-p") and i + 1 < len(sys.argv):
                try:
                    port = int(sys.argv[i + 1])
                except ValueError:
                    pass
        start_gui(port=port)
