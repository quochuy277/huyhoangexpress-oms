# UTF-8 And Mobile Hardening Report 2026-04-08

## Scope Reviewed

- Dashboard shell
- Claims
- Delayed
- Attendance
- Todos
- Returns
- Overview
- Finance
- CRM

## UTF-8 Hardening

- Verified readable Vietnamese strings through focused encoding tests for:
  - `finance`
  - `crm`
  - `attendance`
  - `returns`
  - `todos`
  - `claims`
  - `delayed`
  - `orders`
  - shared source files
- Verified no obvious Mojibake matches inside touched `src/lib` files.
- A broad grep over touched component areas did not reveal new Mojibake regressions; one uppercase CRM badge string was a false positive due to the simplistic pattern.

## Mobile Hardening Notes

- Attendance tab navigation now supports horizontal overflow on small screens.
- CRM tab navigation now supports horizontal overflow on small screens.
- Finance tabs already used an overflow container and were preserved.
- Returns and Todos continue to use mobile-friendly stacked action areas after server-prefetch changes.
- Shell request deferrals from earlier phases remain compatible with mobile interactions such as bell dropdown and profile dialog.

## Remaining Manual QA Suggestions

- Check `/finance?tab=analysis` at `375px` and `390px` to confirm chart and filter sections remain comfortable to scroll.
- Check `/finance?tab=cashbook` at `375px` to confirm transaction filters and upload history remain readable.
- Check `/crm?tab=prospects` and `/crm` at `375px` to confirm tab switching and cards remain easy to use.
- Check `/returns`, `/todos`, and `/attendance` with actual data volume to confirm no unexpected horizontal overflow.

## Verification Evidence

- Encoding regression tests passed.
- Feature regression tests for prefetch changes passed.
- Production build passed after all Phase 3 changes.
