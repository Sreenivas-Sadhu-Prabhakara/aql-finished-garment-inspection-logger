/*
 * AQL acceptance-sampling rules — pure module. No DOM, no storage, no network.
 *
 * SOURCE OF THE TABLES
 *   ANSI/ASQ Z1.4 "Sampling Procedures and Tables for Inspection by Attributes"
 *   (the civilian successor to MIL-STD-105E), harmonised with
 *   ISO 2859-1 "Sampling procedures for inspection by attributes — Part 1".
 *     Table I    Sample size code letters          -> CODE_LETTERS
 *     Table II-A Single sampling plans for NORMAL inspection -> ACCEPT_REJECT_NORMAL
 *
 * SCOPE IMPLEMENTED HERE
 *   - Single sampling, NORMAL inspection only (Table II-A).
 *   - Inspection levels: S-1, S-2, S-3, S-4, General I, General II, General III (all of Table I).
 *   - AQL columns 0.065 to 15 (the range used in finished-garment work).
 *   NOT implemented: tightened (Table II-B), reduced (Table II-C), the switching rules,
 *   double and multiple sampling, and the AQL columns below 0.065 or above 15.
 *   The buyer's own AQL clause always governs; this module only reads the table.
 *
 * ARROWS (Table II-A notes)
 *   DOWN = use the first sampling plan below the arrow (a larger sample, new code letter).
 *   UP   = use the first sampling plan above the arrow (a smaller sample, new code letter).
 *   The note under Table II-A adds: "If sample size equals, or exceeds, lot or batch
 *   size, do 100 percent inspection."
 *   Arrows are not only at the edges of the table. Every AQL column also has an up
 *   arrow and a down arrow sitting between its 0/1 plan and its 1/2 plan, because the
 *   zero-acceptance plans are three diagonal steps away from the Ac = 1 plans, not one.
 *   Code letter A at AQL 10 prints a down arrow where the pattern would put an up
 *   arrow, since there is no row above it.
 */
