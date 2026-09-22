// said-vs-done — the four states a run can leave behind, in one shape.
//
// The same field, spelled the same way, in all four of these tools. A person
// reading the terminal can tell "eight promises nothing keeps" from "no policy
// text found". A build gets one number, and without this the two arrive
// identical.
//
// HERE THE FOUR STATES ARE ALREADY THE FOUR VERDICTS, one to one, and that is
// not a coincidence: the verdicts were chosen for the same reason the states
// were — because a two-state tool has to call a question an accusation.
//
//   covered      -> explained       something in the code keeps this promise
//   no-witness   -> actionable      the machinery is here and nothing does it.
//                                   The only verdict that accuses anybody.
//   elsewhere    -> notApplicable   the code that would keep it is not in this
//                                   repository, so this run has no opinion
//   inspect      -> unreachable     the promise is a denial. Absence of code
//                                   proves nothing, and a person has to look.
//
// AND `unreachable` HERE IS TWO DIFFERENT THINGS WEARING ONE NAME.
//
// `inspect` is a question the tool cannot answer about material it read
// perfectly well, and it is the NORMAL state of healthy input: every privacy
// policy on earth says "we do not sell your data". Measured on the pinned
// corpora, with not one accusation between them:
//
//   matomo   covered 27   no-witness 0   inspect 5
//   joplin   covered 125  no-witness 0   inspect 9
//
// "No text was found" is a different animal: the tool did not read anything,
// so it has no business returning any verdict at all.
//
// Both belong in `unreachable` — the tool cannot tell you either way — so the
// four numbers stay the four numbers, and mean in this tool what they mean in
// the others. But only one of them may decide an exit code, and the breakdown
// below is how a reader and a build can see which is which. Without it, the
// same word would silently mean "a parse error" in looks-clean and "a denied
// promise" here, and a CI job written against one would be wrong about the
// other.
export function summaryOf(counts, { textRead = 1, codeFiles = 1 } = {}) {
  const n = k => (typeof counts[k] === 'number' ? counts[k] : 0);

  // NOTHING READ AT ALL. No promise text found, or no code to search: the run
  // examined nothing and proved nothing, and the sentence it prints about that
  // must not be contradicted by a 0 exit code. Counted as one — the root is
  // the thing that could not be read.
  const couldNotBeRead = (textRead === 0 || codeFiles === 0) ? 1 : 0;
  const aQuestionForAPerson = n('inspect');

  return {
    actionable: n('no-witness'),
    explained: n('covered'),
    notApplicable: n('elsewhere'),
    unreachable: aQuestionForAPerson + couldNotBeRead,
    unreachableIs: { aQuestionForAPerson, couldNotBeRead },
  };
}

/**
 * The exit code a finished run deserves.
 *
 * DIFFERENTIAL BY DEFAULT. A project with eight promises nothing keeps is red
 * every day under a state gate, and a build that is red every day teaches
 * people to switch the tool off. So the default reports what is NEW, and
 * `--fail-on-state` is there for anyone who wants the other contract.
 *
 * `2` MEANS SOMETHING COULD NOT BE READ, and nothing was actionable — word for
 * word the rule in looks-clean, once `unreachable` is split into its two
 * halves. A question the tool cannot answer is not a failure to look, and the
 * tool's own comment on this exit code said so before the field existed:
 * `elsewhere` and `inspect` are questions, not answers, and a build must not
 * fail on a question.
 *
 * Keying on the whole of `unreachable` instead was tried and measured: matomo
 * and joplin would have exited 2 forever, over material read perfectly well.
 */
export function exitCodeFor(summary, { newActionable, failOnState = false }) {
  if (summary.unreachableIs.couldNotBeRead > 0 && summary.actionable === 0) return 2;
  if (failOnState) return summary.actionable > 0 ? 1 : 0;
  return newActionable > 0 ? 1 : 0;
}
