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

    def test_web_assets_exist(self):
        """Verify all static frontend files exist."""
        web_dir = ROOT_DIR / "web"
        self.assertTrue((web_dir / "index.html").exists(), "index.html must exist")
        self.assertTrue((web_dir / "style.css").exists(), "style.css must exist")
        self.assertTrue((web_dir / "app.js").exists(), "app.js must exist")

if __name__ == "__main__":
    unittest.main()
