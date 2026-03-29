<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# JAN-VAANI

AI civic copilot for complaint drafting, routing, evidence support, status tracking, and dashboard analytics.

## New Civic Intelligence Features

1. AI Complaint Improver: converts raw text or speech into a structured civic complaint with `Issue`, `Location`, and `Request`
2. Auto Department Routing: routes complaints using a simple scalable JSON mapping plus AI fallback
3. Smart Evidence Builder: appends voice transcript and image evidence summary into an `Evidence Section`
4. Follow-up & Escalation: stores complaints as `pending` and auto-marks them `follow-up required` after 3 days
5. Civic Dashboard: total complaints, category chart, status summary, recent complaints, and map markers

## Folder Structure

```text
src/
  controllers/
    complaintController.js
  cron/
    followUpCron.js
  data/
    department-routing.json
  db/
    mysql.js
    complaints.sql
  routes/
    complaintRoutes.js
  services/
    aiService.js
    complaintService.js
  pages/
    ComplaintPage.jsx
    DashboardPage.jsx
```

## Database Schema (MySQL)

Run this SQL:

```sql
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  text_original TEXT,
  text_improved TEXT,
  category VARCHAR(120),
  department VARCHAR(255),
  evidence_text TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  latitude FLOAT,
  longitude FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Also available at: `src/db/complaints.sql`.

## Environment Variables

Set these in `.env`:

```env
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
HOST=0.0.0.0

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=janvaani
```

## Run Locally

Prerequisites: Node.js 20+, MySQL 8+

1. Install dependencies:
   `npm install`
2. Create DB and run schema (`src/db/complaints.sql`)
3. Add `.env` values
4. Start app:
   `npm run dev`
5. Open:
   `http://localhost:3000`

## User Flow

1. Enter a complaint or use `Voice Input`
2. Click `Improve Complaint`
3. Click `Auto Route` to detect category and department
4. Upload an image or add voice evidence, then click `Build Evidence`
5. Submit and track `Pending`, `Follow-up Required`, or `Resolved`
6. Visit `/dashboard` for analytics

## API Summary

- `POST /api/improve`
  Body: `{ "text": "raw complaint" }`
- `POST /api/classify`
  Body: `{ "text": "complaint text" }`
- `POST /api/evidence`
  Multipart form-data: `image` (optional), `voiceText` (optional)
- `POST /api/complaints`
  Body: `{ text_original, text_improved, category, department, evidence_text, latitude, longitude, status }`
- `GET /api/complaints/status`
- `GET /api/dashboard`

## Notes

- AI calls use Gemini when `GEMINI_API_KEY` is present, otherwise OpenAI when `OPENAI_API_KEY` is present; safe fallback text is used if neither is configured.
- Cron updates complaints older than 3 days from `pending` to `follow-up required`.
- Recent UI structure is preserved. The new features are layered into the existing complaint flow and dashboard.

## Backend Docker Quick Start (Windows)

If you see `The system cannot find the path specified` while doing `cd backend`, use absolute path:

`cd /d C:\Users\DELL\OneDrive\Desktop\janvaani\backend`

Then run:

`docker compose up --build`

You can also use one-click scripts from project root:

- `run-backend-docker.bat`
- `run-backend-local.bat`
