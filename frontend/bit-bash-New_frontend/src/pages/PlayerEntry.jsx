'use client';

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./PlayerEntry.css";

const avatars = [
  { id: 0, emoji: "🐶", label: "Puppy" },
  { id: 1, emoji: "🐱", label: "Kitty" },
  { id: 2, emoji: "🦊", label: "Fox" },
  { id: 3, emoji: "🐼", label: "Panda" },
  { id: 4, emoji: "🐸", label: "Frog" },
  { id: 5, emoji: "🐯", label: "Tiger" },
  { id: 6, emoji: "😄", label: "Happy" },
  { id: 7, emoji: "😎", label: "Cool" },
  { id: 8, emoji: "🤓", label: "Nerd" },
  { id: 9, emoji: "🥳", label: "Party" },
  { id: 10, emoji: "😈", label: "Mischief" },
  { id: 11, emoji: "🤩", label: "Excited" }
];


export default function PlayerEntry() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [className, setClassName] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // 👈 GET LANGUAGE FROM LOCATION STATE
  const language = location.state?.language || "python";

  const handleStart = () => {
    if (!fullName.trim() || !username.trim() || !className.trim() || avatar === null) {
      setError(
        avatar === null
          ? "Pick an avatar and fill in every field to continue."
          : "Fill in every field to continue."
      );
      setErrorKey((k) => k + 1);
      return;
    }
    setError("");

    const profile = {
      fullName,
      username,
      className,
      avatar,
      language  // 👈 STORE LANGUAGE IN PROFILE
    };

    sessionStorage.setItem("playerProfile", JSON.stringify(profile));

    // Initialize game session cleanly
    sessionStorage.setItem("gameSession", JSON.stringify({
      score: 0,
      currentQuestion: 1,
      language  // 👈 ALSO STORE IN GAME SESSION
    }));

    // Clear old progress (safety)
    sessionStorage.removeItem("bbbProgress");
    sessionStorage.removeItem("bbbResults");
    sessionStorage.removeItem("round1ResultsSeen");

    // Navigate to correct language folder
    // 👈 DYNAMIC ROUTE BASED ON LANGUAGE
    const routePath = language === "c" ? "/c/question-1" : "/python/question-1";
    navigate(routePath);
  };

  const picked = avatars.find((a) => a.id === avatar);
  const languageName = language === "c" ? "C" : "Python";

  return (
    <div className="entry-container">
      <header className="entry-top">
        <span className="entry-brand">Bit Bash Bonanza</span>
        <span className="entry-lang">
          Playing in <b>{languageName}</b>
          <button type="button" className="entry-change" onClick={() => navigate("/", { replace: true })}>
            Change
          </button>
        </span>
      </header>

      <main className="entry-main">
        <div className="entry-heading">
          <h1>Create your player card</h1>
          <p>This is how you'll appear on the scoreboard.</p>
        </div>

        <form
          className="entry-card"
          onSubmit={(e) => {
            e.preventDefault();
            handleStart();
          }}
          noValidate
        >
          {/* Live preview */}
          <aside className="id-card" aria-label="Player card preview">
            <div className="id-card-top">
              <span>Player</span>
              <span className="id-card-lang">{languageName}</span>
            </div>
            <div className={`id-avatar ${picked ? "has-pick" : ""}`} key={avatar ?? "none"}>
              {picked ? picked.emoji : "?"}
            </div>
            <div className="id-name">{fullName.trim() || "Your name"}</div>
            <div className="id-meta">
              <span>{className.trim() || "Class"}</span>
              <span>@{username.trim() || "username"}</span>
            </div>
            <div className="id-barcode" aria-hidden="true" />
          </aside>

          {/* Details */}
          <div className="entry-fields">
            <label className="field">
              <span className="field-label">Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Riya Sharma"
                autoComplete="name"
                maxLength={80}
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Class</span>
                <input
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. TE-A"
                  maxLength={40}
                />
              </label>

              <label className="field">
                <span className="field-label">Username</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Shown on the scoreboard"
                  autoComplete="off"
                  maxLength={60}
                />
              </label>
            </div>

            <fieldset className="avatar-section">
              <legend className="field-label">Pick an avatar</legend>
              <div className="avatar-grid">
                {avatars.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    className={avatar === a.id ? "avatar-option selected" : "avatar-option"}
                    onClick={() => setAvatar(a.id)}
                    title={a.label}
                    aria-label={a.label}
                    aria-pressed={avatar === a.id}
                  >
                    <span className="avatar-emoji">{a.emoji}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <div className="entry-error" role="alert" key={errorKey}>
                {error}
              </div>
            )}

            <button type="submit" className="start-btn">
              Start Round 1
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
