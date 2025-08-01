import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { ThemeContext } from '../App'; // Assuming ThemeContext is exported from App

export default function AuthForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();
  const { theme } = useContext(ThemeContext);

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    login(
      username,
      password,
      () => {
        setIsLoading(false);
        navigate(from, { replace: true });
      },
      (err) => {
        setIsLoading(false);
        setError(err);
      }
    );
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    signup(
      { name, email, password },
      () => {
        setIsLoading(false);
        navigate(from, { replace: true });
      },
      (err) => {
        setIsLoading(false);
        setError(err);
      }
    );
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <span onClick={handleLogoClick} className="cursor-pointer text-white dark:text-gray-900 text-xl font-mono">{'/'}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isSignUp
              ? 'Sign up for a developer account'
              : 'Sign in to your developer account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={isSignUp ? handleSignUp : handleLogin}>
          <div className="space-y-4">
            {isSignUp && (
              <>
                <Input
                  label="Name"
                  id="name"
                  type="text"
                  value={name}
                  onChange={setName}
                  placeholder="Enter your full name"
                />
                <Input
                  label="Username"
                  id="username"
                  type="text"
                  value={username}
                  onChange={setUsername}
                  placeholder="Choose a username"
                />
                <Input
                  label="Email"
                  id="email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="Enter your email"
                />
                <Input
                  label="Password"
                  id="password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Create a password"
                />
              </>
            )}

            {!isSignUp && (
              <>
                <Input
                  label="Username"
                  id="username"
                  type="text"
                  value={username}
                  onChange={setUsername}
                  placeholder="Enter your username"
                />
                <Input
                  label="Password"
                  id="password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your password"
                />
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400 dark:text-red-300"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white dark:text-gray-900 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  {isSignUp ? 'Signing up...' : 'Signing in...'}
                </div>
              ) : isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="text-center">
          {isSignUp ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                onClick={() => {
                  setError('');
                  setIsSignUp(false);
                }}
                className="font-medium text-gray-900 dark:text-white hover:underline"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <button
                onClick={() => {
                  setError('');
                  setIsSignUp(true);
                }}
                className="font-medium text-gray-900 dark:text-white underline"
              >
                Create an account
              </button>
            </p>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Secure authentication powered by your app
          </p>
        </div>
      </div>
    </div>
  );
}

// Reusable input component for consistency
function Input({ label, id, type, value, onChange, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 text-gray-900 dark:text-white bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-colors"
        placeholder={placeholder}
      />
    </div>
  );
}
