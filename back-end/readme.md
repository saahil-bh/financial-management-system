# Create a virtual environment
```bash
python -m venv venv
```

# Activate the environment
** On macOS/Linux
```bash
source venv/bin/activate
```

** On Windows (Command Prompt)
```bash
venv\Scripts\activate.bat
```

** Install
```bash
pip install fastapi uvicorn "python-jose[cryptography]" python-multipart "passlib[bcrypt]" sqlalchemy psycopg2-binary pwdlib
```
