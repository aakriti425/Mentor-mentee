# GLBITM Student Attendance & Mentor Monitoring System

React + Vite + Tailwind (frontend) · Node + Express (backend) · Google Sheets (database)

## Google Sheet
Tab `Sheet1`, row 1 headers in this exact order:
Student Name | Roll Number | Mentor Name | Mentor Phone | Student Phone | Attendance | Date | Branch | Section | Address | City | State | PIN Code

Dates can be typed in any normal format (04/10/2026 or 2026-10-04). Extra tabs `mentors`, `remarks`, `pendingDeletions` are created automatically.
Share the sheet with the service-account email (Editor).

## Run locally
1. `backend/.env.example` -> copy to `backend/.env` and fill in (JWT_SECRET, ADMIN_PASSWORD, GOOGLE_SHEET_ID).
2. Put the service-account key at `backend/credentials/service-account.json`.
3. Terminal 1: `cd backend` then `npm.cmd install` then `npm.cmd run dev`
4. Terminal 2: `cd frontend` then `npm.cmd install` then `npm.cmd run dev`
5. Open http://localhost:5173

## Deploy (Render, one service)
Build command `npm run build` · Start command `npm start`
Environment variables: JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, GOOGLE_SHEET_ID, GOOGLE_SHEET_RANGE (Sheet1!A:M), GOOGLE_CREDENTIALS (whole JSON key on one line).

## First login
Admin: the ADMIN_USERNAME / ADMIN_PASSWORD you set (defaults admin / admin123 - change them).
Mentors: admin clicks "Add Mentor". Existing mentors keep their old passwords (auto-upgraded to hashed).
# Mentor-mentee
