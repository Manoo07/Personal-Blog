# Manohar's Technical Journal

A modern technical blog and portfolio built with React, TypeScript, and Vite. Features a full admin panel for content management and integrates with GitHub API for dynamic project showcasing.

## Features

- ✅ **Dynamic Blog System**: Full CRUD operations with API integration
- ✅ **Admin Panel**: Rich markdown editor with live preview
- ✅ **GitHub Integration**: Automatic project fetching from repositories
- ✅ **Mobile Responsive**: Optimized for all device sizes
- ✅ **Modern UI**: Clean design with dark theme support
- ✅ **Real-time Updates**: Automatic cache invalidation and data refresh

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **State Management**: TanStack Query
- **Routing**: React Router DOM
- **UI Components**: Radix UI, Lucide React
- **Markdown**: ReactMarkdown with syntax highlighting
- **Backend**: Cloudflare Workers API (separate repository)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Manoo07/my-technical-journal.git
cd my-technical-journal
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:8080`

### Building for Production

```bash
npm run build
# or
yarn build
```

## Project Structure

```
src/
├── components/         # Reusable UI components
├── pages/             # Route components
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries and API clients
├── data/              # Static data (minimal usage)
├── types/             # TypeScript type definitions
└── styles/            # Global styles and Tailwind config
```

## API Integration

The application integrates with a Cloudflare Workers backend API for:

- **Authentication**: JWT-based admin authentication
- **Post Management**: CRUD operations for blog posts
- **Content Delivery**: Serving published posts to public
- **Tag Management**: Dynamic tag system

## Deployment

This project can be deployed to any static hosting service like:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.
