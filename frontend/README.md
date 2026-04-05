# 🎓 Agentic TP Platform — MVP

AI-powered practical work platform for students and teachers. Built with **Next.js 14 App Router + TypeScript + TailwindCSS**.

---

## ⚡ Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

---

## 🔑 Demo Accounts

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Teacher | youssfi@enset.ma    | teacher123   |
| Teacher | ouhmidas@enset.ma   | teacher123   |
| Student | toubani@enset.ma    | student123   |
| Student | bahou@enset.ma      | student123   |
| Student | aymane@semlalia.ma  | student123   |

---

## 🗺️ Routes

| Route                       | Description                        |
|-----------------------------|------------------------------------|
| `/login`                    | Login page with demo account picker|
| `/teacher/dashboard`        | Teacher overview + student progress |
| `/teacher/create-tp`        | Create a TP with steps + quizzes   |
| `/teacher/assign-tp`        | Assign TPs to students             |
| `/student/dashboard`        | Student TP list with progress      |
| `/student/tp/[id]`          | Full TP flow (explain → IDE → quiz)|

---

## 📁 Architecture

```
agentic-tp-platform/
├── app/
│   ├── layout.tsx                # Root layout with AuthProvider + StorageProvider
│   ├── page.tsx                  # Redirects to /login
│   ├── globals.css
│   ├── login/page.tsx
│   ├── teacher/
│   │   ├── dashboard/page.tsx
│   │   ├── create-tp/page.tsx
│   │   └── assign-tp/page.tsx
│   └── student/
│       ├── dashboard/page.tsx
│       └── tp/[id]/page.tsx      # Orchestrates all 3 phases
│
├── components/
│   ├── Editor/CodeEditor.tsx     # Textarea editor with anti-cheat
│   ├── Preview/LivePreview.tsx   # Sandboxed iframe preview
│   ├── IDELayout/IDELayout.tsx   # Split IDE + timer + hints + validation
│   ├── TPExplanation/            # AI explanation + chat
│   └── Quiz/Quiz.tsx             # QCM with scoring
│
├── contexts/
│   ├── AuthContext.tsx           # Login/logout + routing
│   └── StorageContext.tsx        # Typed localStorage wrapper
│
├── data/
│   ├── mockUsers.ts
│   ├── mockTPs.ts                # 3 realistic TPs with steps + quizzes
│   └── mockAssignments.ts
│
├── services/
│   ├── authService.ts            # Session management
│   └── tpService.ts              # CRUD + AI explanation + progress
│
├── patterns/
│   └── InterpreterPattern/
│       └── index.ts              # TagExpression, AndExpression, TagValidator
│
└── types/index.ts                # All shared TypeScript types
```

---

## ✨ Key Features

| Feature              | Implementation                                    |
|----------------------|---------------------------------------------------|
| **Anti-cheat**       | `onPaste`, `onDrop`, `onContextMenu` blocked      |
| **Step timer**       | `setInterval` per step, persisted every 5s        |
| **Interpreter pattern** | `TagExpression` + `TagValidator` for HTML validation |
| **Hints system**     | Hints shown on failed validation, counter tracked |
| **AI clarification** | Mock `generateClarification()` — concept hints only |
| **Live preview**     | `iframe` with `contentDocument.write` on code change |
| **QCM quiz**         | Per-step questions, score saved to localStorage   |
| **Teacher dashboard**| Progress table: status, steps, time, hints, score |

---

## 🧩 Extending for Production

- Replace `localStorage` with a real API (e.g. Supabase, Firebase, or a custom backend)
- Replace `generateExplanation()` / `generateClarification()` with real Claude API calls
- Add proper auth with NextAuth or Clerk
- Add a real code editor like CodeMirror or Monaco
