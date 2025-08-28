import React, { useState, useContext } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ThemeContext } from '../App';

export default function Profile() {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [profileData, setProfileData] = useState({
    username: user?.username || 'john_dev',
    email: user?.email || 'john@example.com',
    displayName: user?.displayName || 'John Developer',
    bio: user?.bio || 'Full-stack developer passionate about clean code and user experience.',
    location: user?.location || 'San Francisco, CA',
    website: user?.website || 'https://johndeveloper.com',
    joinedDate: user?.joinedDate || '2023-01-15'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');
    setTimeout(() => {
      setIsLoading(false);
      setIsEditing(false);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    }, 1000);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen py-8 bg-white dark:bg-gray-900 transition-colors">
      <div className="mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage your public profile information
          </p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-md">
            <p className="text-green-800 dark:text-green-100 text-sm">{message}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          {/* Profile Header */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <div className="h-16 w-16 bg-gray-900 text-white rounded-full flex items-center justify-center">
                  <span className="text-xl font-semibold">
                    {profileData.displayName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {profileData.displayName}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">@{profileData.username}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-6 py-6">
            {isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField label="Display Name" name="displayName" value={profileData.displayName} onChange={handleChange} />
                  <InputField label="Username" name="username" value={profileData.username} onChange={handleChange} />
                </div>
                <InputField label="Email" name="email" value={profileData.email} onChange={handleChange} />
                <TextAreaField label="Bio" name="bio" value={profileData.bio} onChange={handleChange} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InputField label="Location" name="location" value={profileData.location} onChange={handleChange} />
                  <InputField label="Website" name="website" value={profileData.website} onChange={handleChange} />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <ProfileInfo label="Bio" value={profileData.bio} />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <ProfileInfo label="Email" value={profileData.email} />
                  <ProfileInfo label="Location" value={profileData.location} />
                  <ProfileInfo label="Website" value={
                    <a
                      href={profileData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-gray-900 dark:text-white hover:underline"
                    >
                      {profileData.website}
                    </a>
                  } />
                  <ProfileInfo label="Member Since" value={
                    new Date(profileData.joinedDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  } />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
      />
    </div>
  );
}

function TextAreaField({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <textarea
        name={name}
        rows={3}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
      />
    </div>
  );
}

function ProfileInfo({ label, value }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</h3>
      <p className="mt-1 text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
