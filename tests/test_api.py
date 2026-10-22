import unittest
import os
import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from server import get_client, CURATED_MODELS, GeminiBotHandler

class TestGeminiBot(unittest.TestCase):
    def test_environment_loaded(self):
        """Verify API key is discovered from .env or .env.txt."""
        api_key = os.getenv("OPENROUTER_API_KEY")
        self.assertIsNotNone(api_key, "OPENROUTER_API_KEY should be present in environment")
        self.assertTrue(len(api_key) > 10, "API key should be a valid string")

    def test_client_initialization(self):
        """Verify OpenAI client initializes with OpenRouter base URL."""
        client = get_client()
        self.assertIsNotNone(client, "OpenAI client should initialize successfully")
        self.assertIn("openrouter.ai", str(client.base_url))

    def test_curated_models(self):
        """Verify model catalog integrity."""
        self.assertGreater(len(CURATED_MODELS), 0, "Curated models list should not be empty")
        for m in CURATED_MODELS:
            self.assertIn("id", m)
            self.assertIn("name", m)
            self.assertIn("badge", m)

    def test_vercel_entrypoints(self):
        """Verify Vercel entrypoint handlers and app instances are properly exposed."""
        from http.server import BaseHTTPRequestHandler
        import server
        import main
        import json
        from api import index as api_index

        # server.py exports
        self.assertTrue(hasattr(server, "handler"), "server.py must export handler")
        self.assertTrue(hasattr(server, "app"), "server.py must export app")
        self.assertTrue(issubclass(server.handler, BaseHTTPRequestHandler))

        # main.py exports
        self.assertTrue(hasattr(main, "handler"), "main.py must export handler")
        self.assertTrue(hasattr(main, "app"), "main.py must export app")
        self.assertTrue(issubclass(main.handler, BaseHTTPRequestHandler))

        # api/index.py exports
        self.assertTrue(hasattr(api_index, "handler"), "api/index.py must export handler")
        self.assertTrue(hasattr(api_index, "app"), "api/index.py must export app")
        self.assertTrue(issubclass(api_index.handler, BaseHTTPRequestHandler))

        # vercel.json validity
        v_config = ROOT_DIR / "vercel.json"
        self.assertTrue(v_config.exists(), "vercel.json must exist")
        data = json.loads(v_config.read_text(encoding="utf-8"))
        self.assertIn("rewrites", data)

if __name__ == "__main__":
    unittest.main()

