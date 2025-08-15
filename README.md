# Supabase React Website

A modern web application built with React, TypeScript, Tailwind CSS, shadcn UI, and Supabase authentication.

## Features

- 🔐 Authentication with Supabase (Login/Signup)
- 🛡️ Protected routes
- 📱 Responsive design with Tailwind CSS
- 🎨 Modern UI components with shadcn UI
- ⚡ TypeScript for type safety
- 🎯 React Router for navigation

## Setup Instructions

### 1. Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Update the `.env.local` file with your credentials:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

The app will run on [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   ├── layout/         # Layout components (Navbar, etc.)
│   └── ProtectedRoute.tsx
├── contexts/           # React contexts (Auth)
├── lib/               # Utilities and Supabase client
├── pages/             # Page components
└── App.tsx           # Main app component with routing
```

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **shadcn UI** - Component library
- **Supabase** - Backend as a Service
- **React Router** - Client-side routing
- **Lucide React** - Icons

## Next Steps

1. Configure Supabase authentication settings in your dashboard
2. Set up database tables if needed
3. Add more features like user profiles, data storage, etc.
4. Deploy to production (Vercel, Netlify, etc.)