import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../api/auth';

const AdminLoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Credentials are verified by the server. Nothing about them is knowable
    // from the bundle, which is the whole point of this change.
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            await login(username, password);
            // Return the admin to wherever the guard intercepted them.
            navigate(location.state?.from || '/admin/dashboard', { replace: true });
        } catch (err) {
            setError(
                err.status === 429
                    ? `Too many attempts. Try again in ${Math.ceil((err.retryAfter ?? 900) / 60)} minutes.`
                    : err.status === 503
                        ? 'Admin login is not configured on this server yet.'
                        : err.message || 'Invalid username or password.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-gold-lighter to-white relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
                <div className="w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
            </div>
            <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
                <div className="w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-secondary font-heading mb-2">Admin Portal</h2>
                    <p className="text-sm text-gray-medium">Sign in to manage AK Sales</p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-white py-8 px-4 shadow-xl shadow-secondary/5 sm:rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                            >
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-secondary">
                                Username
                            </label>
                            <div className="mt-1">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-gray-50/50"
                                    placeholder="admin"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-secondary">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-gray-50/50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <p className="text-xs text-gray-medium">
                            Sessions last 8 hours. Lost the password? Regenerate it with
                            <code className="mx-1 rounded bg-gray-100 px-1 py-0.5">npm run admin:password</code>
                            and update the server environment variables.
                        </p>

                        <div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-primary to-accent hover:from-primary-dark hover:to-primary transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                {submitting ? 'Signing in…' : 'Sign in to Dashboard'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
