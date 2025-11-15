# 🧩 Code Formatter – by U:Bodigat

Ein moderner, sicherer und blitzschneller Code-Formatter für **HTML, CSS, JS, JSON & SCSS**.  
Basierend auf [js-beautify](https://github.com/beautify-web/js-beautify) – vollständig überarbeitet mit neuem Sicherheits-Layer und sauberem TypeScript-Code.

---

## ✨ Features

✅ Formatierung über Tastenkürzel  
✅ Auto-Format beim Speichern  
✅ Eigene lokale `formatter.json` pro Projekt  
✅ Unterstützung für HTML, CSS, JS, JSON & SCSS  
✅ Sichere JSON5-Konfiguration (keine Codeausführung)  
✅ Erweiterte js-beautify Defaults für moderne JS-Syntax  

---

## ⚙️ Verwendung

**1️⃣ Manuell formatieren:**  
`Alt + Shift + F` oder `F1` → „Beautify Document“

**2️⃣ Automatisch beim Speichern:**  
Im Config-File `onSave: true` aktivieren

**3️⃣ Eigene Konfiguration:**  
`F1` → „Create Local Config“  
→ Datei `.vscode/formatter.json` wird erstellt

---

## 🛠️ Beispiel-Konfiguration (`formatter.json`)

```json5
{
  "onSave": true,
  "html": {
    "indent_size": 2,
    "max_preserve_newlines": 2
  },
  "css": {
    "indent_size": 2,
    "newline_between_rules": true
  },
  "javascript": {
    "indent_size": 2,
    "preserve_newlines": true
  }
}
```

## License and Credits

This project is based on the original [JS-CSS-HTML Formatter by Lonefy](https://github.com/Lonefy/vscode-JS-CSS-HTML-formatter),
licensed under the MIT License.

Modified and updated for 2025 by **U:Bodigat**.
