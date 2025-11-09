import os
from fastapi import APIRouter, Request, HTTPException, status
from sqlalchemy.orm import Session
from linebot import LineBotApi, WebhookHandler
from linebot.exceptions import InvalidSignatureError
from linebot.models import (
    MessageEvent, TextMessage, TextSendMessage, FollowEvent
)

from . import db_model
from .database import SessionLocal # Import the session creator

# Load credentials from .env
try:
    LINE_CHANNEL_ACCESS_TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
    LINE_CHANNEL_SECRET = os.environ["LINE_CHANNEL_SECRET"]
except KeyError:
    raise RuntimeError("LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET not found in .env")

# Initialize SDK components
line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
handler = WebhookHandler(LINE_CHANNEL_SECRET)
router = APIRouter(prefix='/line', tags=['line'])

# --- Webhook Endpoint ---
# This is the single endpoint that LINE will send all events to.
@router.post("/webhook")
async def line_webhook(request: Request):
    # Get X-Line-Signature header value
    signature = request.headers.get('X-Line-Signature')
    if not signature:
        raise HTTPException(status_code=400, detail="Missing X-Line-Signature header")

    # Get request body as text
    body = await request.body()
    
    # Handle webhook body
    try:
        handler.handle(body.decode(), signature)
    except InvalidSignatureError:
        print("Invalid signature. Please check your channel secret.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")
    
    return 'OK'

# --- Event Handler: Follow Event ---
# This is triggered when a user adds your bot as a friend.
@handler.add(FollowEvent)
def handle_follow(event):
    line_user_id = event.source.user_id
    print(f"User {line_user_id} followed the bot.")
    
    # Send a welcome message with instructions
    reply_message = (
        "Welcome to the Financial Management System!\n\n"
        "To receive notifications, please link your account by replying with:\n\n"
        "/register your-email@example.com"
    )
    
    try:
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=reply_message)
        )
    except Exception as e:
        print(f"Error replying to follow event: {e}")

# --- Event Handler: Message Event (for Registration) ---
# This is triggered when a user sends a message to your bot.
@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
    text = event.message.text.strip()
    line_user_id = event.source.user_id
    
    # Create a new, independent database session for this handler
    db: Session = SessionLocal()
    
    try:
        # Check if the message is a registration command
        if text.startswith("/register"):
            parts = text.split()
            if len(parts) == 2:
                email = parts[1]
                
                # Find the user in the database
                user = db.query(db_model.User).filter(db_model.User.email == email).first()
                
                if user:
                    # Check if user is already linked
                    if user.line_user_id:
                        if user.line_user_id == line_user_id:
                            reply = "This LINE account is already linked to your email."
                        else:
                            # This email is linked to a *different* LINE account
                            reply = "Error: This email is already linked to another LINE account."
                    else:
                        # Link new account
                        user.line_user_id = line_user_id
                        db.commit()
                        reply = f"Success! Your LINE account is now linked to {user.name}."
                else:
                    reply = f"Error: No account found with the email '{email}'."
            else:
                reply = "Invalid command. Please use the format: /register your-email@example.com"
        
        else:
            # Default reply for any other message
            reply = "I am a notification bot. To link your account, please reply with: /register your-email@example.com"
        
        # Send the reply message
        line_bot_api.reply_message(
            event.reply_token,
            TextSendMessage(text=reply)
        )
            
    except Exception as e:
        print(f"Error in handle_message: {e}")
        db.rollback() # Rollback any changes on error
    finally:
        db.close() # Always close the session