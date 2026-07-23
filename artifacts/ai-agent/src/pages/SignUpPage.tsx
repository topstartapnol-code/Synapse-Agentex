import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export function SignUpPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleOAuth = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (oauthError) setError(oauthError.message);
    } catch (err: any) {
      setError(err?.message || "Ошибка OAuth авторизации");
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен состоять минимум из 6 символов");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        if (data.session) {
          setLocation("/");
        } else {
          setSuccess(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Произошла неизвестная ошибка при регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4" style={{ background: "hsl(222 47% 8%)" }}>
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/synapse-icon.webp"
            alt="SYNAPSE"
            className="w-16 h-16 rounded-2xl shadow-lg"
            style={{ imageRendering: "pixelated" }}
          />
          <span className="synapse-logo-text text-lg font-bold tracking-widest uppercase" style={{ color: "hsl(25 95% 53%)" }}>
            SYNAPSE AGENT
          </span>
        </div>

        <div 
          className="w-full rounded-2xl p-8 flex flex-col gap-6"
          style={{ 
            background: "hsl(220 35% 14%)", 
            border: "1px solid hsl(220 25% 24%)", 
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)" 
          }}
        >
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-semibold text-white tracking-wide">Создать аккаунт</h2>
            <p className="text-sm" style={{ color: "hsl(210 15% 60%)" }}>Начните работу с SYNAPSE AGENT</p>
          </div>

          {success ? (
            <div 
              className="text-sm p-4 rounded-xl border leading-relaxed flex flex-col gap-2"
              style={{ 
                background: "rgba(16, 185, 129, 0.08)", 
                borderColor: "rgba(16, 185, 129, 0.2)", 
                color: "hsl(142 70% 65%)" 
              }}
            >
              <span className="font-semibold">🎉 Регистрация успешна!</span>
              <span>Пожалуйста, проверьте свою электронную почту для подтверждения регистрации.</span>
              <button 
                onClick={() => setLocation("/sign-in")} 
                className="mt-2 py-2 px-4 rounded-lg font-semibold text-xs transition-all active:scale-[0.98] w-full text-center"
                style={{ background: "hsl(25 95% 53%)", color: "hsl(222 47% 8%)" }}
              >
                Перейти к входу
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div 
                  className="text-xs p-3.5 rounded-xl border font-medium leading-relaxed"
                  style={{ 
                    background: "rgba(239, 68, 68, 0.08)", 
                    borderColor: "rgba(239, 68, 68, 0.2)", 
                    color: "hsl(0 100% 67%)" 
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              {/* OAuth Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuth("google")}
                  disabled={!!oauthLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                  style={{ background: "hsl(220 30% 18%)", border: "1px solid hsl(220 25% 28%)", color: "white" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {oauthLoading === "google" ? "Подключение..." : "Продолжить с Google"}
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth("github")}
                  disabled={!!oauthLoading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                  style={{ background: "hsl(220 30% 18%)", border: "1px solid hsl(220 25% 28%)", color: "white" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  {oauthLoading === "github" ? "Подключение..." : "Продолжить с GitHub"}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1" style={{ height: "1px", background: "hsl(220 25% 24%)" }} />
                <span className="text-xs font-medium" style={{ color: "hsl(210 15% 45%)" }}>или</span>
                <div className="flex-1" style={{ height: "1px", background: "hsl(220 25% 24%)" }} />
              </div>

              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(210 15% 60%)" }}>Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 text-white"
                    style={{ background: "hsl(220 30% 18%)", border: "1px solid hsl(220 25% 24%)" }} disabled={loading} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(210 15% 60%)" }}>Пароль</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 text-white"
                    style={{ background: "hsl(220 30% 18%)", border: "1px solid hsl(220 25% 24%)" }} disabled={loading} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(210 15% 60%)" }}>Подтвердите пароль</label>
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 text-white"
                    style={{ background: "hsl(220 30% 18%)", border: "1px solid hsl(220 25% 24%)" }} disabled={loading} />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 mt-2 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  style={{ background: "hsl(25 95% 53%)", color: "hsl(222 47% 8%)" }}>
                  {loading ? "Создание..." : "Зарегистрироваться"}
                </button>
              </form>

              <div style={{ height: "1px", background: "hsl(220 25% 24%)" }} />

              <div className="text-center text-xs">
                <span style={{ color: "hsl(210 15% 60%)" }}>Уже есть аккаунт? </span>
                <button onClick={() => setLocation("/sign-in")} className="font-medium hover:underline focus:outline-none" style={{ color: "hsl(25 95% 53%)" }}>
                  Войти
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
