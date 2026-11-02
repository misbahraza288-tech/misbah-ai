# ⚡ MISBAH AI

**Mera apna AI assistant — bawal style mein 🔥**

👉 **Live app:** https://misbahraza288-tech.github.io/misbah-ai/

Phone pe kholo, "Add to Home screen" karo — bilkul app jaisa chalega.

---

## 🤖 Ye kya hai?

MISBAH AI ek stylish (dark + neon) AI chat app hai jo **Google Gemini** ki free AI se chalti hai. Isme:

- 💬 **AI Chat** — kuch bhi poocho, Hinglish mein jawab
- 🧑‍🏫 **Agents** — har kaam ka alag expert:
  - 🎓 **Study Guru** — JAC Class 12 (Physics, Chemistry, Biology, Maths, CS) Hinglish mein samjhata hai
  - 💻 **Code Bhai** — PHP, Python, HTML/CSS/JS help
  - 🛍️ **Shop Bot Writer** — dukaan ke WhatsApp replies, rate list, offers
  - 👑 **Caption King** — reels captions + hashtags
  - ➕ **Custom Agent** — apna khud ka agent banao (naam + instructions)
- 🗂️ Har agent ki **chat alag save** hoti hai
- 📋 Har jawab pe **Copy** button, code blocks ke liye alag copy
- 🎤 **Voice input** — bol ke likho (Hindi / English) — Chrome mein best chalta hai
- 📝 **Notes + ✅ To-do** list
- 🎨 **Theme color** badlo (6 neon colors)

## 🔑 Free Gemini API key kaise lein (2 minute)

1. Ye link kholo: **https://aistudio.google.com/apikey**
2. Apne Gmail se login karo
3. **"Create API key"** dabao → key copy karo (`AIza...` se shuru hoti hai)
4. MISBAH AI kholo → **Settings** → key paste karo → **Save key**
5. **Test karo** dabake check kar lo ✅ — bas, ab chat karo!

## 🔐 Key safe hai?

**Haan.** Tumhari key **sirf tumhare phone ke browser** (localStorage) mein save hoti hai.
- Ye repo mein ya kisi server pe **kabhi upload nahi hoti**
- App seedha tumhare phone se Google ke Gemini server se baat karti hai
- Key kisi ko mat bhejna, screenshot mein mat dikhana
- Kabhi key leak ho jaye to AI Studio mein jaake delete karke nayi bana lo

> ⚠️ Is repo mein kabhi bhi koi API key ya password commit mat karna — ye repo **public** hai.

## 📱 Kaise use karein

| Kya karna hai | Kahan |
|---|---|
| Chat karna | 💬 Chat tab → neeche likho ya 🎤 dabao |
| Agent badalna | Chat ke upar agent wale button pe tap karo |
| Naya agent banana | 🤖 Agents → "Apna Custom Agent banao" |
| Nayi chat | Upar ➕ button |
| Notes / To-do | 📝 Notes tab |
| Key, model, color, data delete | ⚙️ Settings |

## 🧠 Models

- **Gemini 3.5 Flash-Lite** (default) — fast, free mein roz zyada messages
- **Gemini 3.8 Flash** — sabse smart, par free mein roz kam messages
- **Flash Latest** — Google ka latest flash model

"Free limit khatam" aaye to thoda ruko ya Settings mein dusra model chuno.

## 🛠️ Tech

Pure HTML + CSS + JavaScript — koi build step nahi, koi server nahi. GitHub Pages pe free host.
Files: `index.html`, `styles.css`, `app.js` (logic), `md.js` (markdown).
Gemini REST API: `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent` (header `x-goog-api-key`).

---

Made for **Misbah** 🔥
