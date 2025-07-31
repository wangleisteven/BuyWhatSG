# BuyWhatSG - Shopping List App

A Progressive Web App (PWA) for managing shopping lists, built with React, TypeScript, and Vite.

## Features

- Create, edit, and manage multiple shopping lists
- Add, edit, and delete items within lists
- Mark items as completed
- Categorize items for better organization
- Dark mode support
- Offline functionality
- Installable as a PWA
- Responsive design for mobile and desktop

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- React Icons
- Framer Motion
- React Beautiful DnD
- PWA (Progressive Web App) support

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository

```bash
git clone https://github.com/wangleisteven/BuyWhatSG.git
cd buywhatsg
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Start the development server

```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Building for Production

```bash
npm run build
# or
yarn build
```

## PWA Features

This app is designed as a Progressive Web App, which means it can be installed on your device and used offline. To install:

1. Open the app in a supported browser (Chrome, Edge, Safari, etc.)
2. Look for the install prompt or use the "Add to Home Screen" option in your browser menu
3. Once installed, the app will work offline and can be launched from your home screen

## Project Structure

```
src/
├── assets/         # Static assets like images
├── components/     # React components
│   ├── items/      # Item-related components
│   ├── layout/     # Layout components (Header, Navigation)
│   ├── lists/      # List-related components
│   ├── me/         # User profile components
│   └── ui/         # Reusable UI components
├── context/        # React context providers
├── hooks/          # Custom React hooks
├── styles/         # Global styles
├── utils/          # Utility functions
├── App.tsx         # Main App component
└── main.tsx        # Entry point
```

## License

MIT
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
