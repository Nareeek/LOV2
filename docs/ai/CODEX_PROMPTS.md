# Codex Prompt Templates

## Safe default prompt

Read `AGENTS.md` first.
Then read `docs/ai/TASK_ROUTER.md`.

Do not scan the whole repo.

Task:
<describe task>

Before editing, answer:

1. Which docs did you read?
2. Which source files will you inspect?
3. Which files are likely to change?
4. Which command will you run?
5. Which folders/files will you avoid?

Do not edit until the plan is clear.

## Code-edit prompt

Read `AGENTS.md` and `docs/ai/TASK_ROUTER.md`.

Task:
<describe exact change>

Rules:

- inspect only relevant files from the task router;
- do not scan unrelated folders;
- make the smallest safe change;
- run the smallest relevant Docker command;
- summarize changed files only.

## Debug prompt

Read `AGENTS.md`, `docs/ai/TASK_ROUTER.md`, and the failing error output.

Task:
<copy error>

Find the minimal relevant files.
Explain the root cause.
Patch only the needed files.
Run the smallest relevant check.