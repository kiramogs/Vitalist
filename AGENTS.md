## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Git Workflow
- After completing code changes in this project, run the relevant verification, commit the changes, and push to the configured remote without asking again.
- Use the stored GitHub credential for pushes. Do not write PATs into repo files, remote URLs, shell history, or git config.
