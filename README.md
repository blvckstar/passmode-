# PASSMODE AI

AI-powered exam study companion with:
- AI tutor with four learning modes
- Original question generator with answers and explanations
- AI-generated seven-day revision timetable
- Browser notification reminders (site must remain open)
- Local progress tracking and study statistics
- Responsive dark interface

## Requirements
- Node.js 18 or newer
- An OpenAI API key with API access and billing configured

## Run locally
1. Extract the project.
2. Open a terminal in the project folder.
3. Run `npm install`.
4. Copy `.env.example` to `.env`.
5. Add your API key to `.env` as `OPENAI_API_KEY=...`.
6. Run `npm start`.
7. Visit `http://localhost:3000`.

**Never put the API key in `public/app.js` or any browser-side file.** Keep `.env` private and do not upload it to GitHub.

## Deploying
Deploy this Node app to a host that supports server-side Node.js (for example, Render or Railway). Add `OPENAI_API_KEY` and `OPENAI_MODEL` as environment variables in the host dashboard. A static-only host such as basic GitHub Pages or a static Netlify site cannot run this `server.js` API route by itself; it needs a separate backend or serverless function.

## Notes
- Study planner modules, chat display history, quiz performance, and settings are saved in the student's browser using localStorage. This starter version does not sync data between devices or students.
- Browser notifications require permission and generally work only on localhost or HTTPS. The site must stay open for the in-page reminder scheduler to run.
- AI output can be wrong. Students should cross-check course-specific information against prescribed material and lecturer guidance.
- For a public launch, add rate limiting, user authentication, privacy terms, abuse monitoring, cost limits, and server-side request validation before inviting lots of users.
