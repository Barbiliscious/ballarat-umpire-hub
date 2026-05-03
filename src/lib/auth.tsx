import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";

const ADMIN_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  isSuperAdmin: false,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = data?.map((r: any) => r.role) || [];
    setIsAdmin(roles.includes("admin") || roles.includes("super_admin"));
    setIsSuperAdmin(roles.includes("super_admin"));
  };

  const checkDisabled = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("profiles")
      .select("is_disabled")
      .eq("user_id", userId)
      .single();
    if (data?.is_disabled) {
      toast.error("Your account has been disabled. Contact an administrator.");
      await supabase.auth.signOut();
      return true;
    }
    return false;
  };

  const handleSignOut = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    window.location.href = "/";
    await supabase.auth.signOut();
  }, []);

  // Admin inactivity timeout
  useEffect(() => {
    if (!isAdmin || !user) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        toast.info("You have been signed out due to inactivity.");
        window.location.href = "/";
        handleSignOut();
      }, ADMIN_TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "click"] as const;
    events.forEach((evt) => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isAdmin, user, handleSignOut]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setIsLoading(true);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(async () => {
            const disabled = await checkDisabled(session.user.id);
            if (disabled) {
              setIsLoading(false);
              return;
            }
            await supabase
              .from("profiles")
              .update({ last_login: new Date().toISOString() })
              .eq("user_id", session.user.id);
            await checkRoles(session.user.id);
            setIsLoading(false);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const disabled = await checkDisabled(session.user.id);
        if (!disabled) {
          await checkRoles(session.user.id);
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isSuperAdmin, isLoading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
