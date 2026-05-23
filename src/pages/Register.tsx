import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, User, Check, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';
import { cn } from '../utils/cn';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  
  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  
  const allRequirementsMet = passwordRequirements.every(r => r.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!allRequirementsMet) {
      setError('Password does not meet all requirements');
      return;
    }
    
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    
    const result = await register(name, email, password);
    
    if (result.success) {
      setSuccess(true);
      if (result.needsConfirmation) {
        setNeedsConfirmation(true);
      } else if (result.isFirstUser) {
        // First user is auto-approved admin — go to login
        setTimeout(() => navigate('/login'), 2000);
      }
    } else {
      setError(result.error || 'Registration failed');
    }
  };
  
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6">
            {needsConfirmation ? <Mail className="w-10 h-10 text-white" /> : <Check className="w-10 h-10 text-white" />}
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {needsConfirmation ? 'Check Your Email' : 'Registration Successful!'}
          </h2>
          <p className="text-slate-300 mb-6">
            {needsConfirmation
              ? 'A confirmation link has been sent to your email address. Please click the link to verify your account, then return here to log in.'
              : 'Your account has been created. An administrator will review your registration and approve your access.'}
          </p>
          <Button onClick={() => navigate('/login')}>
            Return to Login
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyek0zNiAxNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Create Account
          </h1>
          <p className="text-slate-400 text-sm">
            Register for access to the file management system
          </p>
        </div>
        
        {/* Register Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Requirements */}
              {password.length > 0 && (
                <div className="mt-3 space-y-1">
                  {passwordRequirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {req.met ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <X className="w-4 h-4 text-slate-500" />
                      )}
                      <span className={cn(
                        'text-xs',
                        req.met ? 'text-green-400' : 'text-slate-500'
                      )}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    'w-full pl-10 pr-12 py-3 bg-white/10 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                    confirmPassword && (passwordsMatch ? 'border-green-500' : 'border-red-500')
                  )}
                  placeholder="Confirm your password"
                />
                {confirmPassword && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check className="w-5 h-5 text-green-400" />
                    ) : (
                      <X className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-2">
              <Button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                isLoading={isLoading}
                disabled={!allRequirementsMet || !passwordsMatch}
              >
                Create Account
              </Button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
        
        <p className="mt-6 text-center text-xs text-slate-500">
          Note: All new registrations require admin approval before access is granted.
        </p>
      </div>
    </div>
  );
};
