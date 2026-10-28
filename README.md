
# 🚀 Bit Bash Bonanza

Bit Bash Bonanza is an interactive coding game designed to test and improve programming, debugging, and logical thinking skills in a fun and competitive way.

---
## 🌟 Images
<img width="1903" height="901" alt="home" src="https://github.com/user-attachments/assets/d61f7562-1863-4a82-b62c-5d7d2cb3106d" />
<img width="1911" height="934" alt="Screenshot 2026-06-27 225608" src="https://github.com/user-attachments/assets/bf44767f-c083-4adb-b454-9364d94c1a60" />



## 🌟 Features

### 🎮 Gameplay

* Multiple coding challenge rounds
* Debugging and problem-solving tasks
* Interactive and engaging game flow

### 🧠 System Features

* Real-time code execution
* Output and error handling
* Test case evaluation system
* Dynamic score tracking

### 🎨 UI/UX

* Cyber-themed interface (Neon + Dark mode)
* Smooth animations and transitions
* Responsive design

---

## 🧠 Tech Stack

### 🔹 Frontend

* React.js
* JavaScript (ES6+)
* CSS3

### 🔹 Backend / Logic

* Python

  * Code execution engine
  * Output and error handling
  * Test case validation

### 🔹 Tools

* Vite
* ESLint
* React Router


---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/dhruvpathare07/bit-bash-bonanza.git
cd bit-bash-bonanza\frontend\bit-bash-frontend
```

---

## 🔧 Frontend Setup

```bash
PS E:\bit-bash-bonanza\frontend\bit-bash-frontend>
npm install
npm run dev
```

---

## 🐍 Backend Setup

```bash

PS E:\bit-bash-bonanza\backend> 
pip install flask flask-cors
python app.py
```

---

## ☁️ Hosting on Vercel, then cutting the network

Players load the game from Vercel while the internet is on. You can then cut
the LAN/internet and the game keeps working on every PC until the end:

* the whole app is cached in the browser (a service worker), so even a page
  reload works offline;
* the debug check runs in the browser when the server can't be reached
  (it shows "Checked offline"). It holds only fingerprints of the correct
  lines, not the answers;
* scores are queued in the browser and uploaded automatically when the
  network comes back (even after closing and reopening the browser).

### Deploy (two Vercel projects from this repo)

1. **Backend**: new Vercel project, *Root Directory* = `backend`.
   Environment variables:
   * `DATABASE_URL`: a Postgres database (e.g. Vercel Postgres / Neon). Required,
     otherwise scores are not kept.
   * `ADMIN_PASSKEY`: your admin passkey.
   * `ALLOWED_ORIGINS`: your frontend URL, e.g. `https://bitbash.vercel.app`.
2. **Frontend**: new Vercel project, *Root Directory* = `frontend/bit-bash-New_frontend`.
   Environment variable: `VITE_API_URL` = your backend URL, e.g. `https://bitbash-api.vercel.app`.

### On event day

1. With the internet **on**, open the site on every PC and wait until the
   home page has fully loaded (a few seconds). That caches the game.
2. Cut the network. Players play both rounds as normal.
3. After the event, turn the network back on and leave the browsers open
   (or reopen the site). Queued scores upload within about 20 seconds; check
   `/admin`.

> Don't use private/incognito windows: they delete the queued scores when closed.
> Offline, a fix must match the reference line by line (spacing, indentation and
> variable names don't matter). Online, the server also runs the code and can
> accept a different fix that prints the right output.
>
> If you change the correct answers in `backend/evaluator.py` or
> `backend/c_evaluator.py`, run `python backend/build_offline_checker.py` and
> redeploy so the offline checker matches.

---

## 🔌 Running Offline (event PC, no internet)

The app runs fully offline — frontend and backend both run locally, and all
assets (including fonts) are bundled. Two helper scripts are provided at the
project root:

**One-time setup (with internet), on the event PC:**

```bash
setup.bat
```

This installs the Python and npm dependencies, builds the frontend, and creates
`backend\.env` from the example (open it and set your `ADMIN_PASSKEY`).

**On the day of the event (no internet needed) — just double-click:**

```bash
start-event.bat
```

This starts the backend (`http://localhost:5000`) and the built frontend
(`http://localhost:5173`) in two windows and opens the browser.

* Game:  `http://localhost:5173`
* Admin: `http://localhost:5173/admin`

> Requires Python and Node.js installed on the machine. The `C` challenges also
> need `gcc` on the PATH. A Vercel deployment is served over the internet, so
> it is **not** an offline option — use `start-event.bat` for a no-net event.

---

## ⚙️ How It Works

1. Player enters name and selects avatar
2. Game starts with coding challenges
3. User submits code or answers
4. Python backend:

   * Executes code
   * Validates using test cases
   * Returns output/errors
5. Score updates based on performance

---

## 🎯 Use Cases

* Coding competitions
* Technical events
* Learning and practice platform

---

## 🚀 Future Enhancements

* Support for multiple programming languages
* Leaderboard system
* Timer-based challenges
* Full deployment with API integration

---

## 👨‍💻 Author

**Dhruv Pathare**
**Co-Head - Toshita Upadhya**

---

## 📌 Project Purpose

This project is built to make coding practice more engaging by combining learning with gamification.

---

## 🎯 Conclusion

Bit Bash Bonanza transforms traditional coding practice into an interactive game, helping users improve their problem-solving skills in a fun and competitive environment.

