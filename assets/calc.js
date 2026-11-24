/*
 * AQL inspection logger — page wiring only.
 * Every sample size and every accept/reject number comes from assets/aql.js,
 * which holds the ANSI/ASQ Z1.4 (ISO 2859-1) tables. Nothing here computes,
 * rounds or interpolates an acceptance number. No dependencies, no network.
 */
(function () {
  "use strict";

  var AQL = window.AQL;

  var STORE_KEY = "omsme-aql-log";
  var ENTRY_VERSION = 1;
  var DEFAULTS = { level: "II", critical: 0, major: 2.5, minor: 4 };
  var MAX_ENTRIES = 200;

  var level = DEFAULTS.level;
  var history = [];

  function byId(id) { return document.getElementById(id); }

  var INT = (function () {
    try {
      return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
    } catch (e) { return null; }
  })();

  function num(n) {
    if (typeof n !== "number" || !isFinite(n)) { return "—"; }
    return INT ? INT.format(n) : String(n);
  }

  /* AQL columns are printed with a fixed number of decimals in the standard. */
  function aqlLabel(v) {
    if (v === AQL.ZERO_TOLERANCE) { return "0"; }
    if (v === 0.065) { return "0.065"; }
    if (v < 1) { return v.toFixed(2); }
    if (v < 10) { return v.toFixed(1); }
    return String(v);
  }

  /* Read a count field: empty, blank or junk -> 0; negatives clamped to 0. */
  function count(id) {
    var el = byId(id);
    if (!el) { return 0; }
    var v = parseFloat(el.value);
    if (!isFinite(v) || v < 0) { return 0; }
    return Math.floor(v);
  }

  function selected(id) {
    var el = byId(id);
    if (!el) { return 0; }
    var v = parseFloat(el.value);
    return isFinite(v) ? v : 0;
  }

  function text(id) {
    var el = byId(id);
    return el ? el.value.replace(/\s+/g, " ").trim() : "";
  }

  function set(id, value) {
    var el = byId(id);
    if (el) { el.textContent = value; }
  }

  /* ---------------- selects are built from the table itself ---------------- */

  function option(value, label) {
    var o = document.createElement("option");
    o.value = String(value);
    o.textContent = label;
    return o;
  }

  function fillAqlSelects() {
    var crit = byId("aql-critical");
    if (crit) {
      crit.appendChild(option(AQL.ZERO_TOLERANCE, "0 — zero tolerance (any critical rejects)"));
    }
    for (var i = 0; i < AQL.AQL_COLUMNS.length; i++) {
      var v = AQL.AQL_COLUMNS[i];
      var label = aqlLabel(v) + " %";
      if (crit) { crit.appendChild(option(v, label)); }
      byId("aql-major").appendChild(option(v, label));
      byId("aql-minor").appendChild(option(v, label));
    }
    byId("aql-critical").value = String(DEFAULTS.critical);
    byId("aql-major").value = String(DEFAULTS.major);
    byId("aql-minor").value = String(DEFAULTS.minor);
  }

  /* ---------------- render ---------------- */

  function renderClass(prefix, cls) {
    set(prefix + "-aql", cls.plan.zeroTolerance ? "0" : aqlLabel(cls.aql));
    set(prefix + "-found", num(cls.found));
    if (cls.plan.ok) {
      set(prefix + "-n", num(cls.plan.inspect));
      set(prefix + "-ac", num(cls.plan.accept));
      set(prefix + "-re", num(cls.plan.reject));
    } else {
      set(prefix + "-n", "—");
      set(prefix + "-ac", "—");
      set(prefix + "-re", "—");
    }
    var found = byId(prefix + "-found");
    if (found) { found.className = (cls.verdict === "REJECT") ? "num neg" : "num"; }
  }

  function notes(result) {
    var out = [];
    var c = result.classes;
    var i;
    for (i = 0; i < c.length; i++) {
      if (c[i].plan.arrow === AQL.DOWN) {
        out.push(c[i].name + " AQL " + aqlLabel(c[i].aql) + ": Table II-A prints a down arrow at code letter " +
          c[i].plan.codeLetter + ", so the first plan below it is used — code letter " +
          c[i].plan.planLetter + ", sample " + num(c[i].plan.sampleSize) + ".");
      } else if (c[i].plan.arrow === AQL.UP) {
        out.push(c[i].name + " AQL " + aqlLabel(c[i].aql) + ": Table II-A prints an up arrow at code letter " +
          c[i].plan.codeLetter + ", so the first plan above it is used — code letter " +
          c[i].plan.planLetter + ", sample " + num(c[i].plan.sampleSize) + ".");
      }
    }
    for (i = 0; i < c.length; i++) {
      if (c[i].plan.ok && c[i].plan.hundredPercent) {
        out.push("The plan's sample size is the same as the lot or larger, so the standard calls for 100 per cent inspection — inspect all " +
          num(result.lotSize) + " pieces.");
        break;
      }
    }
    if (result.mixedSampleSizes) {
      out.push("The classes resolve to different sample sizes. Draw the largest — " +
        num(result.sampleToDraw) + " pieces — and judge each class against its own accept number.");
    }
    if (result.classes[0].plan.zeroTolerance) {
      out.push("Critical defects are set to zero tolerance. That is a buyer clause, not a Z1.4 column: any critical defect rejects the lot.");
    }
    if (!out.length) {
      out.push("Read straight from ANSI/ASQ Z1.4 Table I and Table II-A — the accept number is never calculated or typed in.");
    }
    return out.join(" ");
  }

  function current() {
    return AQL.inspect({
      lotSize: parseFloat(byId("lot").value),
      level: level,
      criticalAql: selected("aql-critical"),
      majorAql: selected("aql-major"),
      minorAql: selected("aql-minor"),
      critical: count("d-critical"),
      major: count("d-major"),
      minor: count("d-minor")
    });
  }

  function compute() {
    var r = current();

    set("p-level", r.levelLabel);
    renderClass("c", r.classes[0]);
    renderClass("m", r.classes[1]);
    renderClass("n", r.classes[2]);

    var logBtn = byId("log");

    if (!r.ok) {
      var reason = "";
      for (var i = 0; i < r.classes.length; i++) {
        if (!r.classes[i].plan.ok && r.classes[i].plan.reason) {
          reason = r.classes[i].plan.reason;
          break;
        }
      }
      set("out-verdict", "—");
      set("out-sub", reason || "Enter a lot size of 1 or more.");
      set("p-band", "—");
      set("p-letter", "—");
      set("p-draw", "—");
      set("v-cell", "—");
      set("plan-note", reason || "Enter a lot size of 1 or more.");
      /* the kit styles buttons explicitly, so a disabled button does not look
         disabled — say so in the label instead */
      if (logBtn) { logBtn.disabled = true; logBtn.textContent = "Nothing to log yet"; }
      return;
    }

    var letter = r.codeLetter || "—";
    var letters = [];
    for (var j = 0; j < r.classes.length; j++) {
      var pl = r.classes[j].plan.planLetter;
      if (pl && letters.indexOf(pl) < 0) { letters.push(pl); }
    }
    if (letters.length > 1 || (letters.length === 1 && letters[0] !== letter)) {
      letter = r.codeLetter + " (plans use " + letters.join(", ") + ")";
    }

    set("out-verdict", r.verdict);
    set("out-sub", "Draw " + num(r.sampleToDraw) + " of " + num(r.lotSize) +
      " pcs · code letter " + (r.codeLetter || "—") + " · " + r.levelLabel);
    set("p-band", r.band + " pcs");
    set("p-letter", letter);
    set("p-draw", num(r.sampleToDraw) + " pcs");
    set("v-cell", r.verdict + (r.reasons.length ? " — " + r.reasons.join("; ") : ""));

    var vCell = byId("v-cell");
    if (vCell) { vCell.className = (r.verdict === "REJECT") ? "num neg" : "num"; }

    set("plan-note", notes(r));
    if (logBtn) { logBtn.disabled = false; logBtn.textContent = "Log this inspection"; }
  }

  /* ---------------- history ---------------- */

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function stamp(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function load() {
    history = [];
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) { return; }
      var parsed = JSON.parse(raw);
      if (Object.prototype.toString.call(parsed) === "[object Array]") {
        /* skip anything written by an older entry shape */
        for (var i = 0; i < parsed.length && history.length < MAX_ENTRIES; i++) {
          if (parsed[i] && parsed[i].v === ENTRY_VERSION) { history.push(parsed[i]); }
        }
      }
    } catch (e) { history = []; }
  }

  function save() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(history));
    } catch (e) { /* private browsing or a full quota: the page still works */ }
  }

  /* A style reference typed without spaces would otherwise set the column's
     minimum width and push the table wider than a phone screen, so long runs
     get invisible break opportunities. */
  function breakable(value) {
    return String(value).replace(/\S{13,}/g, function (run) {
      return run.replace(/(.{8})/g, "$1​");
    });
  }

  function line(parent, value) {
    if (!value) { return; }
    var d = document.createElement("div");
    d.textContent = breakable(value);
    parent.appendChild(d);
  }

  function cell(row, value, cls) {
    var td = document.createElement("td");
    if (cls) { td.className = cls; }
    if (value !== null && value !== undefined) { td.textContent = value; }
    row.appendChild(td);
    return td;
  }

  function renderHistory() {
    var body = byId("hist-rows");
    if (!body) { return; }
    while (body.firstChild) { body.removeChild(body.firstChild); }

    if (!history.length) {
      var empty = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "No inspections logged yet.";
      empty.appendChild(td);
      body.appendChild(empty);
      set("hist-count", "Nothing logged yet. Logged inspections stay on this device and print with the page.");
      byId("undo").disabled = true;
      byId("undo").textContent = "Nothing to remove";
      byId("clear").disabled = true;
      return;
    }

    var accepted = 0, rejected = 0;
    for (var i = 0; i < history.length; i++) {
      var e = history[i];
      if (e.verdict === "REJECT") { rejected++; } else { accepted++; }

      var tr = document.createElement("tr");

      var when = cell(tr, null);
      line(when, e.at);
      line(when, e.ref);
      line(when, e.inspector);
      line(when, e.notes);

      var plan = cell(tr, null);
      line(plan, num(e.lot) + " pcs");
      line(plan, e.levelLabel + " · letter " + e.letter);
      line(plan, "draw " + num(e.draw));

      var counts = cell(tr, null, "num");
      line(counts, "crit " + e.found[0] + " / " + e.allowed[0]);
      line(counts, "maj " + e.found[1] + " / " + e.allowed[1]);
      line(counts, "min " + e.found[2] + " / " + e.allowed[2]);

      cell(tr, e.verdict, e.verdict === "REJECT" ? "neg" : null);

      body.appendChild(tr);
    }

    set("hist-count", history.length + (history.length === 1 ? " inspection" : " inspections") +
      " logged on this device — " + accepted + " accepted, " + rejected + " rejected. " +
      "Each class reads defects found / accept number.");
    byId("undo").disabled = false;
    byId("undo").textContent = "Remove last entry";
    byId("clear").disabled = false;
  }

  function logInspection() {
    var r = current();
    if (!r.ok) { return; }

    var planLetters = [];
    for (var i = 0; i < r.classes.length; i++) {
      var pl = r.classes[i].plan.planLetter;
      if (pl && planLetters.indexOf(pl) < 0) { planLetters.push(pl); }
    }

    history.unshift({
      v: ENTRY_VERSION,
      at: stamp(new Date()),
      ref: text("ref"),
      inspector: text("inspector") ? "Inspector: " + text("inspector") : "",
      notes: text("notes"),
      lot: r.lotSize,
      levelLabel: r.levelLabel,
      letter: planLetters.join("/") || (r.codeLetter || "—"),
      draw: r.sampleToDraw,
      found: [r.classes[0].found, r.classes[1].found, r.classes[2].found],
      allowed: [r.classes[0].plan.accept, r.classes[1].plan.accept, r.classes[2].plan.accept],
      verdict: r.verdict
    });
    if (history.length > MAX_ENTRIES) { history.length = MAX_ENTRIES; }
    save();
    renderHistory();
  }

  /* ---------------- wiring ---------------- */

  function setLevel(id) {
    level = id;
    var btns = document.querySelectorAll("[data-level]");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed",
        btns[i].getAttribute("data-level") === id ? "true" : "false");
    }
    compute();
  }

  function wire() {
    fillAqlSelects();

    var fields = document.querySelectorAll("input, select");
    var i;
    for (i = 0; i < fields.length; i++) {
      fields[i].addEventListener("input", compute);
      fields[i].addEventListener("change", compute);
    }

    var levelBtns = document.querySelectorAll("[data-level]");
    for (i = 0; i < levelBtns.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          setLevel(btn.getAttribute("data-level"));
        });
      })(levelBtns[i]);
    }

    byId("log").addEventListener("click", logInspection);
    byId("print").addEventListener("click", function () { window.print(); });

    byId("reset").addEventListener("click", function () {
      var inputs = document.querySelectorAll('input[type="number"], input[type="text"]');
      for (var k = 0; k < inputs.length; k++) { inputs[k].value = ""; }
      byId("aql-critical").value = String(DEFAULTS.critical);
      byId("aql-major").value = String(DEFAULTS.major);
      byId("aql-minor").value = String(DEFAULTS.minor);
      setLevel(DEFAULTS.level);
      compute();
    });

    byId("undo").addEventListener("click", function () {
      if (!history.length) { return; }
      history.shift();
      save();
      renderHistory();
    });

    byId("clear").addEventListener("click", function () {
      if (!history.length) { return; }
      if (!window.confirm("Clear every logged inspection on this device?")) { return; }
      history = [];
      save();
      renderHistory();
    });

    load();
    renderHistory();
    setLevel(DEFAULTS.level);
    compute();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
