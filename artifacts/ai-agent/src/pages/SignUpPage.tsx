import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";

export function SignUpPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        // Supabase returns a session if email confirmation is disabled
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
              <span>Пожалуйста, проверьте свою электронную почту для подтверждения регистрации. После этого вы сможете войти в аккаунт.</span>
              <button 
                onClick={() => setLocation("/sign-in")} 
                className="mt-2 py-2 px-4 rounded-lg font-semibold text-xs transition-all active:scale-[0.98] w-full text-center"
                style={{ 
                  background: "hsl(25 95% 53%)", 
                  color: "hsl(222 47% 8%)" 
                }}
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

              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(210 15% 60%)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 text-white"
                    style={{ 
                      background: "hsl(220 30% 18%)", 
                      border: "1px solid hsl(220 25% 24%)",
                    }}
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(210 15% 60%)" }}>
                    Пароль
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 text-white"
                    style={{ 
                      background: "hsl(220 30% 18%)", 
                      border: "1px solid hsl(220 25% 24%)",
                    }}
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(210 15% 60%)" }}>
                    Подтвердите пароль
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 text-white"
                    style={{ 
                      background: "hsl(220 30% 18%)", 
                      border: "1px solid hsl(220 25% 24%)",
                    }}
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 mt-2 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  style={{ 
                    background: "hsl(25 95% 53%)", 
                    color: "hsl(222 47% 8%)" 
                  }}
                >
                  {loading ? "Создание..." : "Зарегистрироваться"}
                </button>
              </form>

              <div style={{ height: "1px", background: "hsl(220 25% 24%)" }} />

              <div className="text-center text-xs">
                <span style={{ color: "hsl(210 15% 60%)" }}>Уже есть аккаунт? </span>
                <button 
                  onClick={() => setLocation("/sign-in")} 
                  className="font-medium hover:underline focus:outline-none"
                  style={{ color: "hsl(25 95% 53%)" }}
                >
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
