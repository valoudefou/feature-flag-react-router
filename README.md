<img src="https://content.partnerpage.io/eyJidWNrZXQiOiJwYXJ0bmVycGFnZS5wcm9kIiwia2V5IjoibWVkaWEvY29udGFjdF9pbWFnZXMvMDUwNGZlYTYtOWIxNy00N2IyLTg1YjUtNmY5YTZjZWU5OTJiLzI1NjhmYjk4LTQwM2ItNGI2OC05NmJiLTE5YTg1MzU3ZjRlMS5wbmciLCJlZGl0cyI6eyJ0b0Zvcm1hdCI6IndlYnAiLCJyZXNpemUiOnsid2lkdGgiOjEyMDAsImhlaWdodCI6NjI3LCJmaXQiOiJjb250YWluIiwiYmFja2dyb3VuZCI6eyJyIjoyNTUsImciOjI1NSwiYiI6MjU1LCJhbHBoYSI6MH19fX0=" alt="AB Tasty logo" width="350"/>

# Feature Flag Integration React Router

This practical example describes how `utils/flagshipClient.js` initializes Flagship, how feature flags are consumed in `Home.jsx`, and how the app uses flag values to drive routing (`/login` vs `/sign-up`) based on theme selection (light/dark).

## Setup

### Environment Variables

Define these in your environment (e.g., `.env`):

```env
REACT_APP_FS_ENV_ID=your_flagship_environment_id
REACT_APP_FS_API_KEY=your_flagship_api_key
```

## `utils/flagshipClient.js`

### Purpose

Initializes the Flagship SDK and returns a visitor instance enriched with the provided context.

### Example Implementation

```js
import { Flagship, LogLevel } from '@flagship.io/js-sdk';

/**
 * Initializes Flagship and returns a visitor instance
 * @param {Object} options
 * @param {string} options.visitorId - Unique ID of the visitor
 * @param {Object} options.context - Context object (e.g., role, theme, etc.)
 * @param {boolean} options.authenticated - Whether the visitor is authenticated
 * @returns {Promise<import('@flagship.io/js-sdk').VisitorInstance>}
 */
export async function initializeFlagship({ visitorId, context = {}, authenticated = false }) {
  Flagship.start(
    process.env.REACT_APP_FS_ENV_ID,
    process.env.REACT_APP_FS_API_KEY,
    {
      fetchNow: false,
      logLevel: LogLevel.ALL
    }
  );

  const fsVisitor = Flagship.newVisitor({
    visitorId,
    hasConsented: true,
    context: {
      ...context,
      authenticated,
    }
  });

  await fsVisitor.fetchFlags();
  return fsVisitor;
}
```

## `Home.jsx` Usage Pattern

The home component initializes Flagship with user and theme context, reads flags (`flag_access` and `flag_theme`), and wires theme toggling and routing logic based on those flags.

### Key behaviors

- `flag_access` controls whether unauthenticated users are routed to `/sign-up` or `/login`.
- `flag_theme` can drive light/dark mode automatically unless a manual override exists.
- Manual theme toggles update the visitor context and refetch flags to keep Flagship in sync.

### Simplified usage

```jsx
import { useEffect, useState, useContext, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { initializeFlagship } from '../utils/flagshipClient';
import { useAuth } from '../auth/AuthProvider';
import { ThemeContext } from '../App';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [flagValue, setFlagValue] = useState(false);
  const { theme, setTheme } = useContext(ThemeContext);
  const fsVisitorRef = useRef(null);

  const runFlagship = useCallback(async () => {
    try {
      const fsVisitor = await initializeFlagship({
        visitorId: user?.id || '',
        context: {
          role: user?.role || 'unknown',
          theme,
        },
        authenticated: !!isAuthenticated,
      });

      fsVisitorRef.current = fsVisitor;

      const accessFlag = fsVisitor.getFlag('flag_access').getValue(false);
      setFlagValue(accessFlag);

      const themeSource = localStorage.getItem('themeSource');
      if (themeSource !== 'manual') {
        const flagTheme = fsVisitor.getFlag('flag_theme').getValue('light');
        if (flagTheme !== theme) {
          setTheme(flagTheme);
          localStorage.setItem('theme', flagTheme);
        }
      }
    } catch (err) {
      console.error('Flagship init error:', err);
    }
  }, [user?.id, user?.role, theme, isAuthenticated, setTheme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('themeSource', 'manual');

    try {
      const fsVisitor = fsVisitorRef.current;
      if (!fsVisitor) return;
      await fsVisitor.updateContext({ theme: newTheme });
      await fsVisitor.fetchFlags();
    } catch (err) {
      console.error('Error updating context:', err);
    }
  };

  useEffect(() => {
    runFlagship();
  }, [runFlagship]);

  // In JSX, use flagValue to decide routing for unauthenticated users
  const targetRoute = flagValue ? '/sign-up' : '/login';

  return (
    <>
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
    </>
  );
}
```

## Targeting & Routing Logic Summary

- If the user is **not authenticated**:
  - When the user sees dark mode, `flag_access === true` → primary call-to-action links go to `/sign-up`
  - When the user sees light mode, `flag_access === false` → they go to `/login`
- If the user is **authenticated**, links point to protected areas like `/dashboard`.

## Theme Override Strategy

- Flag-driven theme is applied only if the user hasn’t manually changed the theme (`themeSource !== 'manual'`).
- Manual changes persist to `localStorage` and update Flagship context to reflect the user’s explicit preference.

## Benefits of React Router for A/B Testing Routes

- Client-side routing avoids full page reloads, so switching between `/login` and `/sign-up` feels instant.  
- Shared layout (navigation, theme, etc.) remains mounted, preventing flicker in A/B testing.  
- Flag decisions determine the route before rendering, so users never see the “wrong” page flash.  
- Route components can be preloaded, ensuring both variants load smoothly without performance impact.

## Extending

- Use `fsVisitor.sendHit()` to report custom events or conversions tied to flag-based experiences.
