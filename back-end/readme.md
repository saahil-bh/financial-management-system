1. Setup Environment

It is highly recommended to use a virtual environment.

# Create a virtual environment
python -m venv venv

# Activate the environment
# On macOS/Linux
source venv/bin/activate

# On Windows (Command Prompt)
# venv\Scripts\activate.bat


2. Install Dependencies

Install all required Python packages (including FastAPI, Uvicorn, SQLAlchemy, and Authentication libraries).

pip install fastapi uvicorn "python-jose[cryptography]" python-multipart "passlib[bcrypt]" sqlalchemy psycopg2-binary pwdlib


3. Database Configuration

Your database connection details are currently hardcoded in database.py. For production use, you should use environment variables, but for local setup, ensure your PostgreSQL server is running and the credentials match what is in database.py:

Database URL Format: postgresql://postgres:3322@localhost:5432/FinancialManagementDB

4. Run the Application

The application uses uvicorn to serve the API. The --reload flag is useful for development as it restarts the server on code changes.

python main.py
