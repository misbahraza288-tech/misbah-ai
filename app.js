/* MISBAH AI — app logic. Sab data sirf is browser ke localStorage mein. Koi key code mein nahi. */
(function () {
  "use strict";
  var API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
  var KEY_URL = "https://aistudio.google.com/apikey";
  var LS = {
    key: "mai.key", model: "mai.model", accent: "mai.accent", voice: "mai.voiceLang",
    agent: "mai.agent", custom: "mai.agents.custom", notes: "mai.notes", todos: "mai.todos",
    chat: function (id) { return "mai.chat." + id; }
  };
  var DEFAULT_MODEL = "gemini-3.5-flash-lite";
  var MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];

  var BASE_RULES = " Tumhara naam MISBAH AI hai, Misbah ka personal AI assistant. Misbah Jharkhand (India) ka Class 12 student hai. " +
    "Default: Hinglish (Roman Hindi + English) mein, dost jaisa friendly tone, short aur clear jawab. Jab user English ya Hindi (Devanagari) mein likhe to usi mein jawab do. " +
    "Markdown use karo (headings, bullet points, **bold**, code blocks) jab samjhane mein madad mile. Galat ya bana-banaya fact mat do — pata na ho to seedha bolo.";

  var AGENTS = [
    { id: "study", emoji: "🎓", name: "Study Guru", desc: "JAC Class 12 ka ustaad — PCB, Maths, CS",
      prompt: "Tum 'Study Guru' ho — JAC (Jharkhand Academic Council) Class 12 board ke expert teacher. Subjects: Physics, Chemistry, Biology, Maths, Computer Science (C++/Python, SQL). " +
        "Har concept step-by-step simple Hinglish mein samjhao, real-life example do, formulas clearly likho, numericals ko steps mein solve karo. " +
        "Jahan kaam aaye wahan batao ki board exam mein kaise likhna hai (marks ke hisaab se), important points aur common mistakes. Answer ke end mein 1 chhota practice question do jab sahi lage." },
    { id: "code", emoji: "💻", name: "Code Bhai", desc: "PHP, Python, HTML/CSS/JS — bugs ka dushman",
      prompt: "Tum 'Code Bhai' ho — ek senior developer jo PHP, Python, HTML, CSS, JavaScript, MySQL aur web development mein expert hai. " +
        "Beginner-friendly Hinglish mein samjhao. Hamesha poora working code do proper code block mein (language ke naam ke saath), phir chhota sa explanation. " +
        "Bug ho to pehle reason batao, phir fixed code. Security (SQL injection, XSS, passwords) ka dhyan rakho aur best practice batao. Free tools/hosting suggest karo jab pucha jaye." },
    { id: "shop", emoji: "🛍️", name: "Shop Bot Writer", desc: "Dukaan ke WhatsApp replies, menu, offers",
      prompt: "Tum 'Shop Bot Writer' ho — local dukaan (kirana, mobile shop, cafe, kapde, medical, etc.) ke liye WhatsApp messages likhne ke expert. " +
        "Customer replies, rate list/menu, offer/festival messages, order confirm, payment reminder, auto-reply aur WhatsApp Business ke quick replies likho. " +
        "Style: polite, short, emoji ke saath, Hinglish (ya jo bhasha user maange). Ready-to-copy text do, aur zarurat ho to 2-3 variations. Price ya details na pata ho to [ ] placeholder chhodo." },
    { id: "caption", emoji: "👑", name: "Caption King", desc: "Reels captions, hashtags, hooks 🔥",
      prompt: "Tum 'Caption King' ho — Instagram Reels, YouTube Shorts aur WhatsApp status ke liye viral captions likhne wale expert. " +
        "Har request pe: 5 catchy captions (alag-alag vibe: attitude, funny, emotional, motivational, desi), 1 strong hook line, aur 15-20 relevant hashtags (mix of popular + niche + Hindi). " +
        "Hinglish, trendy, emoji wala style. Captions chhote aur punchy rakho." }
  ];

  var ACCENTS = [
    ["#00f0ff", "#b14bff"], ["#ff2fa0", "#7b2bff"], ["#39ff88", "#00b3ff"],
    ["#ffb300", "#ff3d6e"], ["#ff4040", "#ff9a00"], ["#c6ff00", "#00e5c3"]
  ];

  /* ---------- storage helpers ---------- */
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast("Storage full hai — kuch purani chat saaf karo"); } }
  function getKey() { try { return (localStorage.getItem(LS.key) || "").trim(); } catch (e) { return ""; } }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  var toastTimer;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function copyText(text, btn) {
    function done() { if (btn) { var o = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(function () { btn.textContent = o; }, 1400); } toast("Copy ho gaya ✅"); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Copy nahi hua"); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- agents ---------- */
  function allAgents() { return AGENTS.concat(get(LS.custom, []).map(function (a) { a.custom = true; return a; })); }
  function findAgent(id) { var l = allAgents(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return AGENTS[0]; }
  var current = findAgent(get(LS.agent, "study"));

  function selectAgent(id) {
    current = findAgent(id); set(LS.agent, current.id);
    $("pillEmoji").textContent = current.emoji || "🤖";
    $("pillName").textContent = current.name;
    $("pillDesc").textContent = current.desc || "Custom agent";
    renderChat(); renderAgents();
  }

  function renderAgents() {
    var g = $("agentGrid"); g.innerHTML = "";
    allAgents().forEach(function (a) {
      var c = el("button", "agent-card" + (a.id === current.id ? " current" : ""));
      c.type = "button";
      c.appendChild(el("span", "ae", a.emoji || "🤖"));
      c.appendChild(el("b", null, a.name));
      c.appendChild(el("small", null, a.desc || "Custom agent"));
      if (a.id === current.id) c.appendChild(el("span", "badge", "ACTIVE"));
      c.addEventListener("click", function () { selectAgent(a.id); go("chat"); });
      if (a.custom) {
        var d = el("span", "del", "🗑"); d.setAttribute("role", "button"); d.setAttribute("aria-label", a.name + " delete karo"); d.tabIndex = 0;
        d.addEventListener("click", function (ev) {
          ev.stopPropagation();
          if (!confirm('"' + a.name + '" agent delete karein? Uski chat bhi hat jayegi.')) return;
          set(LS.custom, get(LS.custom, []).filter(function (x) { return x.id !== a.id; }));
          localStorage.removeItem(LS.chat(a.id));
          if (current.id === a.id) selectAgent("study"); else renderAgents();
          toast("Agent delete ho gaya");
        });
        c.appendChild(d);
      }
      g.appendChild(c);
    });
  }

  $("caSave").addEventListener("click", function () {
    var name = $("caName").value.trim(), prompt = $("caPrompt").value.trim(), emoji = $("caEmoji").value.trim() || "🤖";
    if (!name) { toast("Agent ka naam likho"); $("caName").focus(); return; }
    if (prompt.length < 10) { toast("Thodi detail mein instructions likho"); $("caPrompt").focus(); return; }
    var list = get(LS.custom, []);
    var a = { id: "c_" + uid(), name: name, emoji: emoji, desc: prompt.slice(0, 60) + (prompt.length > 60 ? "…" : ""), prompt: prompt };
    list.push(a); set(LS.custom, list);
    $("caName").value = ""; $("caPrompt").value = ""; $("caEmoji").value = "";
    toast(name + " ready hai 🔥"); selectAgent(a.id); go("chat");
  });

  /* ---------- sheet ---------- */
  function openSheet() {
    var l = $("sheetList"); l.innerHTML = "";
    allAgents().forEach(function (a) {
      var b = el("button", "sheet-item" + (a.id === current.id ? " current" : "")); b.type = "button";
      b.appendChild(el("span", "agent-emoji", a.emoji || "🤖"));
      var m = el("span", "agent-meta"); m.appendChild(el("b", null, a.name)); m.appendChild(el("small", null, a.desc || "Custom agent")); b.appendChild(m);
      b.addEventListener("click", function () { selectAgent(a.id); closeSheet(); });
      l.appendChild(b);
    });
    var add = el("button", "sheet-item", "➕  Naya custom agent banao"); add.type = "button";
    add.addEventListener("click", function () { closeSheet(); go("agents"); setTimeout(function () { $("customForm").scrollIntoView({ behavior: "smooth" }); $("caName").focus(); }, 320); });
    l.appendChild(add);
    $("sheetBackdrop").hidden = false; $("agentSheet").hidden = false;
  }
  function closeSheet() { $("sheetBackdrop").hidden = true; $("agentSheet").hidden = true; }
  $("agentPill").addEventListener("click", openSheet);
  $("sheetBackdrop").addEventListener("click", closeSheet);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  /* ---------- navigation ---------- */
  function go(view) {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + view); });
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t.dataset.view === view); });
    document.body.classList.toggle("on-chat", view === "chat");
    if (view === "settings") loadSettings();
    if (view === "chat") scrollDown();
  }
  document.querySelectorAll(".tab").forEach(function (t) { t.addEventListener("click", function () { go(t.dataset.view); }); });

  /* ---------- chat ---------- */
  var busy = false;
  function history() { return get(LS.chat(current.id), []); }
  function saveHistory(h) { set(LS.chat(current.id), h.slice(-200)); }
  function scrollDown() { var v = $("view-chat"); requestAnimationFrame(function () { v.scrollTop = v.scrollHeight; }); }

  var SUGGEST = {
    study: ["Ohm's law simple mein samjhao", "Integration by parts ka trick", "Mitosis vs Meiosis table"],
    code: ["PHP login form secure kaise banaye", "Python mein to-do app", "CSS se neon button"],
    shop: ["Kirana dukaan ka Diwali offer message", "Mobile shop ki rate list", "Order confirm ka reply"],
    caption: ["Gym reel ke captions", "Dosto ke saath trip reel", "Attitude status caption"]
  };

  function noKeyCard() {
    var box = el("div", "nokey");
    box.appendChild(el("h3", null, "🔑 Pehle apni FREE Gemini key daalo"));
    var ol = el("ol");
    ["Neeche 'Free key lo' dabao, Google se login karo", "'Create API key' dabao aur key copy karo", "Settings mein paste karke Save karo — bas!"].forEach(function (s) { ol.appendChild(el("li", null, s)); });
    box.appendChild(ol);
    var row = el("div", "row");
    var a = el("a", "btn primary", "✨ Free key lo"); a.href = KEY_URL; a.target = "_blank"; a.rel = "noopener";
    var b = el("button", "btn ghost", "⚙️ Settings kholo"); b.type = "button"; b.addEventListener("click", function () { go("settings"); setTimeout(function () { $("keyInput").focus(); }, 320); });
    row.appendChild(a); row.appendChild(b); box.appendChild(row);
    return box;
  }

  function renderChat() {
    var m = $("messages"); m.innerHTML = "";
    var h = history();
    if (!h.length) {
      var hero = el("div", "hero");
      var orb = el("div", "hero-orb"); orb.appendChild(el("span", null, current.emoji || "🤖")); hero.appendChild(orb);
      hero.appendChild(el("h2", null, current.name));
      hero.appendChild(el("p", null, getKey() ? "Bolo boss, aaj kya karna hai? 😎" : "Tumhara apna AI — bas ek free key door 🔥"));
      m.appendChild(hero);
      if (!getKey()) m.appendChild(noKeyCard());
      var chips = el("div", "chips");
      (SUGGEST[current.id] || ["Mujhe kya-kya kar sakte ho?", "Ek idea do", "Motivate karo"]).forEach(function (s) {
        var c = el("button", "chip", s); c.type = "button";
        c.addEventListener("click", function () { $("input").value = s; send(); });
        chips.appendChild(c);
      });
      m.appendChild(chips);
    } else {
      h.forEach(function (msg) { addBubble(msg.role, msg.text, msg.err); });
      scrollDown();
      return;
    }
    $("view-chat").scrollTop = 0;
  }

  function addBubble(role, text, isErr) {
    var m = $("messages");
    var b = el("div", "msg " + (role === "user" ? "user" : "bot") + (isErr ? " err" : ""));
    if (role === "user") b.textContent = text;
    else {
      b.innerHTML = MD.render(text);
      b.querySelectorAll(".copy-code").forEach(function (btn) {
        btn.addEventListener("click", function () { copyText(btn.parentNode.nextSibling.textContent, btn); });
      });
      if (isErr === "nokey" && !getKey()) b.appendChild(noKeyCard());
      if (!isErr) {
        var act = el("div", "msg-actions");
        var cp = el("button", null, "📋 Copy"); cp.type = "button";
        cp.addEventListener("click", function () { copyText(text, cp); });
        act.appendChild(cp); b.appendChild(act);
      }
    }
    m.appendChild(b); scrollDown();
    return b;
  }

  function friendlyError(status, body) {
    var e = (body && body.error) || {}, msg = e.message || "", st = e.status || "";
    var reason = "";
    try { (e.details || []).forEach(function (d) { if (d.reason) reason = d.reason; }); } catch (x) {}
    if (reason === "API_KEY_INVALID" || /API key not valid|API_KEY_INVALID/i.test(msg))
      return "❌ **Key galat hai bhai.** Settings mein dobara sahi key paste karo (poori copy karna, 'AIza...' se shuru hoti hai).\n\nNayi key: " + KEY_URL;
    if (status === 403 || st === "PERMISSION_DENIED")
      return "⛔ **Is key ko permission nahi hai.** AI Studio se nayi key banao aur Settings mein daalo.\n\n" + KEY_URL + "\n\n`" + msg.slice(0, 160) + "`";
    if (status === 429 || st === "RESOURCE_EXHAUSTED")
      return (get(LS.model, DEFAULT_MODEL) === "gemini-3.5-flash-lite")
        ? "⏳ **Free limit abhi khatam ho gayi.** 1-2 minute ruk ke try karo. Din ki limit poori ho gayi ho to kal fir se chalega, ya Settings mein dusra model try karo."
        : "⏳ **Is model ki free limit khatam.** Settings → AI Model mein **Gemini 3.5 Flash-Lite** chuno — usme roz kaafi zyada free messages milte hain.";
    if (status === 404 || st === "NOT_FOUND")
      return "🤔 **Ye model abhi available nahi hai.** Settings → AI Model mein dusra model chuno.";
    if (status === 400 && /location|region|country/i.test(msg))
      return "🌍 Google bol raha hai ye service tumhare region mein nahi chal rahi: `" + msg.slice(0, 160) + "`";
    if (status >= 500)
      return "🛠️ Google ke server pe abhi dikkat hai (" + status + "). 1 minute baad dobara try karo.";
    return "⚠️ Kuch gadbad hui (" + status + "): `" + (msg || "unknown error").slice(0, 200) + "`";
  }

  function buildRequest(hist) {
    // Gemini REST: contents[] with role "user" / "model"; system prompt in systemInstruction.
    var contents = hist.filter(function (x) { return !x.err; }).slice(-30).map(function (x) {
      return { role: x.role === "user" ? "user" : "model", parts: [{ text: x.text }] };
    });
    while (contents.length && contents[0].role !== "user") contents.shift();
    // same role ke lagatar messages ek mein jod do (error ke baad dobara bheje gaye sawal)
    var merged = [];
    contents.forEach(function (c) {
      var last = merged[merged.length - 1];
      if (last && last.role === c.role) last.parts[0].text += "\n\n" + c.parts[0].text;
      else merged.push(c);
    });
    contents = merged;
    return {
      systemInstruction: { parts: [{ text: current.prompt + BASE_RULES }] },
      contents: contents,
      generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
    };
  }

  function callGemini(key, model, body) {
    return fetch(API_BASE + encodeURIComponent(model) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.text().then(function (t) {
        var data = null; try { data = JSON.parse(t); } catch (e) {}
        if (!res.ok) { var err = new Error("http"); err.status = res.status; err.body = data; throw err; }
        return data;
      });
    });
  }

  function extractText(data) {
    if (!data) return "";
    if (data.promptFeedback && data.promptFeedback.blockReason && !(data.candidates && data.candidates.length))
      return "🚫 Ye sawal Google ki safety policy ne block kar diya. Thoda alag tareeke se poocho.";
    var c = (data.candidates || [])[0];
    if (!c) return "";
    var parts = (c.content && c.content.parts) || [];
    var text = parts.filter(function (p) { return p.text && !p.thought; }).map(function (p) { return p.text; }).join("");
    if (!text && c.finishReason === "SAFETY") return "🚫 Safety filter ne jawab rok diya. Sawal thoda badal ke poocho.";
    if (c.finishReason === "MAX_TOKENS" && text) text += "\n\n_(jawab lamba tha, yahin kat gaya — 'aage likho' bolo)_";
    return text;
  }

  function setBusy(b) { busy = b; $("sendBtn").disabled = b; $("statusLine").textContent = b ? "Soch raha hoon... 🧠" : "Ready hai boss ⚡"; }

  function send() {
    if (busy) return;
    var input = $("input"), text = input.value.trim();
    if (!text) { input.focus(); return; }
    var h = history();
    if (!h.length) $("messages").innerHTML = "";
    h.push({ role: "user", text: text, t: Date.now() }); saveHistory(h);
    addBubble("user", text);
    input.value = ""; autosize();
    var key = getKey();
    if (!key) {
      var msg = "Bhai, abhi tak koi API key nahi dali 😅 Bina key ke main jawab nahi de sakta.";
      h.push({ role: "model", text: msg, err: "nokey", t: Date.now() }); saveHistory(h);
      addBubble("model", msg, "nokey");
      return;
    }
    setBusy(true);
    var typing = el("div", "msg bot typing"); typing.innerHTML = "<i></i><i></i><i></i>"; $("messages").appendChild(typing); scrollDown();
    var model = get(LS.model, DEFAULT_MODEL); if (MODELS.indexOf(model) === -1) model = DEFAULT_MODEL;
    var agentAtSend = current.id;
    callGemini(key, model, buildRequest(h)).then(function (data) {
      var reply = extractText(data) || "🤐 Khali jawab aaya. Dobara try karo.";
      var hh = get(LS.chat(agentAtSend), []); hh.push({ role: "model", text: reply, t: Date.now() }); set(LS.chat(agentAtSend), hh.slice(-200));
      typing.remove(); if (current.id === agentAtSend) addBubble("model", reply);
    }).catch(function (err) {
      var m = err && err.message === "http" ? friendlyError(err.status, err.body)
        : "📡 **Internet ya connection problem.** Net check karo aur dobara bhejo.";
      var hh = get(LS.chat(agentAtSend), []); hh.push({ role: "model", text: m, err: true, t: Date.now() }); set(LS.chat(agentAtSend), hh.slice(-200));
      typing.remove(); if (current.id === agentAtSend) addBubble("model", m, true);
    }).then(function () { setBusy(false); });
  }

  function autosize() { var i = $("input"); i.style.height = "auto"; i.style.height = Math.min(i.scrollHeight, 140) + "px"; }
  $("input").addEventListener("input", autosize);
  $("input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) { e.preventDefault(); send(); }
  });
  $("composer").addEventListener("submit", function (e) { e.preventDefault(); send(); });
  $("newChatBtn").addEventListener("click", function () {
    if (!history().length) { go("chat"); return; }
    if (confirm(current.name + " ki chat saaf karke nayi shuru karein?")) { localStorage.removeItem(LS.chat(current.id)); renderChat(); go("chat"); toast("Nayi chat ✨"); }
  });

  /* ---------- voice ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false;
  $("micBtn").addEventListener("click", function () {
    if (!SR) { toast("Is browser mein voice support nahi — Chrome use karo 🎤"); return; }
    if (listening && rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = get(LS.voice, "hi-IN"); rec.interimResults = true; rec.continuous = false;
    var base = $("input").value ? $("input").value.trim() + " " : "";
    rec.onstart = function () { listening = true; $("micBtn").classList.add("listening"); toast("Bolo... sun raha hoon 🎤"); };
    rec.onresult = function (e) {
      var t = ""; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      $("input").value = base + t; autosize();
    };
    rec.onerror = function (e) {
      toast(e.error === "not-allowed" ? "Mic ki permission do (browser settings)" : e.error === "no-speech" ? "Kuch suna nahi, dobara bolo" : "Voice error: " + e.error);
    };
    rec.onend = function () { listening = false; $("micBtn").classList.remove("listening"); };
    try { rec.start(); } catch (x) { toast("Mic start nahi hua"); }
  });

  /* ---------- todo + notes ---------- */
  function renderTodos() {
    var list = get(LS.todos, []), ul = $("todoList"); ul.innerHTML = "";
    list.forEach(function (t) {
      var li = el("li", "todo" + (t.done ? " done" : ""));
      var cb = el("input"); cb.type = "checkbox"; cb.checked = !!t.done; cb.setAttribute("aria-label", t.text);
      cb.addEventListener("change", function () { var l = get(LS.todos, []); l.forEach(function (x) { if (x.id === t.id) x.done = cb.checked; }); set(LS.todos, l); renderTodos(); });
      var x = el("button", "x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Delete");
      x.addEventListener("click", function () { set(LS.todos, get(LS.todos, []).filter(function (y) { return y.id !== t.id; })); renderTodos(); });
      li.appendChild(cb); li.appendChild(el("span", null, t.text)); li.appendChild(x); ul.appendChild(li);
    });
    $("todoEmpty").hidden = list.length > 0;
  }
  $("todoForm").addEventListener("submit", function (e) {
    e.preventDefault(); var v = $("todoInput").value.trim(); if (!v) return;
    var l = get(LS.todos, []); l.unshift({ id: uid(), text: v, done: false }); set(LS.todos, l); $("todoInput").value = ""; renderTodos();
  });
  function renderNotes() {
    var list = get(LS.notes, []), box = $("noteList"); box.innerHTML = "";
    list.forEach(function (n) {
      var d = el("div", "note glass"); d.appendChild(document.createTextNode(n.text));
      var tm = el("time", null, new Date(n.ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })); d.appendChild(tm);
      var x = el("button", "x", "✕"); x.type = "button"; x.setAttribute("aria-label", "Note delete karo");
      x.addEventListener("click", function () { set(LS.notes, get(LS.notes, []).filter(function (y) { return y.id !== n.id; })); renderNotes(); });
      d.appendChild(x); box.appendChild(d);
    });
    $("noteEmpty").hidden = list.length > 0;
  }
  $("noteForm").addEventListener("submit", function (e) {
    e.preventDefault(); var v = $("noteInput").value.trim(); if (!v) return;
    var l = get(LS.notes, []); l.unshift({ id: uid(), text: v, ts: Date.now() }); set(LS.notes, l); $("noteInput").value = ""; renderNotes(); toast("Note save ✅");
  });
  document.querySelectorAll("#view-notes .seg-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll("#view-notes .seg-btn").forEach(function (x) { x.classList.toggle("active", x === b); x.setAttribute("aria-selected", x === b); });
      $("seg-todo").classList.toggle("active", b.dataset.seg === "todo");
      $("seg-notes").classList.toggle("active", b.dataset.seg === "notes");
    });
  });

  /* ---------- settings ---------- */
  function applyAccent(i) {
    var a = ACCENTS[i] || ACCENTS[0];
    document.documentElement.style.setProperty("--accent", a[0]);
    document.documentElement.style.setProperty("--accent2", a[1]);
  }
  function loadSettings() {
    var k = getKey();
    $("keyInput").value = k;
    var ks = $("keyStatus");
    ks.className = "key-status" + (k ? " ok" : "");
    ks.textContent = k ? "✅ Key saved hai (sirf is phone mein)" : "Abhi koi key nahi hai";
    $("modelSelect").value = get(LS.model, DEFAULT_MODEL);
    var sw = $("swatches"); sw.innerHTML = ""; var cur = get(LS.accent, 0);
    ACCENTS.forEach(function (a, i) {
      var b = el("button", "sw" + (i === cur ? " active" : "")); b.type = "button";
      b.style.background = "linear-gradient(135deg," + a[0] + "," + a[1] + ")"; b.setAttribute("aria-label", "Theme color " + (i + 1));
      b.addEventListener("click", function () { set(LS.accent, i); applyAccent(i); loadSettings(); });
      sw.appendChild(b);
    });
    var vl = get(LS.voice, "hi-IN");
    document.querySelectorAll("#voiceSeg .seg-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.lang === vl); });
  }
  document.querySelectorAll("#voiceSeg .seg-btn").forEach(function (b) {
    b.addEventListener("click", function () { set(LS.voice, b.dataset.lang); loadSettings(); toast("Voice: " + b.textContent); });
  });
  $("keyShow").addEventListener("click", function () { var i = $("keyInput"); i.type = i.type === "password" ? "text" : "password"; });
  $("keySave").addEventListener("click", function () {
    var k = $("keyInput").value.trim().replace(/\s+/g, "");
    if (!k) { localStorage.removeItem(LS.key); loadSettings(); renderChat(); toast("Key hata di"); return; }
    if (k.length < 20) { $("keyStatus").className = "key-status bad"; $("keyStatus").textContent = "❌ Ye key bahut chhoti lag rahi hai — poori copy karo"; return; }
    localStorage.setItem(LS.key, k); loadSettings(); renderChat(); toast("Key save ho gayi 🔐");
  });
  $("keyTest").addEventListener("click", function () {
    var k = $("keyInput").value.trim().replace(/\s+/g, "");
    var ks = $("keyStatus");
    if (!k) { ks.className = "key-status bad"; ks.textContent = "Pehle key paste karo"; return; }
    ks.className = "key-status"; ks.textContent = "Test ho raha hai...";
    var model = $("modelSelect").value || DEFAULT_MODEL;
    callGemini(k, model, { contents: [{ role: "user", parts: [{ text: "Reply with just: OK" }] }], generationConfig: { maxOutputTokens: 20 } })
      .then(function () { ks.className = "key-status ok"; ks.textContent = "✅ Key kaam kar rahi hai! Save dabao."; })
      .catch(function (err) {
        ks.className = "key-status bad";
        ks.textContent = err && err.message === "http" ? friendlyError(err.status, err.body).replace(/\*\*|`/g, "").split("\n")[0] : "📡 Internet check karo";
      });
  });
  $("modelSelect").addEventListener("change", function () { set(LS.model, $("modelSelect").value); toast("Model badal gaya 🧠"); });
  $("clearChat").addEventListener("click", function () {
    if (confirm(current.name + " ki saari chat delete karein?")) { localStorage.removeItem(LS.chat(current.id)); renderChat(); toast("Chat saaf ✨"); }
  });
  $("clearAll").addEventListener("click", function () {
    if (!confirm("Sab kuch delete? (key, chats, notes, to-do, custom agents)")) return;
    Object.keys(localStorage).forEach(function (k) { if (k.indexOf("mai.") === 0) localStorage.removeItem(k); });
    applyAccent(0); current = AGENTS[0]; selectAgent("study"); renderTodos(); renderNotes(); loadSettings(); toast("Sab saaf ho gaya 🧹");
  });

  /* ---------- boot ---------- */
  applyAccent(get(LS.accent, 0));
  selectAgent(current.id);
  renderTodos(); renderNotes();
  go("chat");
  window.MisbahAI = { buildRequest: buildRequest, friendlyError: friendlyError, extractText: extractText, API_BASE: API_BASE };
})();
