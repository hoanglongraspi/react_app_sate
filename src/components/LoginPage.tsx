import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthProvider';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const LoginPage: React.FC = () => {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Determine if we're on signup route
  const isSignUpMode = location.pathname === '/signup';
  
  // Get the redirect location from state or default to home
  const from = location.state?.from?.pathname || '/';
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setAuthError('');
    setSuccessMessage('');
    if (isSignUpMode && data.password !== data.confirmPassword) {
        setIsLoading(false);
      setAuthError('Passwords do not match');
      return;
    }
    try {
      if (isSignUpMode) {
        await signUp(data.email, data.password);
        setSuccessMessage('Account created! You can now sign in.');
        // Navigate to login page after successful signup
        setTimeout(() => navigate('/login'), 1500);
    } else {
        await signIn(data.email, data.password);
        // Navigation will happen automatically via useEffect when user state updates
      }
    } catch (error: any) {
      const message =
        error?.message === 'Invalid login credentials'
          ? 'Incorrect email or password'
          : error?.message || 'Authentication failed';
      setAuthError(message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SATE</h1>
          <p className="text-gray-600">Speech Annotation and Transcription Enhancer</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            {isSignUpMode ? 'Create Account' : 'Sign In'}
          </h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email"
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm Password Field - Sign Up Only */}
            {isSignUpMode && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm password"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Success & Error Messages */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}
            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{authError}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isSignUpMode ? 'Creating account...' : 'Signing in...'}
                </div>
              ) : isSignUpMode ? (
                'Sign Up'
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-sm text-gray-600 text-center mt-4">
            {isSignUpMode ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => navigate(isSignUpMode ? '/login' : '/signup')}
              className="text-blue-600 hover:underline"
            >
              {isSignUpMode ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">Speech Annotation and Transcription Enhancer</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 