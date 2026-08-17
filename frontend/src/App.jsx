import { useState, useRef, useEffect } from "react";
import "./index.css";

const COUNTRIES = [
  "Afghanistan","Argentina","Australia","Austria","Bangladesh","Belgium","Brazil","Canada",
  "Chile","China","Colombia","Czech Republic","Denmark","Egypt","Finland","France","Germany",
  "Ghana","Greece","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan","Jordan",
  "Kenya","Kuwait","Malaysia","Mexico","Morocco","Netherlands","New Zealand","Nigeria","Norway",
  "Pakistan","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia",
  "Singapore","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Thailand",
  "Turkey","Ukraine","United Arab Emirates","United Kingdom","United States","Vietnam"
].sort();

const TOPICS = [
  "Employment & Labor", "Tenancy & Housing", "Consumer Rights", "Family & Marriage",
  "Business & Contracts", "Criminal Basics", "Immigration", "Traffic & Driving",
  "Property & Land", "Taxation Basics"
];

function SealBadge({ country, size = 72 }) {
  const initial = country ? country[0] : "?";

  return (
    <div
      className="seal-badge"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      <span>{initial}</span>
    </div>
  );
}

export default function App() {
  const [country, setCountry] = useState(null);
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stamping, setStamping] = useState(false);
  const [error, setError] = useState(null);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  function selectCountry(c) {
    setStamping(true);

    setTimeout(() => {
      setCountry(c);
      setStamping(false);

      setMessages([
        {
          role: "assistant",
          content: `You've selected **${c}**. I can give you general information on local laws here — employment, tenancy, consumer rights, family law, business matters, and more. What's on your mind? You can also pick a topic below to get started.`,
        },
      ]);
    }, 550);
  }

  function changeCountry() {
    setCountry(null);
    setMessages([]);
    setSearch("");
    setTopic(null);
    setError(null);
  }

  async function sendMessage(text) {
    const content = text ?? input;

    if (!content.trim() || loading) return;

    const newMessages = [
      ...messages,
      {
        role: "user",
        content,
      },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();

      const replyText =
        data.reply ||
        "I couldn't generate a response. Please try again.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: replyText,
        },
      ]);
    } catch (e) {
      setError(
        "Something went wrong reaching the legal assistant. Please try again."
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong reaching the legal assistant. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleTopicClick(t) {
    setTopic(t);

    sendMessage(
      `I have a general question about ${t.toLowerCase()} law in ${country}. Can you give me an overview of the key things I should know?`
    );
  }

  return (
    <div className="app">
      <div className="brand">
        <div className="brand-eyebrow">
          General Legal Information · Not Legal Advice
        </div>

        <h1 className="brand-title">
          Statute &amp; Seal
        </h1>

        <p className="brand-sub">
          Plain-language legal information, by country.
        </p>
      </div>

      {stamping && (
        <div className="stamp-overlay">
          <SealBadge country={search || "•"} size={96} />
        </div>
      )}

      {!country ? (
        <div className="picker">
          <input
            className="search-input"
            placeholder="Search for your country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className="country-grid">
            {filteredCountries.length === 0 && (
              <div className="no-results">
                No matches. Try a different spelling.
              </div>
            )}

            {filteredCountries.map((c) => (
              <button
                key={c}
                className="country-btn"
                onClick={() => selectCountry(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-wrap">
          <div className="country-bar">
            <div className="country-bar-left">
              <SealBadge country={country} size={38} />

              <div>
                <span className="country-bar-label">
                  Jurisdiction
                </span>

                <span className="country-bar-name">
                  {country}
                </span>
              </div>
            </div>

            <button
              className="change-btn"
              onClick={changeCountry}
            >
              Change country
            </button>
          </div>

          <div className="topic-row">
            {TOPICS.map((t) => (
              <button
                key={t}
                className={
                  "topic-chip" +
                  (topic === t ? " active" : "")
                }
                onClick={() => handleTopicClick(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div
            className="messages"
            ref={scrollRef}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={"msg " + m.role}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="typing">
                <div className="dot" />
                <div className="dot" />
                <div className="dot" />
              </div>
            )}
          </div>

          <div className="composer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && sendMessage()
              }
              placeholder={`Ask about ${country} law…`}
            />

            <button
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={loading}
            >
              →
            </button>
          </div>

          <div className="disclaimer">
            General information only, not a substitute for advice from a
            licensed lawyer in {country}.
          </div>
        </div>
      )}
    </div>
  );
}
