---
target: add-employee wizard
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:E:\\ระบบพนักงานเเละสวัสดิการ\\Pj_ver1_login\\src\\app\\hr\\employees\\add\\page.tsx"
target_fingerprint: "sha256:06ccdb8cf5a3d0cb7d052a4298911e82dd14b2f728c4ba68641354fee9fd0501"
target_path: "E:\\ระบบพนักงานเเละสวัสดิการ\\Pj_ver1_login\\src\\app\\hr\\employees\\add\\page.tsx"
timestamp: 2026-11-10T09-56-31Z
slug: src-app-hr-employees-add-page-tsx
closed: true
---
Method: dual-agent (A: design review · B: detector + browser overlay)

## Design Health Score: 23/40 (Acceptable)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Stepper is clear; "done" only means "visited"; save has no pending state |
| 2 | Match with real world | 3 | Thai dates good; prefix "อื่น ๆ" glued onto the name |
| 3 | User control and freedom | 2 | Refresh wipes everything; cancel has no dirty check |
| 4 | Consistency and standards | 3 | Neighbours use role="alert" error text; this page has none |
| 5 | Error prevention | 1 | Stepper bypasses validation; future birth date accepted |
| 6 | Recognition over recall | 3 | Review step removes memory load |
| 7 | Flexibility and efficiency | 2 | Five submits for about 20 fields |
| 8 | Aesthetic and minimalist | 3 | Calm, on-system |
| 9 | Error recovery | 1 | Native bubbles only, one at a time, no inline message |
| 10 | Help and documentation | 2 | Only two hints |

## Design specificity
Mostly category-interchangeable with product-grounded touches (step descriptions explaining why data is collected, Buddhist-era dates). The wizard says data determines welfare rights but never shows the resulting tier or limit.

Deterministic scan: CLI clean (0). Browser overlay: 1 finding, low-contrast 3.7:1, `.employee-step.is-current strong` using --primary-500 #3b82f6 on white (hr.css). Real, no false positives.

## What's working
- Correct semantics: ol stepper, aria-current, focus moves to step heading.
- Review step: dl markup, contextual edit labels, long names wrap, no overflow at 375px.
- Stays inside the existing system (card, 44px fields, footer, blue primary).

## Priority issues
- [P0] Stepper buttons call goToStep directly and skip validation; invalid data reaches save.
- [P1] Validation is native bubbles only; no inline errors, aria-invalid, or date rules.
- [P1] All progress lost on refresh or accidental cancel.
- [P2] Stepper: current label contrast 3.7:1, state by colour only, disabled looks enabled, 13px-high mobile targets.
- [P2] Review: "อื่น ๆ" prefix glued to name, no pending state on save, 31x29px edit link.

## Persona red flags
- Jordan: transient error bubbles, no persistent mark; "สมรส" asks nothing about a spouse.
- Sam: no live announcement of errors; thin focus styling.
- Casey: reload wipes the form; tiny step and edit targets.

## Minor observations
Body max-width misaligns with stepper/footer; จำนวนบุตร full width; "ชื่อ-บิดา" hyphen labels; "วัน/เดือน/ปี เกิด" differs from review "วันเกิด".

## Questions to consider
- Do about 20 fields justify five screens for a trained HR officer?
- Should the computed entitlement be the centrepiece of the review step?
- Should religion and parents' names be deferred to the edit page?
