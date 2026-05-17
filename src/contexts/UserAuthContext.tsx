import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  getStoredUser,
  removeUserToken,
  isUserLoggedIn,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { userQueryKeys } from "@/hooks/use-api";

export type AuthModalMode =
  | "login"
  | "register"
  | "verify-email"
  | "forgot-password"
  | "reset-password"
  | "change-password";

interface CurrentUser {
  id: string;
  email: string;
  username: string;
}

interface UserAuthContextValue {
  currentUser: CurrentUser | null;
  isLoggedIn: boolean;
  /** Open the auth modal, optionally on a specific step */
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  /** Called by the modal after a successful login/register+verify */
  onLoginSuccess: (user: CurrentUser) => void;
  logout: () => void;
}

const UserAuthContext = createContext<UserAuthContextValue | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() =>
    isUserLoggedIn() ? (getStoredUser() ?? null) : null
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");

  // On mount, if we have a stored user but the token was cleared elsewhere, sync up
  useEffect(() => {
    if (!isUserLoggedIn()) setCurrentUser(null);
  }, []);

  const openAuthModal = useCallback((mode: AuthModalMode = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const onLoginSuccess = useCallback((user: CurrentUser) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    removeUserToken();
    setCurrentUser(null);
    queryClient.removeQueries({ queryKey: userQueryKeys.me });
    queryClient.removeQueries({ queryKey: userQueryKeys.progress });
    queryClient.removeQueries({ queryKey: userQueryKeys.stats });
  }, [queryClient]);

  return (
    <UserAuthContext.Provider
      value={{
        currentUser,
        isLoggedIn: !!currentUser,
        openAuthModal,
        closeAuthModal,
        authModalOpen,
        authModalMode,
        onLoginSuccess,
        logout,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth(): UserAuthContextValue {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used inside UserAuthProvider");
  return ctx;
}
