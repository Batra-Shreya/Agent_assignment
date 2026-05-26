# bot.py
import os
import telebot
import requests
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WORKFLOW_ID = os.getenv("DEFAULT_WORKFLOW_ID")

bot = telebot.TeleBot(TELEGRAM_TOKEN)

print("🤖 Telegram Bot is waking up...")

@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.reply_to(message, "👋 Welcome to the AI Orchestrator! Tell me what you want to research today.")

@bot.message_handler(func=lambda message: True)
def handle_message(message):
    user_prompt = message.text
    
    # Send a "typing..." indicator to the user
    bot.reply_to(message, "⏳ Let me ask my AI agents to work on this. Please wait...")

    try:
        # Call your FastAPI backend!
        response = requests.post(
            "http://127.0.0.1:8000/api/workflows/execute",
            json={
                "workflow_id": WORKFLOW_ID,
                "user_prompt": user_prompt
            },
            timeout=120 # Give agents up to 2 minutes to search and write
        )
        
        if response.status_code == 200:
            final_answer = response.json().get("result", "No output generated.")
            bot.reply_to(message, final_answer)
        else:
            bot.reply_to(message, f"❌ Error from backend: {response.text}")

    except Exception as e:
        bot.reply_to(message, f"❌ Failed to reach AI engine: {str(e)}")

if __name__ == "__main__":
    bot.infinity_polling()