(function (root) {
  "use strict";

  /* ------------------------------------------------------------------ *
   * NAMED CONSTANTS — the tables. Everything else in the app reads     *
   * these; no accept/reject number is computed or guessed anywhere.    *
   * ------------------------------------------------------------------ */

  var STANDARD = "ANSI/ASQ Z1.4 (ISO 2859-1) — single sampling, normal inspection";

  /* Table I row ranges, in order. The last row is "500 001 and over". */
  var LOT_BANDS = [
    { min: 2,       max: 8,        label: "2 to 8" },
    { min: 9,       max: 15,       label: "9 to 15" },
    { min: 16,      max: 25,       label: "16 to 25" },
    { min: 26,      max: 50,       label: "26 to 50" },
    { min: 51,      max: 90,       label: "51 to 90" },
    { min: 91,      max: 150,      label: "91 to 150" },
    { min: 151,     max: 280,      label: "151 to 280" },
    { min: 281,     max: 500,      label: "281 to 500" },
    { min: 501,     max: 1200,     label: "501 to 1,200" },
    { min: 1201,    max: 3200,     label: "1,201 to 3,200" },
    { min: 3201,    max: 10000,    label: "3,201 to 10,000" },
    { min: 10001,   max: 35000,    label: "10,001 to 35,000" },
    { min: 35001,   max: 150000,   label: "35,001 to 150,000" },
    { min: 150001,  max: 500000,   label: "150,001 to 500,000" },
    { min: 500001,  max: Infinity, label: "500,001 and over" }
  ];

  /* Table I — sample size code letters, one entry per LOT_BANDS row.
     Code letters skip I and O.                                      */
  var CODE_LETTERS = {
    "S-1": ["A","A","A","A","B","B","B","B","C","C","C","C","D","D","D"],
    "S-2": ["A","A","A","B","B","B","C","C","C","D","D","D","E","E","E"],
    "S-3": ["A","A","B","B","C","C","D","D","E","E","F","F","G","G","H"],
    "S-4": ["A","A","B","C","C","D","E","E","F","G","G","H","J","J","K"],
    "I":   ["A","A","B","C","C","D","E","F","G","H","J","K","L","M","N"],
    "II":  ["A","B","C","D","E","F","G","H","J","K","L","M","N","P","Q"],
    "III": ["B","C","D","E","F","G","H","J","K","L","M","N","P","Q","R"]
  };

  /* Table II-A — sample size for each code letter. */
  var SAMPLE_SIZES = {
    A: 2, B: 3, C: 5, D: 8, E: 13, F: 20, G: 32, H: 50,
    J: 80, K: 125, L: 200, M: 315, N: 500, P: 800, Q: 1250, R: 2000
  };

  var CODE_ORDER = ["A","B","C","D","E","F","G","H","J","K","L","M","N","P","Q","R"];

  /* Table II-A — the AQL columns implemented, as percent nonconforming. */
  var AQL_COLUMNS = [0.065, 0.1, 0.15, 0.25, 0.4, 0.65, 1, 1.5, 2.5, 4, 6.5, 10, 15];

  var DOWN = "down";   /* use first sampling plan BELOW the arrow */
  var UP   = "up";     /* use first sampling plan ABOVE the arrow */

  /* Table II-A — [Ac, Re] per code letter per AQL column, columns in AQL_COLUMNS order.
     Note the shape of each column: the zero-acceptance plan does NOT sit next to the
     Ac = 1 plan. Along the diagonal of the table, n x AQL runs 0.125 for Ac 0 and then
     jumps straight to 0.500 for Ac 1 — three steps, not one — so two arrow rows (an up
     arrow then a down arrow) always separate the 0/1 entry from the 1/2 entry.
        0.065   0.10    0.15    0.25    0.40    0.65    1.0     1.5     2.5     4.0     6.5     10      15      */
  var ACCEPT_REJECT_NORMAL = {
    A: [ DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   [0,1],  DOWN,   DOWN   ],
    B: [ DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   [0,1],  UP,     DOWN,   [1,2]  ],
    C: [ DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   [0,1],  UP,     DOWN,   [1,2],  [2,3]  ],
    D: [ DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   [0,1],  UP,     DOWN,   [1,2],  [2,3],  [3,4]  ],
    E: [ DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   [0,1],  UP,     DOWN,   [1,2],  [2,3],  [3,4],  [5,6]  ],
    F: [ DOWN,   DOWN,   DOWN,   DOWN,   DOWN,   [0,1],  UP,     DOWN,   [1,2],  [2,3],  [3,4],  [5,6],  [7,8]  ],
    G: [ DOWN,   DOWN,   DOWN,   DOWN,   [0,1],  UP,     DOWN,   [1,2],  [2,3],  [3,4],  [5,6],  [7,8],  [10,11]],
    H: [ DOWN,   DOWN,   DOWN,   [0,1],  UP,     DOWN,   [1,2],  [2,3],  [3,4],  [5,6],  [7,8],  [10,11],[14,15]],
    J: [ DOWN,   DOWN,   [0,1],  UP,     DOWN,   [1,2],  [2,3],  [3,4],  [5,6],  [7,8],  [10,11],[14,15],[21,22]],
    K: [ DOWN,   [0,1],  UP,     DOWN,   [1,2],  [2,3],  [3,4],  [5,6],  [7,8],  [10,11],[14,15],[21,22],UP     ],
    L: [ [0,1],  UP,     DOWN,   [1,2],  [2,3],  [3,4],  [5,6],  [7,8],  [10,11],[14,15],[21,22],UP,     UP     ],
    M: [ UP,     DOWN,   [1,2],  [2,3],  [3,4],  [5,6],  [7,8],  [10,11],[14,15],[21,22],UP,     UP,     UP     ],
    N: [ DOWN,   [1,2],  [2,3],  [3,4],  [5,6],  [7,8],  [10,11],[14,15],[21,22],UP,     UP,     UP,     UP     ],
    P: [ [1,2],  [2,3],  [3,4],  [5,6],  [7,8],  [10,11],[14,15],[21,22],UP,     UP,     UP,     UP,     UP     ],
    Q: [ [2,3],  [3,4],  [5,6],  [7,8],  [10,11],[14,15],[21,22],UP,     UP,     UP,     UP,     UP,     UP     ],
    R: [ [3,4],  [5,6],  [7,8],  [10,11],[14,15],[21,22],UP,     UP,     UP,     UP,     UP,     UP,     UP     ]
  };

  /* Defect classes. Critical defects are conventionally run at zero tolerance:
     that is a buyer clause, NOT a Z1.4 table column, so it is flagged as such. */
  var ZERO_TOLERANCE = 0;

  var LEVELS = [
    { id: "S-1", label: "S-1" },
    { id: "S-2", label: "S-2" },
    { id: "S-3", label: "S-3" },
    { id: "S-4", label: "S-4" },
    { id: "I",   label: "General I" },
    { id: "II",  label: "General II" },
    { id: "III", label: "General III" }
  ];

  /* ------------------------------------------------------------------ *
   * Lookups                                                            *
   * ------------------------------------------------------------------ */

  function levelLabel(level) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].id === level) { return LEVELS[i].label; }
    }
    return level;
  }

  function bandIndex(lotSize) {
    if (typeof lotSize !== "number" || !isFinite(lotSize)) { return -1; }
    var n = Math.floor(lotSize);
    if (n < LOT_BANDS[0].min) { return -1; }
    for (var i = 0; i < LOT_BANDS.length; i++) {
      if (n >= LOT_BANDS[i].min && n <= LOT_BANDS[i].max) { return i; }
    }
    return -1;
  }

  /* Table I lookup: lot size + inspection level -> sample size code letter. */
  function codeLetter(lotSize, level) {
    var row = CODE_LETTERS[level];
    if (!row) { return null; }
    var i = bandIndex(lotSize);
    if (i < 0) { return null; }
    return row[i];
  }

  function aqlIndex(aql) {
    for (var i = 0; i < AQL_COLUMNS.length; i++) {
      /* AQL values are fixed table columns; compare with a tolerance so that
         0.065 typed as a string or 1 vs 1.0 still match the right column. */
      if (Math.abs(AQL_COLUMNS[i] - aql) < 1e-9) { return i; }
    }
    return -1;
  }

  /* Table II-A cell, exactly as printed: [Ac, Re] or the DOWN / UP arrow. */
  function rawCell(letter, aql) {
    var row = ACCEPT_REJECT_NORMAL[letter];
    var c = aqlIndex(aql);
    if (!row || c < 0) { return null; }
    return row[c];
  }

  /* Follow an arrow to the first printed plan in the same AQL column.
     Returns { letter, cell } or null when the column has no plan that way. */
  function followArrow(letter, aql, direction) {
    var i = CODE_ORDER.indexOf(letter);
    if (i < 0) { return null; }
    var step = (direction === DOWN) ? 1 : -1;
    for (var j = i + step; j >= 0 && j < CODE_ORDER.length; j += step) {
      var cell = rawCell(CODE_ORDER[j], aql);
      if (cell && cell !== DOWN && cell !== UP) {
        return { letter: CODE_ORDER[j], cell: cell };
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   * planFor — the whole lookup chain in one call:                      *
   *   lot size -> code letter -> sample size -> Ac / Re at the AQL,    *
   *   with arrows resolved and the 100 % inspection note applied.      *
   * ------------------------------------------------------------------ */
  function planFor(lotSize, level, aql) {
    var out = {
      ok: false, reason: "", standard: STANDARD,
      lotSize: null, level: level, levelLabel: levelLabel(level), aql: aql,
      band: null, codeLetter: null, planLetter: null, arrow: null,
      sampleSize: null, inspect: null, accept: null, reject: null,
      hundredPercent: false, zeroTolerance: false
    };

    if (typeof lotSize !== "number" || !isFinite(lotSize) || Math.floor(lotSize) < 1) {
      out.reason = "Enter a lot size of 1 or more.";
      return out;
    }
    var lot = Math.floor(lotSize);
    out.lotSize = lot;

    if (!CODE_LETTERS[level]) {
      out.reason = "Unknown inspection level.";
      return out;
    }

    /* Zero tolerance for critical defects: not a Z1.4 column. Sample size still
       comes from Table I + Table II-A; the accept number is the buyer's 0. */
    if (aql === ZERO_TOLERANCE) {
      if (lot < LOT_BANDS[0].min) {
        out.ok = true; out.zeroTolerance = true;
        out.band = "below 2"; out.codeLetter = null; out.planLetter = null;
        out.sampleSize = lot; out.inspect = lot; out.hundredPercent = true;
        out.accept = 0; out.reject = 1;
        return out;
      }
      var letter0 = codeLetter(lot, level);
      var n0 = SAMPLE_SIZES[letter0];
      out.ok = true; out.zeroTolerance = true;
      out.band = LOT_BANDS[bandIndex(lot)].label;
      out.codeLetter = letter0; out.planLetter = letter0;
      out.sampleSize = n0;
      out.hundredPercent = n0 >= lot;
      out.inspect = out.hundredPercent ? lot : n0;
      out.accept = 0; out.reject = 1;
      return out;
    }

    if (aqlIndex(aql) < 0) {
      out.reason = "AQL " + aql + " is outside the columns implemented (0.065 to 15).";
      return out;
    }

    /* A lot of 1 is below Table I. Z1.4 starts at 2, so inspect the piece. */
    if (lot < LOT_BANDS[0].min) {
      out.ok = true;
      out.band = "below 2";
      out.sampleSize = lot; out.inspect = lot; out.hundredPercent = true;
      out.accept = 0; out.reject = 1;
      out.reason = "Lot is below the first Table I row — inspect every piece.";
      return out;
    }

    var bi = bandIndex(lot);
    out.band = LOT_BANDS[bi].label;
    var letter = CODE_LETTERS[level][bi];
    out.codeLetter = letter;

    var cell = rawCell(letter, aql);
    if (cell === DOWN || cell === UP) {
      out.arrow = cell;
      var moved = followArrow(letter, aql, cell);
      if (!moved) {
        out.reason = "Table II-A has no plan in this column for code letter " + letter + ".";
        return out;
      }
      out.planLetter = moved.letter;
      cell = moved.cell;
    } else {
      out.planLetter = letter;
    }

    var n = SAMPLE_SIZES[out.planLetter];
    out.sampleSize = n;
    out.accept = cell[0];
    out.reject = cell[1];
    out.hundredPercent = n >= lot;
    out.inspect = out.hundredPercent ? lot : n;
    out.ok = true;
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Verdict — never hand-entered. One plan per defect class.           *
   * ------------------------------------------------------------------ */
  function classVerdict(plan, found) {
    if (!plan.ok) { return "UNKNOWN"; }
    return (found >= plan.reject) ? "REJECT" : "ACCEPT";
  }

  /* inspection = { lotSize, level, criticalAql, majorAql, minorAql,
                    critical, major, minor }                           */
  function inspect(inspection) {
    var lot = inspection.lotSize;
    var level = inspection.level;

    var classes = [
      { key: "critical", name: "Critical", aql: inspection.criticalAql, found: inspection.critical },
      { key: "major",    name: "Major",    aql: inspection.majorAql,    found: inspection.major },
      { key: "minor",    name: "Minor",    aql: inspection.minorAql,    found: inspection.minor }
    ];

    var ok = true, anyReject = false, draw = 0, fallback = 0, lotFloor = null, reasons = [];
    var i, c;

    for (i = 0; i < classes.length; i++) {
      c = classes[i];
      c.found = (typeof c.found === "number" && isFinite(c.found) && c.found > 0)
        ? Math.floor(c.found) : 0;
      c.plan = planFor(lot, level, c.aql);
      c.verdict = classVerdict(c.plan, c.found);
      if (!c.plan.ok) { ok = false; }
      else {
        if (lotFloor === null) { lotFloor = c.plan.lotSize; }
        if (c.plan.inspect > fallback) { fallback = c.plan.inspect; }
        /* the sample drawn is set by the classes that have an AQL column */
        if (!c.plan.zeroTolerance && c.plan.inspect > draw) { draw = c.plan.inspect; }
      }
    }
    if (draw === 0) { draw = fallback; }

    /* Zero tolerance has no AQL column of its own, so it does not call for a
       sample of its own either: it applies to the sample actually drawn. */
    for (i = 0; i < classes.length; i++) {
      c = classes[i];
      if (c.plan.ok && c.plan.zeroTolerance) {
        c.plan.inspect = draw;
        c.plan.hundredPercent = lotFloor !== null && draw >= lotFloor;
      }
    }

    for (i = 0; i < classes.length; i++) {
      c = classes[i];
      if (c.plan.ok && c.verdict === "REJECT") {
        anyReject = true;
        reasons.push(c.name + ": " + c.found + " found, " + c.plan.accept +
          " allowed (reject at " + c.plan.reject + ")");
      }
    }

    /* Arrows are followed per AQL column, so two classes can land on
       different code letters and so on different sample sizes. */
    var sizes = [];
    for (i = 0; i < classes.length; i++) {
      c = classes[i];
      if (c.plan.ok && !c.plan.zeroTolerance && sizes.indexOf(c.plan.inspect) < 0) {
        sizes.push(c.plan.inspect);
      }
    }

    return {
      ok: ok,
      standard: STANDARD,
      lotSize: ok ? classes[0].plan.lotSize : null,
      level: level,
      levelLabel: levelLabel(level),
      band: ok ? classes[0].plan.band : null,
      codeLetter: ok ? classes[0].plan.codeLetter : null,
      classes: classes,
      sampleToDraw: draw,
      mixedSampleSizes: ok && sizes.length > 1,
      verdict: ok ? (anyReject ? "REJECT" : "ACCEPT") : "UNKNOWN",
      reasons: reasons
    };
  }

  var AQL = {
    STANDARD: STANDARD,
    LOT_BANDS: LOT_BANDS,
    CODE_LETTERS: CODE_LETTERS,
    SAMPLE_SIZES: SAMPLE_SIZES,
    CODE_ORDER: CODE_ORDER,
    AQL_COLUMNS: AQL_COLUMNS,
    ACCEPT_REJECT_NORMAL: ACCEPT_REJECT_NORMAL,
    LEVELS: LEVELS,
    DOWN: DOWN,
    UP: UP,
    ZERO_TOLERANCE: ZERO_TOLERANCE,
    levelLabel: levelLabel,
    bandIndex: bandIndex,
    codeLetter: codeLetter,
    rawCell: rawCell,
    followArrow: followArrow,
    planFor: planFor,
    inspect: inspect
  };

  if (typeof module === "object" && module && module.exports) { module.exports = AQL; }
  root.AQL = AQL;
})(typeof globalThis !== "undefined" ? globalThis : this);
