import { useState, useEffect, useRef } from "react";

const SUBJECTS = [
  { id: "trk", label: "Türkçe", icon: "📖", color: "#C8A96E" },
  { id: "mat", label: "Matematik", icon: "📐", color: "#7EB8D4" },
  { id: "tar", label: "Tarih", icon: "🏛", color: "#C46B5A" },
  { id: "cog", label: "Coğrafya", icon: "🗺", color: "#6BAF7E" },
  { id: "egb", label: "Eğitim Bilimleri", icon: "🎓", color: "#9B7BE8" },
  { id: "mvz", label: "Mevzuat", icon: "⚖️", color: "#D4A847" },
  { id: "oabt", label: "ÖABT", icon: "🏅", color: "#E87B9B" },
  { id: "ing", label: "İngilizce", icon: "🌐", color: "#5BC4C4" },
];

const INITIAL_PROGRESS = SUBJECTS.reduce((acc, s) => ({ ...acc, [s.id]: 0 }), {});

function loadData() {
  try {
    const raw = localStorage.getItem("ags_v2");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function AGSTracker() {
  const [tab, setTab] = useState("dashboard");
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [notes, setNotes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [noteInput, setNoteInput] = useState({ subject: "trk", title: "", body: "" });
  const [sessionInput, setSessionInput] = useState({ subject: "trk", minutes: "", date: new Date().toISOString().slice(0, 10) });
  const [editingNote, setEditingNote] = useState(null);
  const [filterSubject, setFilterSubject] = useState("all");
  const [toast, setToast] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerSubject, setTimerSubject] = useState("trk");
  const [examDate, setExamDate] = useState("");
  const [daysLeft, setDaysLeft] = useState(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const d = loadData();
    if (d) {
      if (d.progress) setProgress({ ...INITIAL_PROGRESS, ...d.progress });
      if (d.notes) setNotes(d.notes);
      if (d.sessions) setSessions(d.sessions);
      if (d.examDate) setExamDate(d.examDate);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("ags_v2", JSON.stringify({ progress, notes, sessions, examDate }));
  }, [progress, notes, sessions, examDate]);

  useEffect(() => {
    if (examDate) {
      const diff = Math.ceil((new Date(examDate) - new Date()) / 86400000);
      setDaysLeft(diff > 0 ? diff : 0);
    }
  }, [examDate]);

  useEffect(() => {
    if (timerActive) timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const stopAndSaveTimer = () => {
    setTimerActive(false);
    if (timerSeconds >= 60) {
      const mins = Math.floor(timerSeconds / 60);
      setSessions(prev => [...prev, { id: Date.now(), subject: timerSubject, minutes: mins, date: new Date().toISOString().slice(0, 10) }]);
      showToast(`${mins} dk ${SUBJECTS.find(s => s.id === timerSubject).label} kaydedildi ✓`);
    }
    setTimerSeconds(0);
  };

  const addSession = () => {
    const mins = parseInt(sessionInput.minutes);
    if (!mins || mins <= 0) return;
    setSessions(prev => [...prev, { id: Date.now(), ...sessionInput, minutes: mins }]);
    setSessionInput(p => ({ ...p, minutes: "" }));
    showToast("Çalışma kaydedildi ✓");
  };

  const deleteSession = (id) => setSessions(prev => prev.filter(s => s.id !== id));

  const saveNote = () => {
    if (!noteInput.title.trim()) return;
    if (editingNote) {
      setNotes(prev => prev.map(n => n.id === editingNote ? { ...n, ...noteInput, updated: new Date().toLocaleString("tr-TR") } : n));
      setEditingNote(null);
    } else {
      setNotes(prev => [...prev, { id: Date.now(), ...noteInput, created: new Date().toLocaleString("tr-TR") }]);
    }
    setNoteInput({ subject: "trk", title: "", body: "" });
    showToast(editingNote ? "Not güncellendi ✓" : "Not kaydedildi ✓");
  };

  const startEditNote = (note) => {
    setNoteInput({ subject: note.subject, title: note.title, body: note.body });
    setEditingNote(note.id);
    setTab("notes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = (id) => setDeleteConfirm(id);
  const doDelete = () => { setNotes(prev => prev.filter(n => n.id !== deleteConfirm)); setDeleteConfirm(null); showToast("Not silindi", "warn"); };

  const totalMins = sessions.reduce((a, s) => a + s.minutes, 0);
  const weekMins = sessions.filter(s => (Date.now() - new Date(s.date)) / 86400000 <= 7).reduce((a, s) => a + s.minutes, 0);
  const subjectMins = SUBJECTS.reduce((acc, s) => ({ ...acc, [s.id]: sessions.filter(sess => sess.subject === s.id).reduce((a, b) => a + b.minutes, 0) }), {});
  const overallPct = Math.round(Object.values(progress).reduce((a, b) => a + b, 0) / SUBJECTS.length);

  const filteredNotes = notes
    .filter(n => filterSubject === "all" || n.subject === filterSubject)
    .filter(n => !noteSearch || n.title.toLowerCase().includes(noteSearch.toLowerCase()) || n.body.toLowerCase().includes(noteSearch.toLowerCase()))
    .slice().reverse();

  const fmt = s => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const fmtMin = m => m === 0 ? "—" : m >= 60 ? `${Math.floor(m / 60)}s ${m % 60}d` : `${m}d`;

  const inputStyle = {
    background: "#1C1C28", border: "1px solid #2E2E42", color: "#E8E4DC",
    borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none",
    fontFamily: "'DM Sans', sans-serif", width: "100%"
  };
  const selectStyle = { ...inputStyle, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", background: "#13131E", color: "#E8E4DC", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #2E2E42; border-radius: 2px; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>

      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -200, right: -150, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, #C8A96E12 0%, transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: -150, left: -100, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #9B7BE812 0%, transparent 65%)" }} />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 1000,
          background: toast.type === "warn" ? "#C46B5A" : "#C8A96E",
          color: "#13131E", padding: "10px 22px", borderRadius: 10,
          fontWeight: 700, fontSize: 13, boxShadow: "0 8px 30px #0008",
          animation: "slideIn .25s ease"
        }}>{toast.msg}</div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "#000A", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 16, padding: 28, maxWidth: 320, textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Notu sil?</div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>Bu işlem geri alınamaz.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ ...inputStyle, width: "auto", padding: "8px 20px", cursor: "pointer", fontWeight: 600 }}>Vazgeç</button>
              <button onClick={doDelete} style={{ background: "#C46B5A", border: "none", color: "#fff", borderRadius: 10, padding: "8px 20px", fontWeight: 700, cursor: "pointer" }}>Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ position: "relative", zIndex: 1, padding: "28px 20px 0" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 4, color: "#C8A96E", fontWeight: 600, marginBottom: 6 }}>AKADEMİYE GİRİŞ SINAVI</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, lineHeight: 1.1, fontWeight: 400 }}>
                Hazırlık <span style={{ fontStyle: "italic", color: "#C8A96E" }}>Takibi</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {daysLeft !== null && (
                <div style={{ background: "#1C1C28", border: "1px solid #C8A96E40", borderRadius: 12, padding: "10px 16px", textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#C8A96E", lineHeight: 1 }}>{daysLeft}</div>
                  <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, marginTop: 2 }}>GÜN KALDI</div>
                </div>
              )}
              <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 12, padding: "10px 14px" }}>
                <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, marginBottom: 5 }}>SINAV TARİHİ</div>
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
                  style={{ background: "none", border: "none", color: "#E8E4DC", fontSize: 13, fontWeight: 600, outline: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }} />
              </div>
            </div>
          </div>

          {/* Overall progress bar */}
          <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 12, padding: "14px 18px", marginBottom: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "#888", fontWeight: 600, letterSpacing: 1 }}>GENEL HAZIRLIK</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#C8A96E" }}>%{overallPct}</span>
            </div>
            <div style={{ height: 6, background: "#0D0D18", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg, #C8A96E80, #C8A96E)", borderRadius: 4, transition: "width .8s ease" }} />
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ display: "flex", gap: 2, marginTop: 20, borderBottom: "1px solid #2E2E42" }}>
            {[["dashboard", "Genel Bakış"], ["study", "Çalışma"], ["notes", "Notlar"], ["progress", "İlerleme"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                background: tab === key ? "#C8A96E" : "none",
                color: tab === key ? "#13131E" : "#666",
                border: "none", borderRadius: "8px 8px 0 0",
                padding: "9px 16px", fontWeight: 700, fontSize: 12,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                letterSpacing: 0.3, transition: "all .2s"
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 1, padding: "24px 20px 60px", maxWidth: 700, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Toplam Çalışma", value: fmtMin(totalMins), sub: `${sessions.length} seans`, color: "#C8A96E" },
                { label: "Bu Hafta", value: fmtMin(weekMins), sub: "son 7 gün", color: "#7EB8D4" },
                { label: "Not Sayısı", value: notes.length || "—", sub: "ders notu", color: "#9B7BE8" },
                { label: "Hedef İlerleme", value: `%${overallPct}`, sub: "genel hazırlık", color: "#6BAF7E" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 14, padding: "18px 16px" }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Subject breakdown */}
            <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, fontWeight: 700, marginBottom: 18 }}>DERSE GÖRE ÇALIŞMA</div>
              {SUBJECTS.map(s => {
                const mins = subjectMins[s.id];
                const maxM = Math.max(...Object.values(subjectMins), 1);
                return (
                  <div key={s.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{s.icon} {s.label}</span>
                      <span style={{ fontSize: 12, color: "#666" }}>{fmtMin(mins)}</span>
                    </div>
                    <div style={{ height: 5, background: "#0D0D18", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(mins / maxM) * 100}%`, background: s.color, borderRadius: 3, transition: "width .6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent */}
            {sessions.length > 0 && (
              <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, fontWeight: 700, marginBottom: 14 }}>SON ÇALIŞMALAR</div>
                {sessions.slice(-6).reverse().map(sess => {
                  const sub = SUBJECTS.find(s => s.id === sess.subject);
                  return (
                    <div key={sess.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1E1E2E" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: sub.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{sub.icon}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{sub.label}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>{sess.date}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 700, color: sub.color, fontSize: 14 }}>{fmtMin(sess.minutes)}</span>
                        <button onClick={() => deleteSession(sess.id)} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 4 }}>×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STUDY */}
        {tab === "study" && (
          <div style={{ display: "grid", gap: 20 }}>
            {/* Timer */}
            <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 20, padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, fontWeight: 700, marginBottom: 20 }}>KRONOMETRE</div>
              <div style={{
                fontFamily: "'DM Serif Display', serif", fontSize: 56, color: "#C8A96E", letterSpacing: 4, marginBottom: 4,
                animation: timerActive ? "pulse 2s infinite" : "none"
              }}>{fmt(timerSeconds)}</div>
              {timerActive && <div style={{ fontSize: 11, color: "#666", marginBottom: 16 }}>Çalışıyorsun…</div>}
              {!timerActive && <div style={{ height: 20 }} />}
              <select value={timerSubject} onChange={e => setTimerSubject(e.target.value)}
                style={{ ...selectStyle, width: "auto", marginBottom: 20, padding: "8px 18px" }}>
                {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setTimerActive(!timerActive)} style={{
                  background: timerActive ? "#C46B5A" : "#C8A96E", color: "#13131E",
                  border: "none", borderRadius: 12, padding: "12px 36px",
                  fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                }}>{timerActive ? "⏸ Duraklat" : "▶ Başlat"}</button>
                {timerSeconds > 0 && (
                  <button onClick={stopAndSaveTimer} style={{
                    background: "#1E1E2E", color: "#888", border: "1px solid #2E2E42",
                    borderRadius: 12, padding: "12px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                  }}>✓ Kaydet</button>
                )}
              </div>
            </div>

            {/* Manual */}
            <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 20, padding: 24 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, fontWeight: 700, marginBottom: 18 }}>MANUEL EKLE</div>
              <div style={{ display: "grid", gap: 10 }}>
                <select value={sessionInput.subject} onChange={e => setSessionInput({ ...sessionInput, subject: e.target.value })} style={selectStyle}>
                  {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="number" placeholder="Dakika" value={sessionInput.minutes}
                    onChange={e => setSessionInput({ ...sessionInput, minutes: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }} />
                  <input type="date" value={sessionInput.date}
                    onChange={e => setSessionInput({ ...sessionInput, date: e.target.value })}
                    style={{ ...inputStyle, flex: 1 }} />
                </div>
                <button onClick={addSession} style={{
                  background: "#C8A96E", color: "#13131E", border: "none",
                  borderRadius: 12, padding: 12, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                }}>+ Çalışmayı Kaydet</button>
              </div>
            </div>
          </div>
        )}

        {/* NOTES */}
        {tab === "notes" && (
          <div>
            {/* Form */}
            <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 20, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, fontWeight: 700, marginBottom: 18 }}>
                {editingNote ? "📝 NOTU DÜZENLE" : "📝 YENİ NOT"}
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <select value={noteInput.subject} onChange={e => setNoteInput({ ...noteInput, subject: e.target.value })} style={selectStyle}>
                  {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                </select>
                <input placeholder="Konu / Başlık" value={noteInput.title}
                  onChange={e => setNoteInput({ ...noteInput, title: e.target.value })} style={inputStyle} />
                <textarea placeholder="Notlarını buraya yaz..." value={noteInput.body}
                  onChange={e => setNoteInput({ ...noteInput, body: e.target.value })}
                  rows={6}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={saveNote} style={{
                    flex: 1, background: "#C8A96E", color: "#13131E",
                    border: "none", borderRadius: 12, padding: 12,
                    fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                  }}>{editingNote ? "✓ Güncelle" : "+ Kaydet"}</button>
                  {editingNote && (
                    <button onClick={() => { setEditingNote(null); setNoteInput({ subject: "trk", title: "", body: "" }); }} style={{
                      background: "none", color: "#666", border: "1px solid #2E2E42",
                      borderRadius: 12, padding: "12px 18px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                    }}>İptal</button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter + search */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input placeholder="🔍 Not ara..." value={noteSearch} onChange={e => setNoteSearch(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 160, padding: "8px 12px" }} />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              <button onClick={() => setFilterSubject("all")} style={{
                background: filterSubject === "all" ? "#C8A96E" : "#1C1C28",
                color: filterSubject === "all" ? "#13131E" : "#666",
                border: "1px solid #2E2E42", borderRadius: 8,
                padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
              }}>Tümü ({notes.length})</button>
              {SUBJECTS.map(s => {
                const count = notes.filter(n => n.subject === s.id).length;
                return (
                  <button key={s.id} onClick={() => setFilterSubject(s.id)} style={{
                    background: filterSubject === s.id ? s.color + "22" : "#1C1C28",
                    color: filterSubject === s.id ? s.color : "#555",
                    border: `1px solid ${filterSubject === s.id ? s.color + "60" : "#2E2E42"}`,
                    borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                  }}>{s.icon} {count}</button>
                );
              })}
            </div>

            {filteredNotes.length === 0
              ? <div style={{ textAlign: "center", color: "#444", padding: 50, fontSize: 14 }}>Henüz not yok.</div>
              : filteredNotes.map(note => {
                const sub = SUBJECTS.find(s => s.id === note.subject);
                return (
                  <div key={note.id} style={{
                    background: "#1C1C28", border: "1px solid #2E2E42",
                    borderLeft: `3px solid ${sub.color}`, borderRadius: 14,
                    padding: "16px 18px", marginBottom: 12
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: sub.color, fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>{sub.icon} {sub.label.toUpperCase()}</div>
                        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, marginBottom: 8 }}>{note.title}</div>
                        {note.body && <div style={{ fontSize: 13, color: "#888", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{note.body}</div>}
                        <div style={{ fontSize: 10, color: "#444", marginTop: 10 }}>
                          {note.updated ? `Düzenlendi: ${note.updated}` : `Oluşturuldu: ${note.created}`}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginLeft: 12, flexShrink: 0 }}>
                        <button onClick={() => startEditNote(note)} style={{
                          background: "#2E2E42", border: "none", borderRadius: 8,
                          padding: "6px 10px", color: "#C8A96E", cursor: "pointer", fontSize: 14
                        }}>✏</button>
                        <button onClick={() => confirmDelete(note.id)} style={{
                          background: "#2E2E42", border: "none", borderRadius: 8,
                          padding: "6px 10px", color: "#C46B5A", cursor: "pointer", fontSize: 14
                        }}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* PROGRESS */}
        {tab === "progress" && (
          <div>
            <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 20, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, fontWeight: 700, marginBottom: 20 }}>KONU TAMAMLANMA</div>
              {SUBJECTS.map(s => (
                <div key={s.id} style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{s.icon} {s.label}</span>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: s.color }}>%{progress[s.id]}</span>
                  </div>
                  <div
                    style={{ height: 8, background: "#0D0D18", borderRadius: 5, cursor: "pointer", position: "relative" }}
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                      setProgress(prev => ({ ...prev, [s.id]: pct }));
                    }}
                    title="Tıklayarak ayarla"
                  >
                    <div style={{ height: "100%", width: `${progress[s.id]}%`, background: s.color, borderRadius: 5, transition: "width .3s ease" }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {[0, 25, 50, 75, 100].map(v => (
                      <button key={v} onClick={() => setProgress(prev => ({ ...prev, [s.id]: v }))} style={{
                        flex: 1, background: progress[s.id] >= v ? s.color + "25" : "#0D0D18",
                        border: `1px solid ${progress[s.id] >= v ? s.color + "70" : "#2E2E42"}`,
                        color: progress[s.id] >= v ? s.color : "#444",
                        borderRadius: 6, padding: "4px 0", fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif"
                      }}>{v}%</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary card */}
            <div style={{ background: "#1C1C28", border: "1px solid #2E2E42", borderRadius: 20, padding: 28, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 3, fontWeight: 700, marginBottom: 16 }}>GENEL DURUM</div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 64, color: "#C8A96E", lineHeight: 1 }}>%{overallPct}</div>
              <div style={{ height: 10, background: "#0D0D18", borderRadius: 6, margin: "20px 0 14px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg, #C8A96E60, #C8A96E)", borderRadius: 6, transition: "width .8s ease" }} />
              </div>
              <div style={{ fontSize: 13, color: "#555" }}>
                {overallPct < 25 ? "Sağlam bir başlangıç için kolları sıva! 💪" :
                  overallPct < 50 ? "İyi gidiyorsun, tempoyu koru! 🔥" :
                  overallPct < 75 ? "Yarıyı geçtin, harika! 🎯" :
                  overallPct < 100 ? "Finale yaklaşıyorsun! 🏅" : "Hazırlık tamamlandı! Başarılar! 🌟"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
