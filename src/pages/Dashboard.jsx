import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from "../auth/AuthProvider";
import { HitType, EventCategory, Flagship } from "@flagship.io/js-sdk";
import { useEffect, useContext } from 'react';
import { ThemeContext } from '../App'; // <-- import ThemeContext
import { initializeFlagship } from '../utils/flagshipClient';

export default function Dashboard() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useContext(ThemeContext); // <-- consume context

  const isActive = (path) =>
    location.pathname.includes(path)
      ? 'bg-gray-900 text-white dark:bg-gray-200 dark:text-black'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700';

const navigationItems = [
  { path: 'profile', label: 'Profile', icon: '👤' },
  { path: 'settings', label: 'Settings', icon: '⚙️' },
  { path: 'usage', label: 'Usage', icon: '📊' }, // <-- add this
];

  const stats = [
    { label: 'Projects', value: '12', icon: '📁' },
    { label: 'Tasks', value: '34', icon: '✅' },
    { label: 'Messages', value: '8', icon: '💬' },
  ];

  const isMainDashboard = location.pathname === '/dashboard' || location.pathname === '/dashboard/';

  useEffect(() => {
    const runFlagship = async () => {
      const fsVisitor = await initializeFlagship({
        visitorId: user?.id || '',
        context: {
          role: user?.role || ''
        },
        authenticated: !!user?.id
      });

      try {
        fsVisitor.sendHit({
          type: HitType.EVENT,
          category: EventCategory.USER_ENGAGEMENT,
          action: "Account Creation",
        });
      } catch (err) {
        console.error("❌ Fetch error:", err);
      }

      if (Flagship.getStatus() === "READY_PANIC_ON") {
        console.warn("⚠️ PANIC MODE active.");
      }
    };

    runFlagship();
  }, []);

  const handleLogout = () => logout();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center">
              <div className="h-8 w-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center mr-3">
                <span className="text-white dark:text-black text-sm font-mono">{'/'}</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Welcome {user?.displayName || user?.username || 'Developer'}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64">
            <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isMainDashboard
                    ? 'bg-gray-900 text-white dark:bg-gray-200 dark:text-black'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                    }`}
                >
                  <span className="mr-3">📊</span>
                  Overview
                </Link>
                {navigationItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive(item.path)}`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {isMainDashboard ? (
              <div className="space-y-6">
                {/* Welcome */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Welcome back {user?.displayName || user?.username || 'Developer'}!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Here's what's happening with your projects today.
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex items-center">
                        <div className="text-2xl mr-4">{stat.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center py-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Project "Website Redesign" was updated</span>
                      <span className="text-xs text-gray-400 ml-auto">2 hours ago</span>
                    </div>
                    <div className="flex items-center py-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">New task assigned: "Fix navigation bug"</span>
                      <span className="text-xs text-gray-400 ml-auto">4 hours ago</span>
                    </div>
                    <div className="flex items-center py-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">Profile information updated</span>
                      <span className="text-xs text-gray-400 ml-auto">1 day ago</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                      <div className="text-xl mb-2">📝</div>
                      <div className="font-medium text-gray-900 dark:text-white">Create Project</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Start a new project</div>
                    </button>
                    <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                      <div className="text-xl mb-2">👥</div>
                      <div className="font-medium text-gray-900 dark:text-white">Invite Team</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Add team members</div>
                    </button>
                    <button className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left">
                      <div className="text-xl mb-2">📊</div>
                      <div className="font-medium text-gray-900 dark:text-white">View Reports</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Check analytics</div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <Outlet />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
