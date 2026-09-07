# The runs, and every row that was read in the code

Command, once per project, with the repository as both the text root and the
searched code:

    said-vs-done done <repo> --code <repo> --only no-witness

## Density of what the tool needs

`sure/read` is first-person promises over client-facing sentences read;
`judgeable` is the share of those the tool reached any verdict on at all, which
is to say the share whose area had a venue in the searched code. A project can
score well on the first and nothing on the second, and then no accuracy is
measurable however good the tool is.

    project   textfiles  sentences  sure  edge  sure/read  judgeable  cov  no-wit  insp  elsew
    zulip          1246      17254   231   291       1.3%      82.7%  164       8    19     40
    matomo          635       2080    17    34       0.8%      58.8%    9       0     1      7
    joplin         4291      24363    74   287       0.3%      82.4%   54       0     7     13

## Zulip, 8 findings, all of them read

All eight, being fewer than ten. Every one `witnessWithoutTheNumber`.

 1  NOISE  docs/production/requirements.md:204 "we recommend 50 GB of disk for the
    OS, Zulip software, logs". Sysadmin documentation, and a recommendation
    rather than a promise. 50 is a hardware size.
 2  NOISE  docs/subsystems/caching.md:99 "We use this decorator in about 30 places
    in Zulip". An architecture note for contributors. 30 is a count of call sites.
 3  NOISE  templates/corporate/development-community.md:236, numbers 101 and 530
    lifted out of chat.zulip.org URLs, where they are channel identifiers.
 4  NOISE  templates/corporate/policies/privacy.md:315 "If we learn we have
    collected personal information from a child under thirteen (13) years of age
    we will delete it". A real promise, and Zulip keeps it: zerver/actions/users.py
    has do_delete_user, do_delete_user_preserving_messages, and
    zerver/actions/message_delete.py has the messages. 13 is an age.
 5  NOISE  the same sentence again under `deletion` as well as `storage`. One
    sentence, two rows.
 6  NOISE  privacy.md:590 "notice about Privacy Policy changes at least 14 days in
    advance". An operational commitment no code implements or should. Filed under
    `access`, whose witnesses are entitlement checks, so the venue test passed on
    unrelated code.
 7  NOISE  terms.md:40, the same 14 days for the Terms.
 8  NOISE  terms.md:252 "We reserve the right to (1) block access to or remove
    material". A reservation is the opposite of a promise, and the 2 is the
    enumerator "(2)".

## Matomo, 0 findings

Earned as far as it goes, and short of where it should have gone. PRIVACY.md is
12 units and 30 sentences of instructions to an administrator, not promises to a
customer: "in this section we document how to protect the privacy of visitors".
It yielded one `sure` promise. There is nothing there to break.

But Matomo's customer-facing copy is not in Markdown. It is 66 `lang/en.json`
files, 5590 strings, 5058 sentences, holding 5 `sure` and 61 `edge` promises the
collector never opened, among them "We will not share it with anyone else or use
it for any other purpose." The collector reads .html, .js/.ts and .md. A project
that keeps its copy in .json is invisible to it, and Matomo is such a project.
So: the zero is honest about what was read and silent about what was not.

Raised to `--tier all`, one row appears, and it is noise: CHANGELOG.md:1368,
where 400 is an HTTP status code.

## Joplin, 0 findings by default, and the default was wrong

Every sentence in readme/privacy.md has the product as its subject: "The Joplin
applications do not send any data", "Joplin saves geo-location information".
Zero `sure`, four `edge`. The default tier judges `sure` only, so the run had
nothing to say.

