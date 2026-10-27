# AGENTS.md — Rules for any AI agent working on FitVision

Applies to every AI tool (Antigravity, Claude, Gemini, Codex, Copilot, etc.).
Read this file fully before doing anything. These rules override your defaults.

---

## 0. First 3 actions of EVERY session

1. Read `PROJECT_STATE.md` (what is done, what is next, known issues).
2. Read this file.
3. Reply with a **Change Plan** (see section 2). Do NOT edit anything yet.

If `PROJECT_STATE.md` is missing or looks outdated, say so and ask the user.

---

## 1. Project in one paragraph

FitVision = browser-based AI fitness coach. Camera -> MediaPipe pose -> joint angles
-> Random Forest state classifier -> debounced rep counter + form feedback.
Backend = FastAPI (auth, sessions, DB). Frontend = not built yet (planned Next.js +
MediaPipe.js). Video never leaves the browser; only angles / results go to the backend.
Full details: `PROJECT_STATE.md`.

---

## 2. Change Plan (required BEFORE any edit)

Before touching code, send the user this, then WAIT for approval ("ok", "go", "approved"):

```
CHANGE PLAN
Goal: <one line>
Files I will MODIFY:   <path> - <why>
Files I will CREATE:   <path> - <why>
Files I will DELETE:   <path> - <why>   (default: none)
Files I will NOT touch: everything else
Dependencies changed:  <none | list>
Risks / what could break: <short>
Tests I will run: <commands>
```

Rules:
- No approval = no edits. Questions and read-only investigation are always allowed.
- If during work you discover you need another file, STOP and send an updated plan.
- Never "while I'm here" fix, rename, reformat, reorder imports, or refactor anything outside the plan.

---

## 3. Scope lock (do not touch other things)

- Change only the files listed in the approved plan.
- Working code stays as is. Do not "improve" it unasked.
- No drive-by formatting, comment rewrites, or renames.
- No new dependencies, version bumps, or config changes unless in the plan.
- No new folders or files outside the plan.
- If something unrelated looks broken, do NOT fix it. Add it to "Known issues" in
  `PROJECT_STATE.md` and tell the user.

### Protected (never modify unless the plan names them explicitly)
- `models/*.pkl` (trained models; retrain only when asked)
- `data/` (datasets), `raw_videos/`, `logs/`
- `Backend/tests/` existing tests (never edit a test just to make it pass; say why if a test must change)
- `.env` files and any secrets (never read out, print, or commit them)

---

## 4. Contracts that must not break silently

If a change touches any of these, call it out in the Change Plan under Risks:

1. **Feature order**: the classifier input order = insertion order of `config["signals"]`.
   Changing order or names breaks every trained model.
2. **Two copies of exercise config**: `src/exercises_config.py` and
   `Backend/app/exercises_config.py` must stay in sync until they are merged.
3. **Two copies of RepCounter**: `src/live_predict.py` and
   `Backend/app/services/rep_counter.py` must behave identically
   (`STABLE_FRAMES_REQUIRED = 4`, same count direction, same range checks).
4. **API shapes** in `Backend/app/models/schemas.py`: changing a field breaks the frontend.
   Prefer adding fields over renaming/removing.
5. **Count direction**: squat/pushup count on reaching "up"; situp/pullup/jumpingjack/
   latpulldown count on reaching "down".
6. **sklearn version**: models were trained with scikit-learn 1.9.0. Backend must match.
7. **Auth**: never weaken auth, hashing, token checks, or rate limits.

---

## 5. How to work

- Smallest change that solves the problem.
- When debugging, give COMPLETE file replacements, not partial patches, unless the user asks otherwise.
- Instructions to the user: numbered, one action per step, short.
- Be concise. No long explanations unless asked. Explain with short, casual examples.
- User works on Windows (PowerShell, `venv\Scripts\activate`). Give Windows commands first.
- Folder is `Backend/` (capital B) in git. Docs may say `backend/`. Do not rename unless in plan.
- Ask one clear question when something is ambiguous. Do not guess requirements.
- Never invent results. If you did not run something, say "not run".

---

## 6. Testing

- Backend: from `Backend/` run `pytest`. Run BEFORE and AFTER changes; report both results.
- ML scripts run from `src/` (paths are relative, e.g. `../models/`).
- If tests fail after your change, fix your change; do not delete or loosen the test.
- Report honestly: what ran, what passed, what was not tested.

---

## 7. Git

- One task = one branch (`feat/...`, `fix/...`, `chore/...`). Do not work directly on `main`.
- Small commits, clear messages: `type: short description`.
- Commit automatically after each completed, tested task (on the task branch only).
  Always include `PROJECT_STATE.md` in that commit.
- Pushing the task branch is allowed if the tool can do it. Never push to `main`, merge,
  force-push, or rewrite history without the user saying so.
- Never commit secrets, `.env`, `*.db`, `venv/`, `__pycache__/`.
- If the agent cannot push, give the user the exact commands to run.

---

## 8. Security basics

- No secrets in code or logs. Use env vars (`Backend/.env.example` shows the names).
- Do not use the dev JWT secret for anything real.
- New endpoints are protected by default (`Depends(get_current_user)`) unless the plan says public.
- Validate all input with Pydantic schemas.

---

## 9. KEEP STATE UPDATED AUTOMATICALLY (mandatory)

The agent updates `PROJECT_STATE.md` ITSELF by editing the file. Do not wait for the user
to ask and do not just print it. The session can end at any moment (usage limit), so:

- **After EVERY completed task** (not only at the end): update `PROJECT_STATE.md`
  (Done / In progress / Next, files changed, one-line Session Log row, Handoff prompt),
  then commit it together with the work (see section 7).
- **Before starting a big task**: set it to "In progress" in `PROJECT_STATE.md`, so if the
  session dies, the next AI knows what was half done.
- If you notice the usage limit is close, stop new work and do the full update immediately.

Full update checklist (also run when the user says "wrap up" / "save" / "handoff"):

1. Update `PROJECT_STATE.md`:
   - Bump "Last updated" and session number.
   - Move finished items to Done, update In progress / Next.
   - Update the progress percentages and Known issues.
   - Add decisions made (and open questions).
   - Append one row to the Session Log (date, tool/model, summary, files changed).
   - Rewrite the "Handoff prompt" section so a different AI can continue.
2. Commit the work and the updated `PROJECT_STATE.md` on the task branch (section 7).
   If you can push, push the branch (never `main`). If you cannot push, give the user
   the exact commands.
3. Tell the user in 3-5 lines: what was done, files changed, what is next. No need to print
   the whole state file unless asked.
4. List files changed this session so the user can verify against the Change Plan.

If you changed files that were not in the approved plan, say so clearly at the end.

---

## 10. Switching to another AI

If the user runs out of limit and moves to another tool:
- Give them the Handoff prompt from the bottom of `PROJECT_STATE.md`.
- The new agent must follow this same file and start from section 0.
