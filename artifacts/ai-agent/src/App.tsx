import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/Home";
import { SignInPage } from "@/pages/SignInPage";
import { SignUpPage } from "@/pages/SignUpPage";
import { useState, useEffect, createContext, useContext, useRef } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";

const queryClient = new QueryClient();

type Theme = "dark" | "light";
interface ThemeCtx { theme: Theme; toggle: () => void }
export const ThemeContext = createContext<ThemeCtx>({ theme: "dark", toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function SupabaseQueryClientCacheInvalidator() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const userId = user?.id ?? null;
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
      qc.clear();
    }
    prevUserIdRef.current = userId;
  }, [user, qc]);

  return null;
}

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">Загрузка...</div>;
  }

  if (!user) {
    return <Redirect to="/sign-in" />;
  }

  return <Home />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthProviderWithRoutes() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <SupabaseQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("synapse-theme") as Theme) || "dark";
  });

  useEffect(() => {
    // Initialize Telegram Mini App SDK if opened inside Telegram
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem("synapse-theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <WouterRouter base={basePath}>
        <AuthProviderWithRoutes />
      </WouterRouter>
    </ThemeContext.Provider>
  );
}

export default App;
