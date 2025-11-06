```bash
# 1. Create a virtual environment
python -m venv venv

# 2. Activate the environment
# On macOS/Linux:
source venv/bin/activate
# On Windows (Command Prompt):
# venv\Scripts\activate.bat

# 3. Install dependencies
pip install fastapi uvicorn "python-jose[cryptography]" python-multipart "passlib[bcrypt]" sqlalchemy psycopg2-binary pwdlib
```
