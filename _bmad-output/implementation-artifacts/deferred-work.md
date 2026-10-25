- source_spec: `_bmad-output/implementation-artifacts/spec-categories-crud.md`
  summary: Move `PageHeader` from `src/pages/questions/page-header.tsx` to a shared component folder.
  evidence: Categories pages now import it from the questions feature folder; a refactor of questions would break them.
