# GDG CTF Platform

A Capture The Flag (CTF) challenge platform built with React, TypeScript, and Supabase for Google Developers Group.

## Project Overview

GDG CTF Platform is a web-based platform for hosting cybersecurity and programming challenges. Participants can solve CTF challenges, track their progress, and compete on leaderboards.

## Features

- **CTF Challenge System**: Multiple cybersecurity and programming challenges with varying difficulty levels
- **Real-time Leaderboard**: Track participant rankings and scores
- **User Profiles**: Personal progress tracking and statistics
- **Admin Panel**: Comprehensive management tools for organizers
- **Certificate System**: Award certificates to top performers
- **Event Management**: Control event status and settings
- **Progressive Hints**: Help system for stuck participants

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom cyber-themed components
- **Backend**: Supabase (PostgreSQL database, authentication, storage)
- **Build Tool**: Vite
- **UI Components**: Shadcn/ui components

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gdg-ctf-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

### Building for Production

### Prerequisites for Production
- Node.js 18+ 
- All environment variables configured
- Supabase project set up with proper RLS policies

### Build Commands
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build locally
npm run preview
```

The built files will be in the `dist` directory.

### Production Deployment
1. Set up environment variables in your hosting platform
2. Build the project: `npm run build`
3. Deploy the `dist` folder contents to your web server
4. Configure your web server to serve `index.html` for all routes (SPA routing)
5. Ensure HTTPS is enabled
6. Test all functionality in production environment

### Hosting Recommendations
- **Vercel**: Zero-config deployment with automatic HTTPS
- **Netlify**: Easy deployment with form handling and redirects
- **AWS S3 + CloudFront**: Scalable static hosting
- **Firebase Hosting**: Google's hosting with CDN

### Performance Optimizations Included
- ✅ Code splitting and lazy loading
- ✅ Optimized bundle sizes
- ✅ Image optimization ready
- ✅ Font preloading
- ✅ CSS purging
- ✅ Gzip compression ready
- ✅ Service worker for caching
- ✅ PWA manifest for mobile installation

### Responsive Design Features
- ✅ Mobile-first responsive design
- ✅ Touch-friendly interfaces
- ✅ Optimized for all device sizes (320px to 2560px+)
- ✅ Responsive tables with mobile card layouts
- ✅ Mobile navigation with hamburger menu
- ✅ Accessible design patterns

## Project Structure

```
src/
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── lib/                # Utility functions
├── pages/              # Main application pages
└── types/              # TypeScript type definitions
```

## Database Schema

The application uses Supabase with the following main tables:
- `profiles` - User information and roles
- `challenges` - Coding challenge definitions
- `challenge_progress` - User progress on challenges
- `user_summary` - Aggregated user statistics
- `certificates` - Certificate management
- `event_settings` - Global event configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
