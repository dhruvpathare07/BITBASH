
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

