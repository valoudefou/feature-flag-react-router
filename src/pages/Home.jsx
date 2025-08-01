import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { initializeFlagship } from '../utils/flagshipClient';
import { ThemeContext } from '../App';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [flagValue, setFlagValue] = useState(false);
  const { theme, setTheme } = useContext(ThemeContext);
  const fsVisitorRef = useRef(null); // holds the Flagship visitor instance

  const features = [
    {
      icon: '⚡',
      title: 'Fast & Reliable',
      description: 'Built with modern technologies for optimal performance'
    },
    {
      icon: '🔒',
      title: 'Secure',
      description: 'Your data is protected with industry-standard security'
    },
    {
      icon: '🎨',
      title: 'Beautiful Design',
      description: 'Clean, minimalist interface that developers love'
    }
  ];



  // Helper to get or create visitorId
  const getVisitorId = () => {
    try {
      const stored = localStorage.getItem('FS_CLIENT_VISITOR');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.visitorId) return parsed.visitorId;
      }
    } catch (err) {
      console.warn('Could not parse FS_CLIENT_VISITOR:', err);
    }

    // fallback to user ID or UUID if FS_CLIENT_VISITOR is not available
    if (user?.id) return user.id;

    // last resort fallback, but ideally never used now
    let anonId = localStorage.getItem('anonVisitorId');
    if (!anonId) {
      anonId = crypto.randomUUID();
      localStorage.setItem('anonVisitorId', anonId);
    }
    return anonId;
  };


  const runFlagship = useCallback(async () => {
    try {
      const visitorId = getVisitorId();


      const fsVisitor = await initializeFlagship({
        visitorId: user?.id || '',
        context: {
          role: user?.role || 'unknown',
          theme, // initial theme context if desired
        },
      });

      // store for reuse
      fsVisitorRef.current = fsVisitor;

      const flag = fsVisitor.getFlag('flag_access').getValue(false);
      setFlagValue(flag);

      const themeSource = localStorage.getItem('themeSource');
      if (themeSource !== 'manual') {
        const flagTheme = fsVisitor.getFlag('flag_theme').getValue('light');
        if (flagTheme !== theme) {
          setTheme(flagTheme);
          localStorage.setItem('theme', flagTheme);
        }
      }
    } catch (error) {
      console.error('Error initializing Flagship:', error);
      // fallback defaults if needed
    }
  }, [user?.id, user?.role, theme, setTheme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('themeSource', 'manual');

    try {
      const fsVisitor = fsVisitorRef.current;
      if (!fsVisitor) {
        console.warn('Flagship visitor not initialized yet.');
        return;
      }
      // Update context and refetch flags
      fsVisitor.updateContext({ theme: newTheme });
      await fsVisitor.fetchFlags();
    } catch (error) {
      console.error('Error updating Flagship context:', error);
    }
  };

  useEffect(() => {
    runFlagship();
  }, [runFlagship]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center mr-3">
                <span className="text-white dark:text-gray-900 text-sm font-mono">{'/'}</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">App</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>

              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Welcome {user?.displayName}</span>
                  <Link
                    to="/dashboard"
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={flagValue ? "/sign-up" : "/login"}
                    className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to={flagValue ? "/sign-up" : "/login"}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            Build Something
            <span className="block text-gray-600 dark:text-gray-400">Amazing</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300">
            A clean, minimalist platform designed for developers who value simplicity and performance.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            {!isAuthenticated ? (
              <>
                <Link
                  to={flagValue ? "/sign-up" : "/login"}
                  className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  Get Started
                </Link>
                <button className="px-8 py-3 bg-white text-gray-900 font-medium border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 transition-colors">
                  Learn More
                </button>
              </>
            ) : (
              <Link
                to="/dashboard"
                className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Why Choose App?</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Everything you need to build and deploy your next project
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              Join thousands of developers building amazing things
            </p>
            <div className="mt-8">
              {!isAuthenticated ? (
                <Link
                  to={flagValue ? "/sign-up" : "/login"}
                  className="px-8 py-3 bg-white text-gray-900 font-medium rounded-md hover:bg-gray-100 transition-colors"
                >
                  Start Building Today
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className="px-8 py-3 bg-white text-gray-900 font-medium rounded-md hover:bg-gray-100 transition-colors"
                >
                  Continue Building
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
