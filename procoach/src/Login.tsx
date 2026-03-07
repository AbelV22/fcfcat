import React, { useState } from 'react';
import { supabase } from './supabase';
import { Shield, Mail, Lock, User, AlertTriangle } from 'lucide-react';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [clubName, setClubName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
            } else {
                const { error: signUpError, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            club_name: clubName
                        }
                    }
                });
                if (signUpError) throw signUpError;

                // Auto-login after signup should happen via event listener in context
                // But if they require email verification, we should tell them
                if (data.user && data.user.identities && data.user.identities.length === 0) {
                    setError('Este email ya está en uso.');
                } else if (!data.session) {
                    setError('Revisa tu correo para verificar la cuenta antes de entrar.');
                }
            }
        } catch (err: any) {
            setError(err.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="glass" style={{ width: '100%', maxWidth: '400px', borderRadius: '1rem', padding: '2.5rem 2rem', border: '1px solid rgba(139, 92, 246, 0.2)' }}>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <Shield size={36} color="#8b5cf6" />
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>ProCoach</h1>
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isLogin ? 'Accede al panel táctico de tu club' : 'Registra tu club para empezar'}
                    </p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#fca5a5', fontSize: '0.85rem' }}>
                        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ margin: 0, lineHeight: 1.4 }}>{error}</p>
                    </div>
                )}

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {!isLogin && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Nombre del Club</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                <input
                                    type="text"
                                    required
                                    value={clubName}
                                    onChange={(e) => setClubName(e.target.value)}
                                    placeholder="Ej: CF Badalona"
                                    style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem 1rem 0.75rem 2.8rem', color: 'white', fontSize: '0.95rem', outline: 'none' }}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Correo Electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="mister@club.com"
                                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem 1rem 0.75rem 2.8rem', color: 'white', fontSize: '0.95rem', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem 1rem 0.75rem 2.8rem', color: 'white', fontSize: '0.95rem', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            padding: '0.85rem',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '0.5rem',
                            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Cargando...' : isLogin ? 'Entrar al Dashboard' : 'Crear mi cuenta'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                        {isLogin ? '¿No tienes cuenta en tu club? ' : '¿Tu club ya está registrado? '}
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            style={{ background: 'none', border: 'none', color: '#a78bfa', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                        >
                            {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                        </button>
                    </p>
                </div>

            </div>
        </div>
    );
}
