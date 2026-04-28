import React, { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Monitor, Check, Info, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { healthCheck } from '../utils/api';

export default function SettingsPage() {
  const { darkMode, setDarkMode } = useTheme();
  const [systemStatus, setSystemStatus] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await healthCheck();
      setSystemStatus(status);
    } catch (err) {
      setSystemStatus({ status: 'error', message: 'Failed to connect to backend' });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  const handleThemeChange = (value) => {
    if (value === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    } else {
      setDarkMode(value === 'dark');
    }
  };

  const currentTheme = darkMode ? 'dark' : 'light';

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
          <Settings className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
          <p className="text-gray-500 dark:text-gray-400">Customize your experience</p>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Appearance
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          Choose how Bias Annotator looks to you
        </p>

        <div className="grid grid-cols-3 gap-4">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleThemeChange(value)}
              className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                (value === 'system' ? false : currentTheme === value)
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
              }`}
            >
              <Icon className={`w-8 h-8 mb-2 ${
                (value === 'system' ? false : currentTheme === value)
                  ? 'text-primary-500'
                  : 'text-gray-500 dark:text-gray-400'
              }`} />
              <span className={`font-medium ${
                (value === 'system' ? false : currentTheme === value)
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Status
        </h3>

        {isCheckingStatus ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />
            Checking connection...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Backend Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  systemStatus?.status === 'healthy' ? 'bg-gray-900 dark:bg-white' : 'bg-gray-400 dark:bg-gray-500'
                }`} />
                <span className="text-gray-700 dark:text-gray-300">Backend API</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {systemStatus?.status === 'healthy' ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Supabase Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  systemStatus?.supabase_connected ? 'bg-gray-900 dark:bg-white' : 'bg-gray-400 dark:bg-gray-500'
                }`} />
                <span className="text-gray-700 dark:text-gray-300">Supabase Database</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {systemStatus?.supabase_connected ? 'Connected' : 'Using Local Storage'}
              </span>
            </div>

            {/* Cloudinary Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  systemStatus?.cloudinary_configured ? 'bg-gray-900 dark:bg-white' : 'bg-gray-400 dark:bg-gray-500'
                }`} />
                <span className="text-gray-700 dark:text-gray-300">Cloudinary Storage</span>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {systemStatus?.cloudinary_configured ? 'Configured' : 'Using Direct URLs'}
              </span>
            </div>

            <button
              onClick={checkSystemStatus}
              className="w-full btn-secondary mt-4"
            >
              Refresh Status
            </button>
          </div>
        )}
      </div>

      {/* About Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          About
        </h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <Info className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-primary-800 dark:text-primary-300">
                <strong>About Bias Annotator</strong>
              </p>
              <p className="text-sm text-primary-700 dark:text-primary-400 mt-1">
                Bias Annotator is a tool for evaluating bias in AI-generated media.
                It allows multiple users to generate content and evaluate representation
                and attribute bias across different AI models.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Image Generation:</strong> OpenAI, Replicate, Stability AI, Google AI Studio</p>
            <p><strong>Database:</strong> Supabase (PostgreSQL)</p>
            <p><strong>Media Storage:</strong> Cloudinary</p>
          </div>
        </div>
      </div>

      {/* Configuration Guide */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configuration Guide
        </h3>

        <div className="space-y-4 text-sm">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              1. Supabase Setup
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Create a free account at supabase.com</li>
              <li>Create a new project</li>
              <li>Run the SQL schema from <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">backend/supabase_schema.sql</code></li>
              <li>Copy your project URL and anon key to <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">.env</code></li>
            </ol>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              2. Cloudinary Setup (Optional)
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
              <li>Create a free account at cloudinary.com</li>
              <li>Copy your cloud name, API key, and secret to <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">.env</code></li>
            </ol>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              3. Running the Application
            </h4>
            <div className="space-y-2 text-gray-600 dark:text-gray-400">
              <p><strong>Backend:</strong></p>
              <code className="block bg-gray-200 dark:bg-gray-600 p-2 rounded text-xs">
                cd backend<br/>
                pip install -r requirements.txt<br/>
                python main.py
              </code>
              <p className="mt-3"><strong>Frontend:</strong></p>
              <code className="block bg-gray-200 dark:bg-gray-600 p-2 rounded text-xs">
                cd frontend<br/>
                npm install<br/>
                npm run dev
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
