import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import React, { useContext } from 'react';
import { ThemeContext } from '../App';

export default function Layout() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const { theme } = useContext(ThemeContext);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathnaåme.startsWith(path);
  };

  const handleLogout = () => {
    logout(() => location.pathname === '/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center mb-4 sm:mb-0">
              <div className="h-6 w-6 bg-gray-900 dark:bg-white rounded flex items-center justify-center mr-2">
                <span className="text-white dark:text-gray-900 text-xs font-mono">{'/'}</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                © 2025 AB Tasty. Built with React Router.
              </span>
            </div>
            <div className="flex space-x-6">
              {['Privacy', 'Terms', 'Support'].map((label) => (
                <a
                  key={label}
                  href="#"
                  className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
