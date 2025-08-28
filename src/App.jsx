import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initializeFlagship } from './utils/flagshipClient';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import LogViewer from './components/LogViewer';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import AuthForm from './pages/Signup';
import Dashboard from './pages/Dashboard';
import UsageDashboard from './pages/UsageDashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

import { createContext } from 'react';
export const ThemeContext = createContext('light');


function AppWithThemeAndFlags() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  });

  const [showLogs, setShowLogs] = useState(true);
  const [logHeight, setLogHeight] = useState(300); // Default height in pixels
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const initialHeight = useRef(0);
  const { user } = useAuth();

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Initialize Flagship and optionally update theme
  useEffect(() => {
    const runFlagship = async () => {
      const fsVisitor = await initializeFlagship({
        visitorId: user?.id || '',
        context: {
          role: user?.role || 'unknown',
        },
        authenticated: !!user?.id,
      });

      const themeSource = localStorage.getItem('themeSource');
      if (themeSource !== 'manual') {
        const flag = fsVisitor.getFlag('flag_theme');
        const flagValue = flag.getValue('light');

        if (['light', 'dark'].includes(flagValue)) {
          setTheme(flagValue);
          localStorage.setItem('theme', flagValue);
        }
      }
    };

    if (user) {
      runFlagship();
    }
  }, [user]);

  // Keyboard shortcut for just pressing "L"
  useEffect(() => {
    const handleKeydown = (e) => {
      // Avoid triggering in input, textarea, or contenteditable
      const tag = e.target.tagName.toLowerCase();
      const isEditable = e.target.isContentEditable;
      if (tag === 'input' || tag === 'textarea' || isEditable) return;

      // Toggle logs on pressing "L" or "l"
      if (e.key.toLowerCase() === 'l') {
        setShowLogs((prev) => {
          const next = !prev;
          localStorage.setItem('showLogs', next); // ✅ persist
          return next;
        });
      }

      // Reset logs with Shift+L (optional)
      if (e.key.toLowerCase() === 'l' && e.shiftKey) {
        setShowLogs(true);
        setLogHeight(300);
        localStorage.setItem('showLogs', true);
        localStorage.setItem('logHeight', 300);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, []);


  // Handle drag functionality
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    initialHeight.current = logHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const deltaY = e.clientY - dragStartY.current;
      const newHeight = Math.max(100, Math.min(window.innerHeight - 100, initialHeight.current + deltaY));
      setLogHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, logHeight]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <BrowserRouter>
        {/* Dev console toggle bar */}
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-black border-b-2 border-green-400 shadow-lg">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-mono text-sm font-medium">
                DEV CONSOLE
              </span>
            </div>
            <button
              onClick={() => setShowLogs((prev) => !prev)}
              className={`
                flex items-center space-x-2 px-4 py-1.5 rounded-md font-mono text-sm font-medium
                transition-all duration-200 border
                ${showLogs
                  ? 'bg-green-900/30 text-green-400 border-green-400/50 hover:bg-green-900/50'
                  : 'bg-gray-900/30 text-gray-400 border-gray-600/50 hover:bg-gray-800/50 hover:text-green-400 hover:border-green-400/50'
                }
              `}
            >
              <span className="text-xs">●</span>
              <span>{showLogs ? 'HIDE LOGS' : 'SHOW LOGS'}</span>
              <span className="text-xs opacity-60">
                [Press L]
              </span>
            </button>
          </div>
        </div>

        {/* Logs container with dynamic height */}
        {showLogs && (
          <div
            className="fixed top-12 left-0 right-0 z-[9998] bg-black border-b-2 border-green-400/30"
            style={{ height: `${logHeight}px` }}
          >
            <div className="h-full overflow-hidden">
              <LogViewer />
            </div>

            {/* Draggable resize handle */}
            <div
              className={`
                absolute bottom-0 left-0 right-0 h-2 bg-green-400/20 
                cursor-ns-resize hover:bg-green-400/40 transition-colors duration-200
                flex items-center justify-center group
                ${isDragging ? 'bg-green-400/60' : ''}
              `}
              onMouseDown={handleMouseDown}
            >
              {/* Visual drag indicator */}
              <div className="flex space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-0.5 bg-green-400 rounded-full"></div>
                <div className="w-4 h-0.5 bg-green-400 rounded-full"></div>
                <div className="w-8 h-0.5 bg-green-400 rounded-full"></div>
              </div>

              {/* Drag hint text */}
              <div className="absolute right-4 text-xs text-green-400/60 font-mono group-hover:text-green-400/80">
                {isDragging ? 'RESIZING...' : 'DRAG TO RESIZE'}
              </div>
            </div>
          </div>
        )}

        {/* Main content with dynamic top padding */}
        <div style={{ paddingTop: showLogs ? `${logHeight + 48}px` : '48px' }}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/sign-up" element={<AuthForm />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              >
                <Route path="usage" element={<UsageDashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppWithThemeAndFlags />
    </AuthProvider>
  );
}

export default App;
