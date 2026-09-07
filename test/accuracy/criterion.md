# Accuracy measurement — the criterion, written down before the tool was run

Recorded 2026-09-07, before any third-party repository was cloned or scanned.
The point of writing it first is that a criterion invented after seeing the
output is not a criterion, it is a description of the output.

## What counts as a finding

The tool prints four verdicts. Only one of them is an accusation:

  no-witness   the machinery this promise lives in IS in this repository and
               nothing in it keeps the promise. Exits 1. THIS IS THE FINDING.
  elsewhere    the machinery is not here; the tool says so and settles nothing
  inspect      a negated promise with counter-witnesses, listed for a human
  covered      a witness was found

The denominator is `no-witness` only. Counting `elsewhere` as a finding would
inflate accuracy with rows the tool has already labelled "I cannot tell" — that
is exactly the blunt criterion that made the looks-clean number worth little.
`inspect` is counted and reported separately, as a question rather than a claim.

## True defect vs noise

TRUE DEFECT — I open the code the tool cites, and one of these holds:
  a. nothing in the repository does what the sentence says it does; or
  b. something does it, but not to the extent promised (the number differs, the
     scope is narrower, one of the listed items is missing); or
  c. the promise is negated and the repository plainly does the thing anyway.
It has to be something a maintainer would fix, in the code or in the sentence.

NOISE — everything else, including:
  * the sentence is not a promise about this software at all
  * a witness exists and the tool missed it
  * the promise is about a component genuinely outside this repository, and the
    tool said `no-witness` rather than `elsewhere`
For every noise row I record WHY the tool let it out, in one line.

Unverifiable rows are counted as noise, not dropped. A row I cannot settle is
not a row that came out right.

## Density — what this tool actually needs

Not "how many files" and not "how many sentences". The tool needs
FIRST-PERSON PROMISES WHOSE SUBJECT MATTER HAS MACHINERY IN THE SAME
REPOSITORY. Both halves are load-bearing, so both are reported per project:

  sure/read      `sure`-tier promises found, over client-facing sentences read.
                 Measures whether the project speaks in the first person at all.
                 A privacy policy written entirely as "data is deleted" yields
                 promises the tool refuses to judge by default.
  judgeable      of those `sure` promises, the share whose area has a VENUE in
                 the searched code — i.e. the share the tool can reach a verdict
                 on at all. A project with 400 promises and no venue produces
                 400 x `elsewhere`, which is zero measured accuracy and no
                 defects found, however good the tool is.

A project is admissible material only if it has policy or terms text inside the
repository in a format the collector reads (.html, .js/.ts, .md — NOT .json and
NOT .yml) AND implementation code in the same repository. Both checked before
the run; the check is a `ls`, not a scan.

## Reporting rules, fixed in advance

* First ten `no-witness` rows per project, in the order the tool prints them.
  Fewer than ten means all of them, and the count is stated.
* Zero findings is a result and goes in the README with its reason, together
  with an answer to whether the zero is earned or whether the tool failed to
  look where it should have.
* Zero true defects is a result and goes in the README with its reason.
