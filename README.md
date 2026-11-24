# AQL sampling calculator and inspection logger for garment QC

A single-page, offline tool that does the three-step AQL lookup for a finished-garment
lot and records the result:

1. **Lot size + inspection level → sample size code letter** (ANSI/ASQ Z1.4 Table I).
2. **Code letter → sample size** (Table II-A).
3. **Sample size row + AQL column → acceptance number `Ac` and rejection number `Re`**
   (Table II-A, single sampling, normal inspection).

You then enter the defects found in the sample, split into **critical / major / minor**,
and the page returns an **ACCEPT** or **REJECT** verdict for the lot. The verdict is read
off the table — there is no field to type a verdict into, and no accept number is
calculated, rounded or interpolated anywhere in the code.

Each inspection can be logged. The log stays on the device, shows up on the page, and
prints with it, so the printed sheet is a complete inspection report for the buyer:
lot size, level, code letter, sample drawn, defects by class, the accept number for each
class and the verdict.

## Who it's for

Garment QC inspectors, factory final-inspection desks and buying-house QA — the people
who currently read these numbers off a dog-eared photocopy of the table, and for whom
pulling the wrong sample size or the wrong accept number can lose a whole shipment at a
buyer audit.

## The standard

**ANSI/ASQ Z1.4**, *Sampling Procedures and Tables for Inspection by Attributes* (the
civilian successor to MIL-STD-105E), harmonised with **ISO 2859-1**, *Sampling procedures
for inspection by attributes — Part 1: Sampling schemes indexed by acceptance quality
limit (AQL) for lot-by-lot inspection*.

The tables are encoded as named constants in one place, `assets/aql.js`:
`LOT_BANDS`, `CODE_LETTERS` (Table I), `SAMPLE_SIZES` and `ACCEPT_REJECT_NORMAL`
(Table II-A). Nothing else in the project holds a sampling number.

### Exactly what is implemented

* **Inspection levels — all seven columns of Table I:** S-1, S-2, S-3, S-4,
  General I, General II, General III. **General II is the default**, which is what a
  buyer's clause usually means when it does not say.
* **AQL values — 13 Table II-A columns:** 0.065, 0.10, 0.15, 0.25, 0.40, 0.65, 1.0,
  1.5, 2.5, 4.0, 6.5, 10 and 15 per cent nonconforming. Plus a **zero-tolerance**
  setting for critical defects, which is clearly marked in the tool as a buyer clause
  and **not** a Z1.4 column.
* **Lot sizes** from 2 to over 500,000, i.e. all fifteen Table I rows. A lot of 1 is
  below the first row of the table, so the tool says inspect the piece.
* **Arrows, including the ones stranded mid-column.** Where Table II-A prints an arrow
  instead of a plan, the arrow is followed: `↓` takes the first plan *below* it and `↑`
  the first plan *above* it, which changes the code letter and the sample size as well
  as the accept number. These are not only at the edges of the table: the
  zero-acceptance plans sit three diagonal steps from the `Ac 1` plans rather than one,
  so every AQL column carries an up arrow and a down arrow directly beneath its
  `Ac 0 / Re 1` entry. At AQL 2.5 the `0 / 1` plan is code letter `C` (5 pieces); `D`
  points back up to `C` and `E` points down to `F` (20 pieces, `Ac 1 / Re 2`). Reading
  the column as a plain ladder gives a 13-piece sample at `Ac 0` that the standard never
  prints. The zero-acceptance plan by column is: 0.065→L(200), 0.10→K(125), 0.15→J(80),
  0.25→H(50), 0.40→G(32), 0.65→F(20), 1.0→E(13), 1.5→D(8), 2.5→C(5), 4.0→B(3), 6.5→A(2);
  the AQL 10 and 15 columns have none. The tool names the arrow it followed and the
  letter it landed on.
* **100 per cent inspection.** The note under Table II-A reads: “If sample size equals,
  or exceeds, lot or batch size, do 100 percent inspection.” The tool applies that and
  says so on screen and in the printed report.
* **One plan per defect class.** Critical, major and minor are each judged against their
  own AQL column. Because arrows are followed per column, two classes can resolve to
  different sample sizes; the tool shows each and tells you to draw the largest.

### Exactly what is *not* implemented

* **Tightened inspection (Table II-B), reduced inspection (Table II-C) and the switching
  rules** between normal, tightened and reduced. This tool always applies **normal**
  inspection. If a buyer has switched you to tightened inspection, these accept numbers
  do not apply — read Table II-B.
* **Double and multiple sampling plans** (Tables III and IV). Single sampling only.
* **AQL columns below 0.065 and above 15.** Picking an AQL outside the implemented set
  is refused with a message rather than approximated.
* **Limiting quality, AOQL and average-sample-size tables.**
* **Defect photographs.** The log takes a free-text note of the main defects seen, not
  images.

## Run it

It is a static page with no dependencies and no network calls.

```sh
python3 -m http.server 8137
```

Then open <http://localhost:8137/>. Works offline; the inspection log is kept in the
browser's local storage on that device only and is never uploaded.

## Tests

The rules live in a pure module with no DOM and no storage, so they can be exercised on
their own. The suite is table-driven: it re-states Table I and Table II-A independently
and asserts every implemented cell, both edges of every lot-size band (the row above and
the row below each break), every arrow case — including the up/down pair stranded under
each column's zero-acceptance plan — the 100 per cent inspection rule and the
accept/reject verdicts — 778 assertions. Two structural invariants back the cell-by-cell
table up: the rejection number is always the acceptance number plus one, and every
diagonal of constant `n × AQL` holds a single value, arrows included, so one mistyped
cell breaks two diagonals at once.

```sh
node tests/aql.test.js        # headless
```

or open `tests/index.html` in the browser for the same suite with a summary table.

## Honesty note

The tables here cover **normal, single sampling** at the levels and AQL values listed
above, and every implemented cell was checked against the published standard — a scan of
the master tables plus an independent commercial reproduction, which agree cell for cell
— but this is a convenience tool and not a copy of the standard.
**Your buyer's own AQL clause governs.**
The inspection level, the AQL for each defect class, how a defect is classified as
critical, major or minor, and any switch to tightened inspection are all the buyer's to
set; where this tool and a signed clause disagree, the clause wins.

An AQL plan is a sampling decision, not a measurement of the whole lot: a lot that passes
still contains defects, and a lot that fails may be reworked and re-offered. Check the
numbers against the printed table before signing a report, and if your clause needs
tightened inspection, double sampling or an AQL column outside the set above, use the
standard itself.

MIT licensed.
