import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export default function ProtectedRoute({ children, requireAuth = true, redirectTo = '/' }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location }}
      />
    );
  }

  // If authentication is NOT required but user IS authenticated (e.g., login page)
  if (!requireAuth && isAuthenticated) {
    // Redirect to intended destination or dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
}

// Alternative: More specific route protection components
export function RequireAuth({ children, fallback, redirectTo = '/login' }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return children;
}

export function RequireGuest({ children, redirectTo = '/dashboard' }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  return children;
}

// Role-based protection
export function RequireRole({ children, role, fallback }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Check if user has required role
  const hasRole = user?.roles?.includes(role) || user?.username === 'admin';

  if (!hasRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}

// Custom hook for route protection logic
export function useRouteProtection() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const canAccess = (requirements = {}) => {
    const {
      requireAuth = true,
      roles = [],
      permissions = []
    } = requirements;

    if (isLoading) return { loading: true };

    if (requireAuth && !isAuthenticated) {
      return {
        allowed: false,
        redirect: '/login',
        state: { from: location }
      };
    }

    if (roles.length > 0) {
      const hasRole = roles.some(role =>
        user?.roles?.includes(role) || user?.username === 'admin'
      );
      if (!hasRole) {
        return { allowed: false, reason: 'insufficient_role' };
      }
    }

    if (permissions.length > 0) {
      const hasPermission = permissions.some(permission =>
        user?.permissions?.includes(permission)
      );
      if (!hasPermission) {
        return { allowed: false, reason: 'insufficient_permissions' };
      }
    }

    return { allowed: true };
  };

  return { canAccess };
}
