# GapFinder AI

GapFinder AI helps students find what they do not know yet, then turns that diagnosis into a focused revision plan:

**Upload → retrieve → test → diagnose → plan → re-test**

The assessment demo includes a Biology course and a saved demo student account. Student sources and progress stay in the browser. A small Python server connects the app to the OpenAI Responses API when an API key is configured.

## Run on Windows

1. Install Python 3.10 or later from [python.org](https://www.python.org/downloads/windows/) and enable the Python launcher (`py`).
2. Open the project folder and double-click `run_windows.bat`.
3. Open `http://127.0.0.1:8000` in Edge or Chrome.

The app also runs on macOS and Linux. Start it with `python3 server.py` on macOS/Linux, or `py -3 server.py` on Windows. No Node.js or third-party Python packages are needed.

## Enable model-backed AI

The app can use local retrieval and demo questions without a key. To turn on AI question generation, answer feedback, explain-a-topic responses, and past-paper mapping:

1. Create an OpenAI API key in your OpenAI developer account.
2. Copy `.env.example` to `.env` in the project folder.
3. Replace `add-your-api-key-here` with your key. Keep `.env` private; it is excluded by `.gitignore`.
4. Restart `run_windows.bat` or `server.py`.

The default model is `gpt-6-astra`. Change `OPENAI_MODEL` in `.env` if your API account uses a different supported model. The local server calls the Responses API and requests schema-checked JSON, so quiz options, answer keys, feedback, and topic matches have a predictable shape.

**Do not put an API key in `app.js`, HTML, a screenshot, or a GitHub commit.** The Python server reads it from the local `.env` file or environment. When AI is enabled, only retrieved source passages and the current prompt are sent to the configured model. The app does not upload the student's whole source library or save model requests in its own database. Check your API account's data policies before using real student material.

## Demo login

- **Email:** `demo@student.com`
- **Password:** `study123`

The demo workspace includes a syllabus, revision notes, a practice paper, sample diagnostic history, a topic map, and a generated revision plan.

## Assessment features

- Add a syllabus, notes, and past papers as PDF, TXT, Markdown, or CSV.
- Extract PDF text in the browser with PDF.js and retain page labels for citations.
- Build a topic list from the uploaded syllabus.
- Split notes into cited sections and retrieve passages against quiz topics and student questions.
- Generate diagnostic questions from retrieved passages only. The server validates source IDs and maps them back to the original filename and section.
- Grade selections against the generated answer key and ask the model for a short source-grounded explanation of why each answer was right or wrong.
- Map past-paper questions to syllabus topics using retrieved note passages, show the question and evidence citations, and use mapped counts in the revision priority.
- Classify topics as weak, medium, or strong from diagnostic results and explain the diagnosis.
- Generate a revision plan ordered by current confidence and mapped exam frequency, within the entered days and hours.
- Explain a topic using retrieved sources only; say when the sources do not support an answer.
- Save diagnostic attempts, topic confidence, and completed plan sessions in browser local storage.

## Retrieval and generation are separate

`server.py` ranks source passages first using a BM25-like lexical score. Only the top matching passages are included in each model request. The model then generates questions, feedback, topic mappings, or an explanation from those retrieved passages. It cannot select an arbitrary citation: the server accepts only source IDs that were retrieved and attaches the original stored citation itself. If no passage supports an explanation, the app reports that it could not find one.

Without an API key, the app remains usable in local demo mode with keyword retrieval, template questions, direct answer-key checks, and local past-paper matching. The assessment's model-backed features require a working API key and access to the configured model.

## Important limits

- Demo login is not a secure multi-user account system. Student data lives in the browser profile and does not sync between devices.
- The sample scores and demo material are illustrative. Replace them with the student's real course content before evaluating their knowledge.
- PDF text extraction uses PDF.js from cdnjs and therefore needs an internet connection. Scanned image-only PDFs need OCR before their text can be retrieved.
- This is an assessment prototype, not a production school system. Add authenticated accounts, a database, teacher permissions, and a deployment setup before using it with a class.

## Project structure

- `index.html` — app entry point
- `styles.css` — responsive interface
- `app.js` — browser UI, file handling, local storage, topic map, and revision plan
- `server.py` — local static server, retrieval, model-backed generation, grading, and paper mapping
- `run_windows.bat` — Windows launcher
- `.env.example` — local API configuration template (contains no real key)
