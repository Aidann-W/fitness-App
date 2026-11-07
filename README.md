# Fitness App
CumulusFit ☁️🏋️‍♂️
HackRPI 2026 Submission | Track: Best Use of Gemini API & "In the Clouds" Theme

CumulusFit is an intelligent, cloud-synced workout management application designed to elevate your strength training. Powered by Next.js, Supabase, and the Google Gemini API, CumulusFit generates structured gym routines tailored to your athletic goals, provides real-time workout editing, and dynamically adapts exercise plans when gym equipment is busy or unavailable.

🌟 Key Features
1. 🤖 Gemini-Powered Routine Intelligence
Intake Wizard: Conversational and prompt-driven workout generation tailored to goals (e.g., vertical jump power, hypertrophy, rehabilitation), time limits, and target training days.

Structured JSON Engine: Uses Gemini API (gemini-2.0-flash) with forced JSON schemas to build deterministic, immediately editable workout cards.

2. 🔄 Smart Equipment Replacement Engine
On-the-Fly Substitution: Stuck waiting for a squat rack or leg press machine? Select any exercise and prompt Gemini for an instant replacement.

Biomechanics Matching: Gemini evaluates target muscle groups, movement patterns, and available equipment to output equivalent alternative exercises (e.g., swapping Barbell Back Squats for Bulgarian Split Squats + Heel-Elevated Goblet Squats).

3. ☁️ "In the Clouds" Cloud Storage & Multi-Device Sync
Supabase PostgreSQL Integration: Custom and generated routines persist instantly across all devices using jsonb document schemas.

Offline Fallback Caching: Local caching ensures workouts remain accessible even on spotty gym Wi-Fi.

4. ⚡ Interactive Workout Dashboard
Live Set/Rep CRUD: Edit sets, reps, rest intervals, and movement notes directly in the dashboard UI.

Preset Library: Instant access to pre-loaded splits like Push/Pull/Legs (PPL) and Vertical Power & Knee Durability.

🏗️ Architecture & Tech Stack
Plaintext
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BROWSER (Client Side)                                 │
│  React Components (Dashboard UI, Workout Editor, Equipment Swap Modal)      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ HTTP fetch('/api/...')
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  NEXT.JS NODE SERVER (Backend API Routes)                   │
│  src/app/api/generate-routine/route.ts   <──>   Google Gemini API         │
│  src/app/api/modify-routine/route.ts     <──>   Gemini Equipment Swap     │
│  src/app/api/routines/route.ts           <──>   Supabase PostgreSQL DB    │
└─────────────────────────────────────────────────────────────────────────────┘
Frontend: Next.js 16 (App Router), React 19, Tailwind CSS

Backend: Next.js Serverless API Routes (Node.js 20 LTS)

Database: Supabase (PostgreSQL with Row Level Security)

AI Engine: Google Gemini API (@google/genai SDK)
