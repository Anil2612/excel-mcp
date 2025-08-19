import { useState } from "react";

const API = "http://localhost:4000";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const send = async () => {
    if (!input.trim()) return;
    const mine = { from: "you", text: input };
    setMessages(m => [...m, mine]);

    const res = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input })
    });
    const data = await res.json();
    setMessages(m => [...m, { from: "bot", text: data.reply }]);
    setInput("");
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h2>Excel Chatbot (MCP backend)</h2>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, height: 420, overflow: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ margin: "8px 0" }}>
            <b>{m.from}:</b> <pre style={{ display: "inline", whiteSpace: "pre-wrap", margin: 0 }}>{m.text}</pre>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          style={{ flex: 1, padding: 10 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. find Name John"
          onKeyDown={e => e.key === "Enter" && send()}
        />
        <button onClick={send}>Send</button>
      </div>
      <p style={{ color: "#666", marginTop: 10 }}>
        Examples: find Name John · add Name=Alice Age=30 Status=Active · update Name=Alice set Status=Inactive · delete Name=Bob
      </p>
    </div>
  );
}
