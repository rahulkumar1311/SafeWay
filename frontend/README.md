# SafeWay-AI Frontend Application

Modern React & Vite web application for the SafeWay-AI Driver Safety & Intelligent Mobility Platform.

## Technology Stack
- **Framework**: React 19 + Vite 6
- **Routing**: React Router 7
- **Styling**: Tailwind CSS v4
- **HTTP Client**: Axios
- **Iconography**: Lucide React

## Project Structure
```
frontend/
├── public/              # Static public assets
├── src/
│   ├── components/      # UI Layout & Toast components (Navbar, Sidebar, Toast, Layout)
│   ├── context/         # AppContext for global UI state & API status monitoring
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Platform module shell views (Dashboard, Drowsiness, Signs, Challans, Hazards, SOS, Rules)
│   ├── services/        # Axios API client (api.js) with interceptors and VITE_API_BASE_URL
│   ├── utils/           # Helper utility functions
│   ├── App.jsx          # Router layout declaration
│   ├── index.css        # Tailwind v4 import & glassmorphism theme tokens
│   └── main.jsx         # React application entry point
├── .env.example         # Environment template configuration
├── package.json         # Dependencies & scripts
└── README.md            # Frontend documentation
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in `frontend/` directory (or copy `.env.example`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Run Development Server
```bash
npm run dev
```

The application will start on `http://localhost:5173`.
