import { useEffect, useState, useContext } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ThemeContext } from '../App';

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useContext(ThemeContext);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Initialize formData with theme from context
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    notifications: true,
    theme: theme || 'light',
    clientSecret: '',
    clientId: '',
    accountId: '',
    partnerName: '',
  });

  // Optional: sync formData.theme if global theme changes externally
  useEffect(() => {
    setFormData(prev => ({ ...prev, theme }));
  }, [theme]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json(); // Parse backend JSON

      // If backend returned an error
      if (!response.ok) {
        const backendStack = result.stack ? `\nStack:\n${result.stack}` : '';
        throw new Error(`${result.error || "Failed to save and forward config"}${backendStack}`);
      }

      // Success
      setMessage("✅ Settings saved and forwarded successfully!");
      setTheme(formData.theme);
      localStorage.setItem("theme", formData.theme);
      localStorage.setItem("themeSource", "manual");

    } catch (err) {
      // Show full error in console
      console.error("Full error from save:", err);

      // Show friendly message in UI
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(""), 5000); // Hide message after 5s
    }
  };





  return (
    <div className="min-h-screen py-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage your account preferences</p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md dark:bg-green-900 dark:border-green-700">
            <p className="text-green-800 dark:text-green-300 text-sm">{message}</p>
          </div>
        )}

        {/* Settings Form */}
        <form
          onSubmit={handleSave}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6"
        >
          {/* Profile Section */}
          <div>
            <h2 className="text-lg font-medium mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="pt-6">
            <h2 className="text-lg font-medium mb-4">Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Theme</label>
                <select
                  name="theme"
                  value={formData.theme}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="pt-6">
            <h2 className="text-lg font-medium mb-4">Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Secret</label>
                <input
                  type="password"
                  name="clientSecret"
                  value={formData.clientSecret}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client ID</label>
                <input
                  type="text"
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Account ID</label>
                <input
                  type="text"
                  name="accountId"
                  value={formData.accountId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Partner Name</label>
                <input
                  type="text"
                  name="partnerName"
                  value={formData.partnerName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            >
              Sign Out
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
