# The material, as it stood when it was measured

Three open-source projects, none of them the author's, each chosen because it
keeps policy or terms text INSIDE the repository in a format the collector reads
and keeps the implementing code in the same repository. Both halves checked with
`ls` before the tool was run once.

    zulip/zulip        b6d0518d2a3a87afa3eed6b38c342980c03580f9   2026-07-30
    matomo-org/matomo  1c53e796275facab0bd3ca1ba8c05ec9c6f4cda2   2026-09-07
    laurent22/joplin   71d4b09d48d78d1dc71d1d04dcea2f64d3c0aaee   2026-09-07

Shallow clones on Windows. Some paths were too long for the filesystem and did
not check out: Stripe test fixtures and generated report snapshots (.json, .xml,
.html under tests/), one Django migration with a very long name, and the CUDA
template instances of a vendored whisper.cpp. The collector does not read any of
those extensions from those directories and the code index skips test trees, so
nothing missing was material to a verdict. It is written down anyway, because a
measurement that quietly drops part of its input is the thing this tool exists
to catch.

## Why these three

  Zulip   templates/corporate/policies/{privacy,terms,rules}.md is a real
          first-person policy, and the server that must keep it is in the same
          repository. The shape the tool was built for.
  Matomo  PRIVACY.md at the root, PHP and JavaScript beside it. A project whose
          whole pitch is privacy, so the promises should be dense. If the tool
          cries wolf anywhere, here.
  Joplin  readme/privacy.md plus a TypeScript codebase in the same repository,
          and promises about storage, transmission and encryption, which are
          areas the witness table knows.

## Rejected, and why

  documenso    policy is .mdx; the collector reads .md and would have found none
  cal.com      only a link to the policy lives in the repository
  formbricks   same
  standardnotes same
  cryptpad     no policy text in the repository at all
  PrivateBin   same
  umami        same
  element-web  only a test fixture pretending to be a policy
