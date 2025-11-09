import os
from sqlalchemy.orm import Session
from linebot import LineBotApi
from linebot.models import TextSendMessage
from linebot.exceptions import LineBotApiError
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from . import db_model

# --- Load Config from .env ---
try:
    LINE_CHANNEL_ACCESS_TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
    SENDER_EMAIL = os.environ["SENDER_EMAIL"]
    SENDGRID_API_KEY = os.environ["SENDGRID_API_KEY"]
    
    line_bot_api = LineBotApi(LINE_CHANNEL_ACCESS_TOKEN)
    sg = SendGridAPIClient(SENDGRID_API_KEY)
    
except KeyError:
    raise RuntimeError("API keys (LINE/SendGrid) not found in environment variables.")

# --- Internal Functions ---
def _send_line_notification(line_user_id: str, message_text: str):
    """Internal function to send a LINE push message."""
    if not line_user_id:
        print(f"Skipping LINE notification: user has no line_user_id.")
        return False
    try:
        line_bot_api.push_message(
            line_user_id,
            TextSendMessage(text=message_text)
        )
        print(f"Successfully sent LINE message to {line_user_id}")
        return True
    except LineBotApiError as e:
        print(f"Error sending LINE message: {e.error.message}")
        # Handle error (e.g., user blocked bot, invalid ID)
        return False
    except Exception as e:
        print(f"An unexpected error occurred with LINE API: {e}")
        return False

def _send_email_notification(to_email: str, subject: str, message_text: str):
    """Internal function to send an Email via SendGrid."""
    html_message = message_text.replace('\n', '<br>') # Move expression out
    message = Mail(
        from_email=SENDER_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=f"<p>{html_message}</p>" # Use the pre-computed value
    )
    try:
        response = sg.send(message)
        print(f"Successfully sent email to {to_email} (Status: {response.status_code})")
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

# --- Public Dispatch Function ---

def dispatch_notification(
    db: Session, 
    user: db_model.User, 
    message: str, 
    subject: str = "Notification from FMS"
):
    """
    Dispatches a notification to a user via Email and/or LINE
    and logs it to the database.
    """
    
    # 1. Try to send via LINE
    if user.line_user_id:
        if _send_line_notification(user.line_user_id, message):
            # Log to DB as 'LINE' type
            db_notification = db_model.Notification(
                u_id=user.u_id,
                message=message,
                type='LINE'
            )
            db.add(db_notification)

    # 2. Always send via Email (as a reliable fallback)
    # if _send_email_notification(user.email, subject, message):
    #     # Log to DB as 'Email' type
    #     db_notification = db_model.Notification(
    #         u_id=user.u_id,
    #         message=message,
    #         type='Email'
    #     )
    #     db.add(db_notification)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error logging notification to database: {e}")