Raised to `--tier all`, four rows, and two of them are real:

 1  TRUE   packages/server/src/views/index/help.md:70 says disabled accounts are
    deleted "99 days after they have been disabled". The privacy policy served to
    users by packages/server/src/routes/index/privacy.ts:56 says "after 100 days".
    The code says neither: env.ts has USER_DATA_AUTO_DELETE_AFTER_DAYS = 90,
    UserDeletionService.autoAddForDeletion queues accounts whose disabled_time is
    older than that and schedules them for Date.now() + 3 * Day, which is 93.
    Three numbers for one retention period, two of them shown to customers.
 2  TRUE   readme/api/references/rest_api.md:536 "Events are kept for up to 90
    days." env.ts has EVENTS_AUTO_DELETE_AFTER_DAYS = 30, and
    EventModel.deleteOldEvents deletes everything older than that. Documented
    retention is three times the implemented one.
 3  NOISE  readme/about/changelog/server.md:372, where 5529 is a GitHub issue
    number in a changelog line.
 4  NOISE  readme/news/20220308-gsoc2022-start.md:11, where 2022 is a year inside
    a URL.

Both true rows carry the caveat that these are the repository's defaults and
Joplin Cloud's production configuration is not in the repository. The 99-against-
100 contradiction between two documents in the same tree needs no such caveat.

Both true rows also came with useless evidence. The tool cited TinyMCE language
files and eslint.config.js as the places it had looked. The verdict was right and
the citation was worthless, which are separable faults and only one of them was
caught by the resilience layer.

## Every no-witness row, every run

Counting the excursions, the three projects produced 34 distinct `no-witness`
rows. The reason on all 34 is `witnessWithoutTheNumber`. No other reason fired
once.

---

# Third measurement, after the two changes

Same criterion, new material, and the collector now reads .json. The default
tier returned nothing on all three, so each was raised to `all` as the criterion
requires.

    project   promises  covered  no-witness  inspect  elsewhere
    outline         94       85           0        5          4
    immich         192      170           2        6         14
    clients        363      300          14       15         34

Sixteen rows. **Zero true defects.** The sixteen rows are four distinct promises.

## Bitwarden clients, 14 rows, 2 promises, all false

 1  "Items you delete will appear here and be permanently deleted after 30 days"
    and its translations — 12 rows.
 2  "Unclaimed domains are removed after 7 days" and its Polish translation —
    2 rows.

Both are server-side retention periods. Bitwarden's server is a separate
repository; `bitwarden/clients` holds no scheduled jobs at all — grep finds no
cron, no background deletion, and the only "30 days" in its TypeScript is an
unrelated Send expiry preset in `send-controls.component.ts`. The right verdict
is `elsewhere`. The tool said `no-witness`.

THE VENUE TEST IS TOO COARSE, and this is the same failure the tool was built to
avoid wearing a new disguise. It asks "does this repository contain deletion
machinery" and the clients repo does — it deletes ciphers, it clears local
storage. It cannot ask "does this repository contain the machinery for THIS
deletion", which is the question that matters. Naming the right repository was
fixed by `--code`; naming the right repository FOR A GIVEN PROMISE is not.

## immich, 2 rows, 1 sentence, false

`i18n/pl.json:854`, key `delete_dialog_alert_local_ios`. The English original:
"These items will be deleted from Photos, but will still be available on the
Immich server. They will be in Recently Deleted for 30 days." That is a
description of Apple Photos' own Recently Deleted album. immich neither
implements it nor could. Flagged twice, once under `deletion` and once under
`storage`.

## outline, 0 rows, and the zero is earned

94 promises, 85 covered, none accused. Checked rather than assumed: the only
duration-bearing customer copy in outline's translation table is "This link will
expire in 24 hours", and the expiry machinery is in the same repository. Outline
does have 60-day and 90-day permanent deleters in `server/commands`, but no
sentence anywhere tells a customer about them — so there is nothing to check,
and reporting nothing is right.

## A third defect this measurement exposed: one promise, many rows

Fourteen rows were two promises. The identity of a promise includes its
language, so a commitment translated into thirty languages is thirty findings,
and a trailing full stop makes a further one. "First ten findings" on Bitwarden
means ten translations of one sentence, which is not ten findings.
