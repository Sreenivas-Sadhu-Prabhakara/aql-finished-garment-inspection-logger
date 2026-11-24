/*
 * Table-driven tests for the AQL rules module.
 *
 *   node tests/aql.test.js        (from the repo root)
 *   or open tests/index.html in a browser
 *
 * The expected tables below are typed out again here, independently of
 * assets/aql.js, so a transcription slip in either copy fails the run.
 */
(function () {
  "use strict";

  var AQL = (typeof require === "function")
    ? require("../assets/aql.js")
    : (typeof window !== "undefined" ? window.AQL : null);

  var results = [];
  function check(group, name, got, want) {
    var g = JSON.stringify(got), w = JSON.stringify(want);
    results.push({ group: group, name: name, pass: g === w, got: g, want: w });
  }
  function truthy(group, name, got) { check(group, name, !!got, true); }

  /* ================================================================== *
   * 1. Table I — lot-size bands and sample size code letters
   *    Tested at BOTH edges of every band: the last lot size in the row
   *    and the first lot size in the next row, i.e. the row above and
   *    below each break.
   * ================================================================== */

  var BAND_EDGES = [
    [2, 8], [9, 15], [16, 25], [26, 50], [51, 90], [91, 150], [151, 280],
    [281, 500], [501, 1200], [1201, 3200], [3201, 10000], [10001, 35000],
    [35001, 150000], [150001, 500000], [500001, 9000000]
  ];

  var EXPECTED_CODE_LETTERS = {
    "S-1": ["A","A","A","A","B","B","B","B","C","C","C","C","D","D","D"],
    "S-2": ["A","A","A","B","B","B","C","C","C","D","D","D","E","E","E"],
    "S-3": ["A","A","B","B","C","C","D","D","E","E","F","F","G","G","H"],
    "S-4": ["A","A","B","C","C","D","E","E","F","G","G","H","J","J","K"],
    "I":   ["A","A","B","C","C","D","E","F","G","H","J","K","L","M","N"],
    "II":  ["A","B","C","D","E","F","G","H","J","K","L","M","N","P","Q"],
    "III": ["B","C","D","E","F","G","H","J","K","L","M","N","P","Q","R"]
  };

  Object.keys(EXPECTED_CODE_LETTERS).forEach(function (lvl) {
    var exp = EXPECTED_CODE_LETTERS[lvl];
    for (var i = 0; i < BAND_EDGES.length; i++) {
      var lo = BAND_EDGES[i][0], hi = BAND_EDGES[i][1];
      check("Table I " + lvl, "lot " + lo + " (band low edge)", AQL.codeLetter(lo, lvl), exp[i]);
      check("Table I " + lvl, "lot " + hi + " (band high edge)", AQL.codeLetter(hi, lvl), exp[i]);
      /* the row below the break: hi + 1 must land in the next band */
      if (i + 1 < BAND_EDGES.length) {
        check("Table I " + lvl, "lot " + (hi + 1) + " (first of next band)",
          AQL.codeLetter(hi + 1, lvl), exp[i + 1]);
      }
    }
  });

  /* off the bottom of Table I */
  check("Table I bounds", "lot 1 has no code letter", AQL.codeLetter(1, "II"), null);
  check("Table I bounds", "lot 0 has no code letter", AQL.codeLetter(0, "II"), null);
  check("Table I bounds", "unknown level", AQL.codeLetter(500, "General II"), null);

  /* ================================================================== *
   * 2. Code letter -> sample size
   * ================================================================== */
  var EXPECTED_SAMPLE_SIZES = {
    A: 2, B: 3, C: 5, D: 8, E: 13, F: 20, G: 32, H: 50,
    J: 80, K: 125, L: 200, M: 315, N: 500, P: 800, Q: 1250, R: 2000
  };
  Object.keys(EXPECTED_SAMPLE_SIZES).forEach(function (k) {
    check("Sample sizes", "letter " + k, AQL.SAMPLE_SIZES[k], EXPECTED_SAMPLE_SIZES[k]);
  });
  check("Sample sizes", "letters skip I and O",
    AQL.CODE_ORDER.indexOf("I") + AQL.CODE_ORDER.indexOf("O"), -2);

  /* ================================================================== *
   * 3. Table II-A cells, letter by letter, including the arrows
   *    "d" = down arrow, "u" = up arrow.
   * ================================================================== */
  var d = "d", u = "u";
  var EXPECTED_II_A = {
    /*     0.065  0.10   0.15   0.25   0.40   0.65   1.0    1.5    2.5    4.0    6.5    10     15   */
    A: [   d,     d,     d,     d,     d,     d,     d,     d,     d,     d,     [0,1], d,     d      ],
    B: [   d,     d,     d,     d,     d,     d,     d,     d,     d,     [0,1], u,     d,     [1,2]  ],
    C: [   d,     d,     d,     d,     d,     d,     d,     d,     [0,1], u,     d,     [1,2], [2,3]  ],
    D: [   d,     d,     d,     d,     d,     d,     d,     [0,1], u,     d,     [1,2], [2,3], [3,4]  ],
    E: [   d,     d,     d,     d,     d,     d,     [0,1], u,     d,     [1,2], [2,3], [3,4], [5,6]  ],
    F: [   d,     d,     d,     d,     d,     [0,1], u,     d,     [1,2], [2,3], [3,4], [5,6], [7,8]  ],
    G: [   d,     d,     d,     d,     [0,1], u,     d,     [1,2], [2,3], [3,4], [5,6], [7,8], [10,11]],
    H: [   d,     d,     d,     [0,1], u,     d,     [1,2], [2,3], [3,4], [5,6], [7,8], [10,11],[14,15]],
    J: [   d,     d,     [0,1], u,     d,     [1,2], [2,3], [3,4], [5,6], [7,8], [10,11],[14,15],[21,22]],
    K: [   d,     [0,1], u,     d,     [1,2], [2,3], [3,4], [5,6], [7,8], [10,11],[14,15],[21,22],u    ],
    L: [   [0,1], u,     d,     [1,2], [2,3], [3,4], [5,6], [7,8], [10,11],[14,15],[21,22],u,     u    ],
    M: [   u,     d,     [1,2], [2,3], [3,4], [5,6], [7,8], [10,11],[14,15],[21,22],u,     u,     u    ],
    N: [   d,     [1,2], [2,3], [3,4], [5,6], [7,8], [10,11],[14,15],[21,22],u,     u,     u,     u    ],
    P: [   [1,2], [2,3], [3,4], [5,6], [7,8], [10,11],[14,15],[21,22],u,     u,     u,     u,     u    ],
    Q: [   [2,3], [3,4], [5,6], [7,8], [10,11],[14,15],[21,22],u,     u,     u,     u,     u,     u    ],
    R: [   [3,4], [5,6], [7,8], [10,11],[14,15],[21,22],u,     u,     u,     u,     u,     u,     u    ]
  };
  var COLS = [0.065, 0.1, 0.15, 0.25, 0.4, 0.65, 1, 1.5, 2.5, 4, 6.5, 10, 15];

  check("Table II-A", "AQL columns implemented", AQL.AQL_COLUMNS, COLS);

  Object.keys(EXPECTED_II_A).forEach(function (letter) {
    var row = EXPECTED_II_A[letter];
    check("Table II-A", letter + " row width", row.length, COLS.length);
    for (var c = 0; c < COLS.length; c++) {
      var want = row[c];
      if (want === d) { want = AQL.DOWN; } else if (want === u) { want = AQL.UP; }
      check("Table II-A", letter + " @ AQL " + COLS[c], AQL.rawCell(letter, COLS[c]), want);
    }
  });

  /* Structural invariants — these catch a single mistyped number, and in particular
     the gap between the zero-acceptance plan and the Ac = 1 plan. */
  var AC_SERIES = [0, 1, 2, 3, 5, 7, 10, 14, 21];
  (function () {
    var badAc = 0, badRe = 0, badLead = 0, badTail = 0, badGap = 0, badDiag = 0;
    AQL.CODE_ORDER.forEach(function (letter) {
      var li = AQL.CODE_ORDER.indexOf(letter);
      var row = [], c;
      for (c = 0; c < COLS.length; c++) { row.push(AQL.rawCell(letter, COLS[c])); }

      var isPlan = function (x) { return x !== AQL.DOWN && x !== AQL.UP; };
      var planAt = [];
      for (c = 0; c < row.length; c++) { if (isPlan(row[c])) { planAt.push(c); } }

      /* the run of cells before the first plan holds no plan, and the run after
         the last one holds none either — plans are contiguous apart from the
         two-arrow gap under the 0/1 entry, which is checked below */
      if (planAt.length === 0) { badLead++; }
      for (c = planAt[0]; c <= planAt[planAt.length - 1]; c++) {
        if (!isPlan(row[c]) && row[c] !== AQL.UP && row[c] !== AQL.DOWN) { badTail++; }
      }

      var seen = -1, first = true;
      for (var k = 0; k < planAt.length; k++) {
        var cell = row[planAt[k]];
        var idx = AC_SERIES.indexOf(cell[0]);
        /* rows P, Q and R start part-way along the series because the columns
           left of AQL 0.065 are not implemented here */
        if (idx < 0 || (!first && idx !== seen + 1)) { badAc++; }
        first = false; seen = idx;
        if (cell[1] !== cell[0] + 1) { badRe++; }

        /* exactly two arrows between the 0/1 plan and the 1/2 plan, none elsewhere */
        if (k + 1 < planAt.length) {
          var gap = planAt[k + 1] - planAt[k] - 1;
          var want = (cell[0] === 0) ? 2 : 0;
          if (gap !== want) { badGap++; }
          if (want === 2) {
            /* up arrow back to the 0/1 plan, then down arrow on to the 1/2 plan —
               except at code letter A, which has no row above it to point at */
            var expectFirst = (li === 0) ? AQL.DOWN : AQL.UP;
            if (row[planAt[k] + 1] !== expectFirst) { badGap++; }
            if (row[planAt[k] + 2] !== AQL.DOWN) { badGap++; }
          }
        }

        /* the table is diagonal: one letter down + one AQL column left is the same plan */
        if (li + 1 < AQL.CODE_ORDER.length && planAt[k] - 1 >= 0) {
          var diag = AQL.rawCell(AQL.CODE_ORDER[li + 1], COLS[planAt[k] - 1]);
          if (JSON.stringify(diag) !== JSON.stringify(cell)) { badDiag++; }
        }
      }
    });
    check("Table II-A invariants", "Ac values only from 0,1,2,3,5,7,10,14,21 in order", badAc, 0);
    check("Table II-A invariants", "Re is always Ac+1", badRe, 0);
    check("Table II-A invariants", "every row holds at least one plan", badLead, 0);
    check("Table II-A invariants", "every cell is a plan or an arrow", badTail, 0);
    check("Table II-A invariants", "an up arrow and a down arrow separate 0/1 from 1/2", badGap, 0);
    check("Table II-A invariants", "plans are diagonal in n x AQL", badDiag, 0);
  })();

  /* The whole table, arrows included, is a function of n x AQL: stepping one code
     letter down and one AQL column left must land on an identical cell. This is the
     strongest single check on the data — one mistyped cell breaks two diagonals. */
  (function () {
    var bad = [], L = AQL.CODE_ORDER;
    for (var i = 0; i + 1 < L.length; i++) {
      for (var c = 1; c < COLS.length; c++) {
        /* the one documented exception: code letter A at AQL 10 prints a down
           arrow where the diagonal wants an up arrow, as nothing sits above A */
        if (L[i] === "A" && COLS[c] === 10) { continue; }
        var a = AQL.rawCell(L[i], COLS[c]);
        var b = AQL.rawCell(L[i + 1], COLS[c - 1]);
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          bad.push(L[i] + "@" + COLS[c] + " != " + L[i + 1] + "@" + COLS[c - 1]);
        }
      }
    }
    check("Table II-A invariants", "every diagonal holds a single value, arrows included", bad, []);
  })();

  /* The zero-acceptance diagonal, stated on its own: which code letter carries the
     0/1 plan in each AQL column, and the two letters below it that arrow away. */
  var AC_ZERO_DIAGONAL = [
    [0.065, "L", 200], [0.1, "K", 125], [0.15, "J", 80], [0.25, "H", 50],
    [0.4, "G", 32], [0.65, "F", 20], [1, "E", 13], [1.5, "D", 8],
    [2.5, "C", 5], [4, "B", 3], [6.5, "A", 2]
  ];
  AC_ZERO_DIAGONAL.forEach(function (t) {
    var aql = t[0], letter = t[1], li = AQL.CODE_ORDER.indexOf(letter);
    check("Ac=0 diagonal", "AQL " + aql + " has 0/1 at " + letter + " (n " + t[2] + ")",
      [AQL.rawCell(letter, aql), AQL.SAMPLE_SIZES[letter]], [[0, 1], t[2]]);
    if (li + 1 < AQL.CODE_ORDER.length) {
      check("Ac=0 diagonal", "AQL " + aql + ": " + AQL.CODE_ORDER[li + 1] + " arrows back up to " + letter,
        AQL.rawCell(AQL.CODE_ORDER[li + 1], aql), AQL.UP);
    }
    if (li + 2 < AQL.CODE_ORDER.length) {
      check("Ac=0 diagonal", "AQL " + aql + ": " + AQL.CODE_ORDER[li + 2] + " arrows down past it",
        AQL.rawCell(AQL.CODE_ORDER[li + 2], aql), AQL.DOWN);
    }
  });
  check("Ac=0 diagonal", "AQL 10 has no zero-acceptance plan at all",
    AQL.CODE_ORDER.filter(function (L) {
      var cl = AQL.rawCell(L, 10); return cl !== AQL.DOWN && cl !== AQL.UP && cl[0] === 0;
    }), []);
  check("Ac=0 diagonal", "AQL 15 has no zero-acceptance plan at all",
    AQL.CODE_ORDER.filter(function (L) {
      var cl = AQL.rawCell(L, 15); return cl !== AQL.DOWN && cl !== AQL.UP && cl[0] === 0;
    }), []);

  /* ================================================================== *
   * 4. Arrow resolution — "use first sampling plan below / above"
   * ================================================================== */
  var ARROW_CASES = [
    /* lot, level, aql, code letter from Table I, arrow, plan letter, n, Ac, Re */
    /* down arrows at the top of a column, walking past the 0/1 plan's neighbours */
    [8,       "II", 2.5, "A", "down", "C",   5,  0, 1],
    [15,      "II", 2.5, "B", "down", "C",   5,  0, 1],
    [8,       "II", 4.0, "A", "down", "B",   3,  0, 1],
    [8,       "II", 0.65,"A", "down", "F",  20,  0, 1],
    [2,       "I",  1.0, "A", "down", "E",  13,  0, 1],
    /* the up arrow directly under a 0/1 plan: back to the SMALLER sample */
    [50,      "II", 2.5, "D", "up",   "C",   5,  0, 1],
    [150,     "II", 1.0, "F", "up",   "E",  13,  0, 1],
    [15,      "II", 6.5, "B", "up",   "A",   2,  0, 1],
    [280,     "II", 0.65,"G", "up",   "F",  20,  0, 1],
    /* the down arrow two rows under a 0/1 plan: on to the Ac = 1 plan */
    [90,      "II", 2.5, "E", "down", "F",  20,  1, 2],
    [500,     "II", 0.65,"H", "down", "J",  80,  1, 2],
    [50,      "II", 4.0, "D", "down", "E",  13,  1, 2],
    [25,      "II", 6.5, "C", "down", "D",   8,  1, 2],
    /* code letter A at AQL 10 prints a down arrow where an up arrow has nowhere to go */
    [8,       "II", 10,  "A", "down", "C",   5,  1, 2],
    [15,      "II", 10,  "B", "down", "C",   5,  1, 2],
    /* up arrows along the bottom-right of the table */
    [150001,  "II", 2.5, "P", "up",   "N", 500, 21, 22],
    [500001,  "II", 2.5, "Q", "up",   "N", 500, 21, 22],
    [500001,  "III",2.5, "R", "up",   "N", 500, 21, 22],
    [35001,   "II", 4.0, "N", "up",   "M", 315, 21, 22],
    [10001,   "II", 6.5, "M", "up",   "L", 200, 21, 22],
    [3201,    "II", 10,  "L", "up",   "K", 125, 21, 22],
    [500001,  "II", 15,  "Q", "up",   "J",  80, 21, 22]
  ];
  ARROW_CASES.forEach(function (t) {
    var p = AQL.planFor(t[0], t[1], t[2]);
    check("Arrows", "lot " + t[0] + " " + t[1] + " AQL " + t[2],
      [p.ok, p.codeLetter, p.arrow, p.planLetter, p.sampleSize, p.accept, p.reject],
      [true, t[3], t[4], t[5], t[6], t[7], t[8]]);
  });

  check("Arrows", "letter A at AQL 0.065 walks all the way down to L (n 200)",
    (function () { var p = AQL.planFor(8, "II", 0.065);
      return [p.ok, p.planLetter, p.sampleSize, p.accept, p.hundredPercent]; })(),
    [true, "L", 200, 0, true]);

  /* An arrow never lands on another arrow. */
  (function () {
    var bad = [];
    AQL.CODE_ORDER.forEach(function (letter) {
      COLS.forEach(function (aql) {
        var cell = AQL.rawCell(letter, aql);
        if (cell !== AQL.DOWN && cell !== AQL.UP) { return; }
        var moved = AQL.followArrow(letter, aql, cell);
        if (!moved) { bad.push(letter + "@" + aql + " leads nowhere"); return; }
        var target = AQL.rawCell(moved.letter, aql);
        if (target === AQL.DOWN || target === AQL.UP) { bad.push(letter + "@" + aql); }
      });
    });
    check("Arrows", "every arrow resolves to a printed plan", bad, []);
  })();

  /* ================================================================== *
   * 5. End-to-end: the General II plan for each lot band at the AQLs
   *    garment buyers actually write into a clause.
   *    [lot, aql, sample size, Ac, Re]
   * ================================================================== */
  var GENERAL_II = [
    /* AQL 2.5 — code letters A B C D E F G H J K L M N P Q by lot band */
    [2,       2.5,   5,  0,  1], [8,       2.5,   5,  0,  1],
    [9,       2.5,   5,  0,  1], [15,      2.5,   5,  0,  1],
    [16,      2.5,   5,  0,  1], [25,      2.5,   5,  0,  1],
    [26,      2.5,   5,  0,  1], [50,      2.5,   5,  0,  1],
    [51,      2.5,  20,  1,  2], [90,      2.5,  20,  1,  2],
    [91,      2.5,  20,  1,  2], [150,     2.5,  20,  1,  2],
    [151,     2.5,  32,  2,  3], [280,     2.5,  32,  2,  3],
    [281,     2.5,  50,  3,  4], [500,     2.5,  50,  3,  4],
    [501,     2.5,  80,  5,  6], [1200,    2.5,  80,  5,  6],
    [1201,    2.5, 125,  7,  8], [3200,    2.5, 125,  7,  8],
    [3201,    2.5, 200, 10, 11], [10000,   2.5, 200, 10, 11],
    [10001,   2.5, 315, 14, 15], [35000,   2.5, 315, 14, 15],
    [35001,   2.5, 500, 21, 22], [150000,  2.5, 500, 21, 22],
    [150001,  2.5, 500, 21, 22], [500000,  2.5, 500, 21, 22],
    [500001,  2.5, 500, 21, 22], [2000000, 2.5, 500, 21, 22],
    /* AQL 4.0 */
    [2,       4.0,   3,  0,  1], [8,       4.0,   3,  0,  1],
    [9,       4.0,   3,  0,  1], [16,      4.0,   3,  0,  1],
    [26,      4.0,  13,  1,  2], [50,      4.0,  13,  1,  2],
    [51,      4.0,  13,  1,  2], [90,      4.0,  13,  1,  2],
    [91,      4.0,  20,  2,  3], [151,     4.0,  32,  3,  4],
    [281,     4.0,  50,  5,  6], [501,     4.0,  80,  7,  8],
    [1201,    4.0, 125, 10, 11], [3201,    4.0, 200, 14, 15],
    [10001,   4.0, 315, 21, 22], [35001,   4.0, 315, 21, 22],
    [500001,  4.0, 315, 21, 22],
    /* AQL 1.5 */
    [26,      1.5,   8,  0,  1], [50,      1.5,   8,  0,  1],
    [51,      1.5,   8,  0,  1], [90,      1.5,   8,  0,  1],
    [91,      1.5,  32,  1,  2], [150,     1.5,  32,  1,  2],
    [151,     1.5,  32,  1,  2], [281,     1.5,  50,  2,  3],
    [501,     1.5,  80,  3,  4], [1201,    1.5, 125,  5,  6],
    [3201,    1.5, 200,  7,  8], [10001,   1.5, 315, 10, 11],
    [35001,   1.5, 500, 14, 15], [150001,  1.5, 800, 21, 22],
    [500001,  1.5, 800, 21, 22],
    /* AQL 1.0 */
    [51,      1.0,  13,  0,  1], [90,      1.0,  13,  0,  1],
    [91,      1.0,  13,  0,  1], [150,     1.0,  13,  0,  1],
    [151,     1.0,  50,  1,  2], [281,     1.0,  50,  1,  2],
    [501,     1.0,  80,  2,  3], [1201,    1.0, 125,  3,  4],
    [3201,    1.0, 200,  5,  6], [10001,   1.0, 315,  7,  8],
    [35001,   1.0, 500, 10, 11], [150001,  1.0, 800, 14, 15],
    [500001,  1.0,1250, 21, 22],
    /* AQL 0.65 */
    [91,      0.65, 20,  0,  1], [150,     0.65, 20,  0,  1],
    [151,     0.65, 20,  0,  1], [280,     0.65, 20,  0,  1],
    [281,     0.65, 80,  1,  2], [501,     0.65, 80,  1,  2],
    [1201,    0.65,125,  2,  3], [3201,    0.65,200,  3,  4],
    [10001,   0.65,315,  5,  6], [35001,   0.65,500,  7,  8],
    [500001,  0.65,1250,14, 15],
    /* AQL 6.5 */
    [2,       6.5,   2,  0,  1], [8,       6.5,   2,  0,  1],
    [9,       6.5,   2,  0,  1], [15,      6.5,   2,  0,  1],
    [16,      6.5,   8,  1,  2], [25,      6.5,   8,  1,  2],
    [26,      6.5,   8,  1,  2], [51,      6.5,  13,  2,  3],
    [91,      6.5,  20,  3,  4], [151,     6.5,  32,  5,  6],
    [281,     6.5,  50,  7,  8], [501,     6.5,  80, 10, 11],
    [1201,    6.5, 125, 14, 15], [3201,    6.5, 200, 21, 22],
    [10001,   6.5, 200, 21, 22],
    /* AQL 10 — no zero-acceptance plan exists in this column */
    [2,       10,    5,  1,  2], [9,       10,    5,  1,  2],
    [16,      10,    5,  1,  2], [26,      10,    8,  2,  3],
    [51,      10,   13,  3,  4], [91,      10,   20,  5,  6],
    [151,     10,   32,  7,  8], [281,     10,   50, 10, 11],
    [501,     10,   80, 14, 15], [1201,    10,  125, 21, 22],
    [3201,    10,  125, 21, 22]
  ];
  GENERAL_II.forEach(function (t) {
    var p = AQL.planFor(t[0], "II", t[1]);
    check("General II plans", "lot " + t[0] + " @ AQL " + t[1],
      [p.ok, p.sampleSize, p.accept, p.reject], [true, t[2], t[3], t[4]]);
  });

  /* 100 % inspection note: sample size equals or exceeds the lot */
  var HUNDRED = [
    [2,   2.5,  true,  2],  /* plan n = 5 > lot 2 -> inspect all 2            */
    [4,   2.5,  true,  4],
    [5,   2.5,  true,  5],  /* n = 5, lot 5 -> equals, so 100 %               */
    [6,   2.5,  false, 5],  /* lot 6 > n 5 -> ordinary sampling               */
    [8,   2.5,  false, 5],
    [2,   6.5,  true,  2],  /* letter A, n = 2, lot 2                         */
    [3,   6.5,  false, 2],
    [26,  0.065,true, 26],  /* letter D arrows down to L (n 200) -> all 26    */
    [600, 2.5,  false,80]   /* letter J, n = 80 out of 600                    */
  ];
  HUNDRED.forEach(function (t) {
    var p = AQL.planFor(t[0], "II", t[1]);
    check("100% inspection", "lot " + t[0] + " @ AQL " + t[1],
      [p.hundredPercent, p.inspect], [t[2], t[3]]);
  });

  /* ================================================================== *
   * 6. General I and General III spot checks (same lot, three levels)
   * ================================================================== */
  var LEVEL_SPOT = [
    [1000, "I",   2.5, "G",  32,  2,  3],
    [1000, "II",  2.5, "J",  80,  5,  6],
    [1000, "III", 2.5, "K", 125,  7,  8],
    [1000, "S-1", 2.5, "C",   5,  0,  1],  /* letter C prints the 0/1 plan     */
    [1000, "S-2", 2.5, "C",   5,  0,  1],
    [1000, "S-3", 2.5, "E",  20,  1,  2],  /* letter E, down arrow -> F        */
    [1000, "S-4", 2.5, "F",  20,  1,  2]
  ];
  LEVEL_SPOT.forEach(function (t) {
    var p = AQL.planFor(t[0], t[1], t[2]);
    check("Levels", "lot " + t[0] + " " + t[1] + " AQL " + t[2],
      [p.codeLetter, p.sampleSize, p.accept, p.reject], [t[3], t[4], t[5], t[6]]);
  });

  /* ================================================================== *
   * 7. Guards
   * ================================================================== */
  check("Guards", "lot 0 rejected",        AQL.planFor(0, "II", 2.5).ok, false);
  check("Guards", "negative lot rejected", AQL.planFor(-40, "II", 2.5).ok, false);
  check("Guards", "NaN lot rejected",      AQL.planFor(NaN, "II", 2.5).ok, false);
  check("Guards", "non-number lot rejected", AQL.planFor("800", "II", 2.5).ok, false);
  check("Guards", "unknown level rejected", AQL.planFor(800, "Level II", 2.5).ok, false);
  check("Guards", "AQL off-table rejected", AQL.planFor(800, "II", 3).ok, false);
  check("Guards", "AQL 0.04 not implemented", AQL.planFor(800, "II", 0.04).ok, false);
  check("Guards", "lot 1 inspected whole",
    (function () { var p = AQL.planFor(1, "II", 2.5);
      return [p.ok, p.inspect, p.accept, p.hundredPercent]; })(), [true, 1, 0, true]);
  check("Guards", "lot 1200.7 floors to 1200",
    AQL.planFor(1200.7, "II", 2.5).sampleSize, 80);

  /* zero tolerance is a buyer clause, not a Z1.4 column */
  (function () {
    var p = AQL.planFor(1000, "II", 0);
    check("Zero tolerance", "flagged as outside the table", p.zeroTolerance, true);
    check("Zero tolerance", "sample size still from the table",
      [p.codeLetter, p.sampleSize, p.accept, p.reject], ["J", 80, 0, 1]);
  })();

  /* ================================================================== *
   * 8. Verdicts — computed from the table, never entered
   * ================================================================== */
  var VERDICTS = [
    /* lot, level, critAql, majAql, minAql, crit, maj, min, verdict */
    [1000, "II", 0, 2.5, 4.0, 0, 0, 0, "ACCEPT"],
    [1000, "II", 0, 2.5, 4.0, 0, 5, 7, "ACCEPT"],   /* exactly on both accept numbers */
    [1000, "II", 0, 2.5, 4.0, 0, 6, 7, "REJECT"],   /* majors hit Re = 6             */
    [1000, "II", 0, 2.5, 4.0, 0, 5, 8, "REJECT"],   /* minors hit Re = 8             */
    [1000, "II", 0, 2.5, 4.0, 1, 0, 0, "REJECT"],   /* one critical defect           */
    [1000, "II", 1.0, 2.5, 4.0, 2, 0, 0, "ACCEPT"], /* criticals at AQL 1.0: letter J, Ac 2 / Re 3 */
    [1000, "II", 1.0, 2.5, 4.0, 3, 0, 0, "REJECT"],
    [120,  "II", 0, 2.5, 4.0, 0, 1, 2, "ACCEPT"],   /* letter F: n 20, Ac 1 / Ac 2   */
    [120,  "II", 0, 2.5, 4.0, 0, 2, 2, "REJECT"],
    [35001,"II", 0, 1.5, 2.5, 0, 14, 21, "ACCEPT"],
    [35001,"II", 0, 1.5, 2.5, 0, 15, 21, "REJECT"]
  ];
  VERDICTS.forEach(function (t) {
    var r = AQL.inspect({
      lotSize: t[0], level: t[1],
      criticalAql: t[2], majorAql: t[3], minorAql: t[4],
      critical: t[5], major: t[6], minor: t[7]
    });
    check("Verdicts", "lot " + t[0] + " " + t[5] + "C/" + t[6] + "Ma/" + t[7] + "Mi",
      [r.ok, r.verdict], [true, t[8]]);
  });

  /* AQL 1.0 criticals on a 1000-lot: letter J, Ac 2 / Re 3 — so 2 accepts */
  check("Verdicts", "criticals at AQL 1.0 accept at exactly 2",
    AQL.inspect({ lotSize: 1000, level: "II", criticalAql: 1.0, majorAql: 2.5,
      minorAql: 4.0, critical: 2, major: 0, minor: 0 }).verdict, "ACCEPT");

  /* defect counts are clamped, never NaN */
  check("Verdicts", "blank / negative defect counts read as 0",
    AQL.inspect({ lotSize: 1000, level: "II", criticalAql: 0, majorAql: 2.5,
      minorAql: 4.0, critical: NaN, major: -3, minor: undefined }).verdict, "ACCEPT");

  /* sample to draw, and the mixed-sample-size case created by arrows */
  (function () {
    var r = AQL.inspect({ lotSize: 1000, level: "II", criticalAql: 0, majorAql: 2.5,
      minorAql: 4.0, critical: 0, major: 0, minor: 0 });
    check("Sample to draw", "one letter, one sample size",
      [r.sampleToDraw, r.mixedSampleSizes, r.codeLetter], [80, false, "J"]);

    /* lot 20 -> letter C. AQL 2.5 prints the 0/1 plan at C (n 5);
       AQL 6.5 has a down arrow at C (-> D, n 8): two different sample sizes. */
    var m = AQL.inspect({ lotSize: 20, level: "II", criticalAql: 0, majorAql: 2.5,
      minorAql: 6.5, critical: 0, major: 0, minor: 0 });
    check("Sample to draw", "arrows can give different sample sizes per class",
      [m.sampleToDraw, m.mixedSampleSizes,
       m.classes[1].plan.sampleSize, m.classes[2].plan.sampleSize],
      [8, true, 5, 8]);

    /* zero tolerance has no AQL column, so it covers the whole drawn sample */
    var z = AQL.inspect({ lotSize: 4, level: "II", criticalAql: 0, majorAql: 2.5,
      minorAql: 2.5, critical: 0, major: 0, minor: 0 });
    check("Sample to draw", "zero-tolerance criticals adopt the drawn sample",
      [z.sampleToDraw, z.classes[0].plan.inspect, z.classes[0].plan.hundredPercent,
       z.classes[0].plan.sampleSize],
      [4, 4, true, 2]);
    check("Sample to draw", "a single critical rejects the lot at zero tolerance",
      AQL.inspect({ lotSize: 8, level: "II", criticalAql: 0, majorAql: 2.5,
        minorAql: 4.0, critical: 1, major: 0, minor: 0 }).verdict, "REJECT");

    /* zero tolerance must not inflate the sample: letter Q would be 1,250, but
       the major and minor columns resolve up to N (500) and M (315) */
    var up = AQL.inspect({ lotSize: 600000, level: "II", criticalAql: 0, majorAql: 2.5,
      minorAql: 4.0, critical: 0, major: 0, minor: 0 });
    check("Sample to draw", "zero tolerance never enlarges the drawn sample",
      [up.sampleToDraw, up.classes[0].plan.inspect,
       up.classes[1].plan.inspect, up.classes[2].plan.inspect, up.mixedSampleSizes],
      [500, 500, 500, 315, true]);

    /* with no AQL column at all, fall back to the code letter's own sample */
    var allZero = AQL.inspect({ lotSize: 1000, level: "II", criticalAql: 0, majorAql: 0,
      minorAql: 0, critical: 0, major: 0, minor: 0 });
    check("Sample to draw", "all classes at zero tolerance fall back to the code letter",
      [allZero.sampleToDraw, allZero.classes[0].plan.inspect], [80, 80]);
  })();

  /* an off-table AQL makes the whole inspection unusable, not a guess */
  check("Verdicts", "off-table AQL gives UNKNOWN, not a number",
    (function () { var r = AQL.inspect({ lotSize: 1000, level: "II", criticalAql: 0,
      majorAql: 3, minorAql: 4.0, critical: 0, major: 0, minor: 0 });
      return [r.ok, r.verdict]; })(), [false, "UNKNOWN"]);

  /* ================================================================== *
   * Report
   * ================================================================== */
  var fails = results.filter(function (r) { return !r.pass; });
  var groups = [];
  results.forEach(function (r) { if (groups.indexOf(r.group) < 0) { groups.push(r.group); } });

  if (typeof document !== "undefined") {
    var tbody = document.getElementById("rows");
    var sum = document.getElementById("summary");
    if (sum) {
      sum.textContent = results.length + " assertions, " + fails.length + " failing";
    }
    if (tbody) {
      groups.forEach(function (g) {
        var inG = results.filter(function (r) { return r.group === g; });
        var badG = inG.filter(function (r) { return !r.pass; });
        var tr = document.createElement("tr");
        if (badG.length) { tr.className = "sub"; }
        var td1 = document.createElement("td");
        td1.textContent = g;
        var td2 = document.createElement("td");
        td2.className = "num";
        td2.textContent = inG.length;
        var td3 = document.createElement("td");
        td3.className = badG.length ? "num neg" : "num";
        td3.textContent = badG.length ? badG.length + " FAIL" : "pass";
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        tbody.appendChild(tr);
      });
      fails.slice(0, 40).forEach(function (r) {
        var tr = document.createElement("tr");
        var td = document.createElement("td");
        td.colSpan = 3;
        td.className = "neg";
        td.textContent = r.group + " / " + r.name + " — got " + r.got + ", want " + r.want;
        tr.appendChild(td);
        tbody.appendChild(tr);
      });
    }
  } else {
    groups.forEach(function (g) {
      var inG = results.filter(function (r) { return r.group === g; });
      var badG = inG.filter(function (r) { return !r.pass; });
      var line = (badG.length ? "FAIL " : "ok   ") + g + " (" + inG.length + ")";
      if (badG.length) { line += " — " + badG.length + " failing"; }
      console.log(line);
    });
    fails.forEach(function (r) {
      console.log("  FAIL " + r.group + " / " + r.name + "\n    got  " + r.got + "\n    want " + r.want);
    });
    console.log("\n" + results.length + " assertions, " + fails.length + " failing");
    if (typeof process !== "undefined") { process.exitCode = fails.length ? 1 : 0; }
  }
})();
