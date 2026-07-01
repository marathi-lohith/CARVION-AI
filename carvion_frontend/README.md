# Carvion AI – Frontend Application (Modular SPA)

This directory contains the user interface components and logic for the **Carvion AI** platform, constructed as a React.js SPA utilizing Vite, Redux Toolkit, TanStack Query, Tailwind CSS, and Framer Motion.

## 🛠️ Technology Stack
- **Build Tool:** Vite
- **UI Libraries:** React (v18), React Router (v6), Redux Toolkit (global state), TanStack Query (v4 for server-state caching).
- **Interactive Layers:** Framer Motion (Transitions/Micro-interactions), React Icons, React Dropzone.
- **Analytics & Previews:** Recharts (Analytics and charts), React PDF (client-side PDF rendering).
- **Styling:** Tailwind CSS (configured for dynamic Light & Dark mode support).

## 🚀 Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environmental variables:
   ```bash
   cp .env.example .env
   ```
3. Boot the local development server:
   ```bash
   npm run dev
   ```
4. Build the production package:
   ```bash
   npm run build
   ```

## 📂 Folder Architecture
- `src/core/`: Layout wrappers (Standard, Auth, Admin) and route guards (Auth, Guest, Admin).
- `src/redux/`: Global store and state slice definitions (Auth, Theme, UI status).
- `src/components/`: Atomic common components (Glassmorphic cards, custom inputs, animated buttons) and feedback modules (modals, toasts).
- `src/features/`: Fully encapsulated feature areas (e.g. `auth/`, `resumes/`, `learning/`, `chatbot/`, `admin/`).
