import React, { createContext, useContext, useState, useEffect } from 'react';
import { users } from '../database/users';

const AuthContext = createContext(null);

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');

    if (storedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else if (storedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    } else {
      setTheme('light');
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }, []);


  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };


  useEffect(() => {
    const initializeAuth = () => {
      try {
        const stored = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (stored && token) {
          const userData = JSON.parse(stored);
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username, password, onSuccess, onError) => {
    try {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 800));

      const validUserIndex = users.findIndex(
        (u) => u.username === username && u.password === password
      );

      if (validUserIndex !== -1) {
        const validUser = users[validUserIndex];
        users[validUserIndex].lastLogin = new Date().toISOString();

        const token = `jwt-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const userInfo = {
          username: validUser.username,
          displayName: validUser.displayName,
          email: validUser.email,
          role: validUser.role,
          id: validUser.id,
          joinedDate: validUser.joinedDate,
          lastLogin: users[validUserIndex].lastLogin,
        };

        setUser(userInfo);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userInfo));
        localStorage.setItem('token', token);

        // ✅ Clear manual theme override on login
        localStorage.removeItem('themeSource');

        onSuccess?.();
      } else {
        throw new Error('Invalid username or password');
      }
    } catch (error) {
      onError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };


  const signup = async (newUserData, onSuccess, onError) => {
    try {
      setIsLoading(true);

      const usernameExists = users.some((u) => u.username === newUserData.username);
      const emailExists = users.some((u) => u.email === newUserData.email);

      if (usernameExists) throw new Error('Username already taken');
      if (emailExists) throw new Error('Email already registered');

      const newUser = {
        id: generateId(),
        username: newUserData.username,
        password: newUserData.password,
        displayName: newUserData.displayName || newUserData.username,
        email: newUserData.email,
        usage: 'low',
        joinedDate: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      users.push(newUser);

      setUser(newUser);
      setIsAuthenticated(true);
      const token = `jwt-token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('token', token);

      onSuccess?.();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (onSuccess) => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      onSuccess?.();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateUser = (userData) => {
    try {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      return false;
    }
  };

  const getToken = () => localStorage.getItem('token');

  const isTokenValid = () => {
    const token = getToken();
    return !!token && !!user;
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateUser,
    getToken,
    isTokenValid,
    theme,
    toggleTheme,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
