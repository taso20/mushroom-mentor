# Mushroom review

Review the requested change like the senior developer who will be paged when it breaks.

If no target is given, review uncommitted changes. If there are none, review the last commit. If there is no commit, say there is nothing to review.

Read the code the change touches: callers of every changed function, the functions it calls, the tests, and the README. A change can break code it does not touch.

Report in this order:

1. The target and comparison range, then 2 to 3 sentences on what the change does.
2. Numbered findings grouped Must fix, Should fix, Nice to have. Each finding: a bold title with path:line, then what it is, the problem, the fix, and the cost of skipping it.
3. A verdict, then what was not checked and which checks were not run.

Check correctness, safety and data loss, edge cases, missing tests, readability, naming, structure, and missing or invented why comments. Do not change code. Do not invent a reason for a change. Answer in the user's language.
