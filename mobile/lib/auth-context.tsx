import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  isNewUser: boolean;
  completeOnboarding: (handle: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  isNewUser: false,
  completeOnboarding: async (_handle: string) => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkIfNewUser(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        setIsLoading(true);
        await checkIfNewUser(session.user.id);
      } else {
        setIsNewUser(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkIfNewUser(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("id", userId)
        .single();

      if (error || !data) {
        // No profile row yet — new user
        setIsNewUser(true);
      } else {
        setIsNewUser(!data.onboarded);
      }
    } catch {
      setIsNewUser(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function completeOnboarding(handle: string) {
    if (!session) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, onboarded: true, handle });
    if (error) {
      throw error;
    }
    setIsNewUser(false);
  }

  return (
    <AuthContext.Provider
      value={{ session, isLoading, isNewUser, completeOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  );
}
