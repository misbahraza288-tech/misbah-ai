/* MISBAH AI — chhota sa safe markdown renderer (koi external library nahi) */
(function (global) {
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function inline(s) {
    // s is already escaped
    var codes = [];
    s = s.replace(/`([^`\n]+)`/g, function (_, c) { codes.push(c); return "\u0000" + (codes.length - 1) + "\u0000"; });
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return "<code>" + codes[+i] + "</code>"; });
    return s;
  }
  function isTableSep(line) { return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line); }
  function cells(line) {
    line = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return line.split("|").map(function (c) { return inline(c.trim()); });
  }
  function render(src) {
    src = String(src || "").replace(/\r\n?/g, "\n");
    var blocks = [];
    // fenced code
    src = src.replace(/```([\w+#.-]*)[^\n]*\n([\s\S]*?)(```|$)/g, function (_, lang, code) {
      blocks.push({ lang: lang || "code", code: code.replace(/\n$/, "") });
      return "\n\u0001" + (blocks.length - 1) + "\u0001\n";
    });
    var lines = esc(src).split("\n");
    var out = [], i = 0, para = [];
    function flush() { if (para.length) { out.push("<p>" + inline(para.join("<br>")) + "</p>"); para = []; } }
    while (i < lines.length) {
      var l = lines[i], m;
      if ((m = l.match(/^\u0001(\d+)\u0001$/))) {
        flush(); var b = blocks[+m[1]];
        out.push('<pre><span class="pre-head"><span>' + esc(b.lang) + '</span><button type="button" class="copy-code">Copy</button></span><code>' + esc(b.code) + "</code></pre>");
        i++; continue;
      }
      if (!l.trim()) { flush(); i++; continue; }
      if ((m = l.match(/^(#{1,6})\s+(.*)$/))) { flush(); var n = Math.min(m[1].length + 1, 4); out.push("<h" + n + ">" + inline(m[2]) + "</h" + n + ">"); i++; continue; }
      if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(l)) { flush(); out.push("<hr>"); i++; continue; }
      if (/^&gt;\s?/.test(l)) {
        flush(); var q = [];
        while (i < lines.length && /^&gt;\s?/.test(lines[i])) { q.push(lines[i].replace(/^&gt;\s?/, "")); i++; }
        out.push("<blockquote>" + inline(q.join("<br>")) + "</blockquote>"); continue;
      }
      if (l.indexOf("|") !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        flush(); var head = cells(l); i += 2; var rows = [];
        while (i < lines.length && lines[i].indexOf("|") !== -1 && lines[i].trim()) { rows.push(cells(lines[i])); i++; }
        out.push("<table><thead><tr>" + head.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
          rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>");
        continue;
      }
      if (/^\s*([-*+•])\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l)) {
        flush(); var ordered = /^\s*\d+[.)]\s+/.test(l), items = [];
        while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*([-*+•])\s+/).test(lines[i])) {
          items.push(inline(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*([-*+•])\s+/, ""))); i++;
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*+•]|\d+[.)])\s+/.test(lines[i])) { items[items.length - 1] += "<br>" + inline(lines[i].trim()); i++; }
        }
        var tag = ordered ? "ol" : "ul";
        out.push("<" + tag + ">" + items.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</" + tag + ">");
        continue;
      }
      para.push(l); i++;
    }
    flush();
    return out.join("");
  }
  global.MD = { render: render, escape: esc };
  if (typeof module !== "undefined") module.exports = global.MD;
})(typeof window !== "undefined" ? window : globalThis);
