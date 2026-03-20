
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AirtableRecord } from '../types';
import { Loader2, ArrowRight, ShieldCheck, User, Key } from 'lucide-react';

interface LoginPageProps {
  records: AirtableRecord[];
  loading: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ records, loading }) => {
  const [name, setName] = useState('');
  const [signInCode, setSignInCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim().toLowerCase();
    const cleanCode = signInCode.trim();

    // Admin Check
    if (cleanName === 'admin') {
      navigate('/admin');
      return;
    }

    if (!cleanName || !cleanCode) {
      setError("Please provide your full name and sign-in code.");
      return;
    }

    // Find record matching Name AND Sign In ID
    const match = records.find(r => 
      r.fields.Name?.toLowerCase() === cleanName && 
      r.fields["Sign In ID"] === cleanCode
    );

    if (match) {
      navigate(`/dashboard/${match.id}`);
    } else {
      setError("We couldn't find a record matching those details. Please check your spelling and sign-in code.");
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-block w-16 h-1.5 bg-brand-accent mb-6"></div>
          <h1 className="text-4xl md:text-5xl font-serif text-black mb-4">ARCx</h1>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.4em] text-black/40">Role & AI Audit Portal</p>
        </div>

        <div className="bg-white border-2 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-brand-blue border-2 border-black flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-black" />
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-black/60 mb-2 flex items-center gap-2">
                <User className="w-3 h-3" /> Full Name
              </label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-4 py-3 bg-white border border-black rounded-none focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(169,236,247,1)] transition-all placeholder:text-black/20 font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-black/60 mb-2 flex items-center gap-2">
                <Key className="w-3 h-3" /> Sign-In Code
              </label>
              <input 
                type="text"
                value={signInCode}
                onChange={(e) => setSignInCode(e.target.value)}
                placeholder="Enter your unique code"
                className="w-full px-4 py-3 bg-white border border-black rounded-none focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(255,105,62,1)] transition-all placeholder:text-black/20 font-bold text-sm"
              />
            </div>

            {error && (
              <div className="p-3 bg-brand-accent/10 border border-brand-accent text-brand-accent text-[10px] font-bold uppercase tracking-tight leading-relaxed">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-brand-accent text-white font-extrabold uppercase tracking-[0.2em] text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  Access Audit
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-[9px] font-extrabold text-black/20 uppercase tracking-[0.3em]">
          Secure Professional Assessment Distribution
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
