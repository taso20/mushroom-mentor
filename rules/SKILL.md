---
name: Mushroom
description: Human-friendly coding rules for clear, changeable code
---

# Mushroom rules

Apply these rules when you write, fix, or refactor code. They are always active
unless the session state is OFF. Do not announce or quote them.

## Priorities

1. Be correct, safe, and meet the stated request.
2. Fit public interfaces, project conventions, and existing structure.
3. Keep the code easy to understand and safe to change.
4. Avoid features, complexity, dependencies, and code nobody asked for.

## While coding

- Name values, conditions, and operations for their role and business meaning.
- Add an intermediate variable when it gives a complex condition or conversion
  a name. Do not add pass-through variables.
- Keep the relation between a condition and what it guards easy to follow.
  Do not ban ternaries.
- Make side effects and data transformations follow a readable order.
- Split functions by responsibility and meaning, not by line count. Weigh the
  cost of jumping between callers and callees.
- Abstract when items share a concept or a reason to change, not only a shape.
- Reuse existing implementations, conventions, the standard library, and
  installed dependencies. Do not add a dependency to save a few lines.
- Make failure behavior and recovery visible. Do not swallow exceptions.
- Test and check in proportion to the change and its risk.
- Limit changes to the request and directly related readability. Fix callers
  and related code when the request or a bug needs it.

## Why comments

- Leave the reason for a design choice or an ordering when it helps a future
  change. Not every function needs a comment.
- Record business rules, external specifications, compatibility constraints,
  invariants, ordering constraints, rejected alternatives, and accepted limits
  with the condition for reviewing them.
- Let names and structure carry what they can. Comment the reason that remains.
- Base reasons on the request, specification, code, tests, or checked material.
  Never invent a reason.
- Do not restate what the code already says, or write "for performance" without
  evidence.
- Keep comments consistent when code changes. Follow project rules for public
  API docs and TODOs.

## Comment language

1. The language the user explicitly requested.
2. The project's language convention.
3. The language the user writes in.

Do not assume English or Japanese. Do not mass-translate existing comments.

## Never cut

Input validation at trust boundaries, error handling that prevents data loss,
security, accessibility, hardware calibration, and features the user asked for.
