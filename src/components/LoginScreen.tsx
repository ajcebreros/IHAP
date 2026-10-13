import { useState } from 'react';
import { ArrowLeft, ArrowRight, Lock, Mail, User as UserIcon } from 'lucide-react';
import { supabase } from '../supabaseClient.js';

interface LoginScreenProps {
  error?: string;
}

const colleges = [
  'College of Engineering',
  'College of Education',
  'College of Criminal Justice',
];
const departmentsByCollege: Record<string, string[]> = {
  'College of Engineering': [
    'Department of Civil Engineering',
    'Department of Electrical Engineering',
    'Department of Computer Engineering',
  ],
  'College of Education': [
    'Department of Elementary Education',
    'Department of Secondary Education',
    'Department of Physical Education',
  ],
  'College of Criminal Justice': [
    'Criminal Justice Education Department',
  ],
};

export function LoginScreen({ error: authError }: LoginScreenProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');

    const normalizedEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: name.trim(),
              college,
              department,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice('Account created. Check your email to confirm your address, then sign in.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to authenticate with Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCollegeChange = (value: string) => {
    setCollege(value);
    setDepartment('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-brand-50/30 to-eco-50/20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 mb-8">
          <img src="/ihap-logo.png" alt="IHAP" className="h-auto max-h-28 w-64 object-contain sm:w-72" />
          <p className="text-sm text-slate-500">Print Management System</p>
        </div>

        <div className="card p-8 animate-scale-in">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {isRegistering ? 'Create your account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {isRegistering ? 'Register to access the user dashboard' : 'Sign in to access your dashboard'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="label" htmlFor="name">Full name</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="name" type="text" autoComplete="name" className="input pl-9" placeholder="Your name" value={name} onChange={(event) => setName(event.target.value)} required />
                </div>
              </div>
            )}
            <div>
              <label className="label" htmlFor="email">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="email" type="email" autoComplete="email" className="input pl-9" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="password" type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} className="input pl-9" placeholder={isRegistering ? 'At least 8 characters' : 'Your password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={isRegistering ? 8 : undefined} required />
              </div>
            </div>

            {isRegistering && (
              <>
                <div>
                  <label className="label" htmlFor="college">College</label>
                  <select id="college" className="input" value={college} onChange={(event) => handleCollegeChange(event.target.value)} required>
                    <option value="">Select your college</option>
                    {colleges.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                {college && (
                  <div>
                    <label className="label" htmlFor="department">Department</label>
                    <select id="department" className="input" value={department} onChange={(event) => setDepartment(event.target.value)} required>
                      <option value="">Select your department</option>
                      {departmentsByCollege[college].map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            {(error || authError) && <p role="alert" className="text-sm text-red-600">{error || authError}</p>}
            {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}

            <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'} <ArrowRight size={16} />
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setNotice('');
              }}
              disabled={isSubmitting}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {isRegistering ? (
                <span className="inline-flex items-center gap-1"><ArrowLeft size={14} /> Back to sign in</span>
              ) : (
                'New to IHAP? Create an account'
              )}
            </button>
          </div>

          {isRegistering && (
            <p className="text-xs text-slate-400 text-center mt-4">
              You must confirm your email address before signing in.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
