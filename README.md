# Striver AI – Visual DSA Copilot

Every developer, at least once, sets out to learn DSA. We watch videos, trace loops on paper, and squint at invariants—yet our creative brain can’t always “see” how an algorithm breathes. Striver AI turns that invisible dance into a story you can watch unfold: step-by-step visualizations, runnable code experiments, and a chat that knows your problem’s context.

---


## ✨ What it is

Striver AI is a Next.js + FastAPI project that helps you:
- Generate Manim CE videos that visualize algorithms from problem statements (stored in Supabase)
- Chat with a tool-augmented assistant (Composio) that can fetch problem context and run code
- Prototype code in a safe sandbox via Codeinterpreter (Python) or compile and run C++ locally
- Explore DSA problems and jump straight into a tailored visualization with one click

---
## Here a preview 
  Our main list 
<img width="1470" height="812" alt="image" src="https://github.com/user-attachments/assets/3dadce94-0155-483e-91af-03a7f6313b98" />
  
## Our hero 
<img width="1461" height="825" alt="image" src="https://github.com/user-attachments/assets/91c6692c-ceb5-4419-91c6-6852351cdb1f" />
## THE USP illustrations
<img width="1455" height="823" alt="image" src="https://github.com/user-attachments/assets/7b8d6f70-67a5-4079-84fc-009f1b4ab43e" />
## Usage of Composio
<img width="1469" height="832" alt="image" src="https://github.com/user-attachments/assets/5c438023-7080-4bea-94b8-6b7e4fa1c25a" />

## usage of coderabbit
<img width="1470" height="553" alt="image" src="https://github.com/user-attachments/assets/e9391106-8f66-4eaf-a813-85045d54edef" />



## 🚀 Quickstart

### Prerequisites

- Node.js 18+
- Python 3.12+
- ffmpeg (required by Manim)
- A C++ compiler (clang++/g++) if you want local C++ runs

### Steps to Install

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ManashAnand/personal-chatbot.git
   cd personal-chatbot
   ```

2. **Install Dependencies (Python + Node)**:
   ```bash
   python3 -m venv venv && source venv/bin/activate
   pip install --no-cache-dir -r requirements.txt

   npm install
   ```

3. **Run the Development Servers**:
   ```bash
   # Backend (FastAPI)
   source venv/bin/activate
   uvicorn api.index:app --reload --host 127.0.0.1 --port 8000

   # Frontend (Next.js)
   npm run dev
   ```

4. **Build the Project**:
   ```bash
   npm run build
   ```

> Note: `next.config.js` rewrites `/api/*` to `http://127.0.0.1:8000/api/*` in development.

---

## 🧭 Using the app

- Home lists questions from Supabase. Click a question to open the chatbot at `/chatbot/:id`.
- In the chat page:
  - Generate Illustration: calls `/api/get-illustration-by-id`, renders a Manim video, uploads to Supabase, and auto-plays in the Video panel.
  - Code panel: choose Python or C++
    - Python uses Composio Codeinterpreter tools in a sandbox
    - C++ compiles and runs locally via `/api/compile-run-cpp` (falls back to tools when needed)

---

## 📁 Project Structure

```plaintext
personal-chatbot/
├── api/                    # FastAPI app & routers
├── app/                    # Next.js app router
├── components/             # UI components (ChatBot, Question, etc.)
├── lib/                    # Shared utils
├── public/                 # Static assets
├── .env                    # Environment variables for configuration
├── .eslintrc.json          # ESLint configuration
├── .gitignore              # Git ignore file
├── LICENSE                 # Project license
├── README.md               # Project documentation
├── components.json         # Component metadata
├── next.config.js          # Next.js configuration
├── package-lock.json       # Lock file for npm dependencies
├── package.json            # Project dependencies
├── postcss.config.js       # PostCSS configuration
├── requirements.txt        # Dependencies for non-JavaScript services
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration

```

---

## 🔧 Key endpoints

- `GET /api/ping-db` – test Supabase connectivity, returns a few problems
- `GET /api/get-illustration` – generate code + optionally render+upload Manim video
- `GET /api/get-illustration-by-id` – convenience alias for the above
- `POST /api/tools/chat` – tool-augmented chat (OpenAI + Composio)
- `POST /api/compile-run-cpp` – compile/run C++ locally and return stdout/stderr


## 🤝 Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add your feature"
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature
   ```
5. Create a Pull Request.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

## 🧩 Troubleshooting

- Manim import error (Circle): ensure `manim==0.18.1` + `manimpango` are installed.
- ffmpeg missing: `brew install ffmpeg`.
- C++ compile fails: install clang++/g++; verify PATH.
- Signed URL expired: click Generate again to mint a fresh link.


## 📞 Support

If you encounter any issues or have questions, open an issue or start a discussion.

---

## 🌟 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Backend with [FastAPI](https://fastapi.tiangolo.com/)
- Visuals via [Manim CE](https://www.manim.community/)
- Storage and DB by [Supabase](https://supabase.com/)
- Tools via [Composio](https://composio.dev/)
