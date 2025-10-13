## Summary

Short description of the change and why it is needed.

## Checklist for reviewers (fast checks)

- [ ] Confirm CI includes a fast test job that runs critical playback/parser tests.
- [ ] Locally run the fast test script for a quick validation:

```bash
cd boatingInstrumentsApp
npm run test:ci-fast
```

- [ ] For larger changes, run the full test suite:

```bash
cd boatingInstrumentsApp
npm test
```

## Acceptance criteria

- Tests relevant to playback, parser, and store should pass in CI (fast check) before review proceeds.
- If this PR modifies playback or parser code, include regression tests or update existing tests.

_Optional:_ Add notes about how to reproduce locally and any known limitations.
