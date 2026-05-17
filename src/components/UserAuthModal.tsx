import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useUserAuth, type AuthModalMode } from "@/contexts/UserAuthContext";
import {
  useRegister,
  useVerifyUserEmail,
  useUserLogin,
  useForgotPassword,
  useResetPassword,
  useUpdatePassword,
} from "@/hooks/use-api";
import { Loader2 } from "lucide-react";

// ── Shared form helpers ───────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

function FormError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
      {msg}
    </div>
  );
}

// ── Step: Login ───────────────────────────────────────────────────────────────

function LoginStep({ onSwitch }: { onSwitch: (m: AuthModalMode) => void }) {
  const { onLoginSuccess } = useUserAuth();
  const login = useUserLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "Required";
    if (!password) e.password = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      const res = await login.mutateAsync({ email, password });
      onLoginSuccess(res.user);
    } catch {}
  };

  const apiError = login.error?.message;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <FieldError msg={errors.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <FieldError msg={errors.password} />
      </div>
      <FormError msg={apiError} />
      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Sign In
      </Button>
      <div className="flex flex-col gap-1.5 text-center text-sm">
        <button
          type="button"
          onClick={() => onSwitch("forgot-password")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Forgot password?
        </button>
        <span className="text-muted-foreground">
          No account?{" "}
          <button
            type="button"
            onClick={() => onSwitch("register")}
            className="text-primary hover:underline"
          >
            Create one
          </button>
        </span>
      </div>
    </form>
  );
}

// ── Step: Register ────────────────────────────────────────────────────────────

function RegisterStep({
  onSwitch,
  onRegistered,
}: {
  onSwitch: (m: AuthModalMode) => void;
  onRegistered: (email: string) => void;
}) {
  const register = useRegister();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email) e.email = "Required";
    if (!username || username.length < 2) e.username = "Minimum 2 characters";
    if (!password || password.length < 8) e.password = "Minimum 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      await register.mutateAsync({ email, username, password });
      onRegistered(email);
    } catch {}
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <FieldError msg={errors.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-username">Username</Label>
        <Input
          id="reg-username"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="yourname"
        />
        <FieldError msg={errors.username} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <Input
          id="reg-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
        />
        <FieldError msg={errors.password} />
      </div>
      <FormError msg={register.error?.message} />
      <Button type="submit" className="w-full" disabled={register.isPending}>
        {register.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Create Account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className="text-primary hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

// ── Step: Verify email ────────────────────────────────────────────────────────

function VerifyEmailStep({
  email,
  onVerified,
}: {
  email: string;
  onVerified: () => void;
}) {
  const verify = useVerifyUserEmail();
  const [otp, setOtp] = useState("");

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (otp.length !== 6) return;
    try {
      await verify.mutateAsync({ email, otp });
      onVerified();
    } catch {}
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="text-sm text-muted-foreground text-center">
        We sent a 6-digit code to <strong className="text-foreground">{email}</strong>.
        Enter it below to verify your account.
      </p>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <FormError msg={verify.error?.message} />
      <Button
        type="submit"
        className="w-full"
        disabled={verify.isPending || otp.length !== 6}
      >
        {verify.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Verify Email
      </Button>
    </form>
  );
}

// ── Step: Forgot password ─────────────────────────────────────────────────────

function ForgotPasswordStep({
  onSent,
  onSwitch,
}: {
  onSent: (email: string) => void;
  onSwitch: (m: AuthModalMode) => void;
}) {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email) return;
    await forgot.mutateAsync({ email });
    onSent(email);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter your email and we'll send a reset code if an account exists.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <FormError msg={forgot.error?.message} />
      <Button type="submit" className="w-full" disabled={forgot.isPending || !email}>
        {forgot.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Send Reset Code
      </Button>
      <p className="text-center text-sm">
        <button
          type="button"
          onClick={() => onSwitch("login")}
          className="text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </button>
      </p>
    </form>
  );
}

// ── Step: Reset password ──────────────────────────────────────────────────────

function ResetPasswordStep({
  email,
  onReset,
}: {
  email: string;
  onReset: () => void;
}) {
  const reset = useResetPassword();
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (otp.length !== 6) e.otp = "Enter the 6-digit code";
    if (newPassword.length < 8) e.newPassword = "Minimum 8 characters";
    if (newPassword !== confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      await reset.mutateAsync({ email, otp, newPassword });
      onReset();
    } catch {}
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Enter the code sent to <strong className="text-foreground">{email}</strong>.
      </p>
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <FieldError msg={errors.otp} />
      <div className="space-y-1.5">
        <Label htmlFor="reset-pw">New Password</Label>
        <Input
          id="reset-pw"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Min. 8 characters"
        />
        <FieldError msg={errors.newPassword} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reset-confirm">Confirm Password</Label>
        <Input
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
        />
        <FieldError msg={errors.confirm} />
      </div>
      <FormError msg={reset.error?.message} />
      <Button type="submit" className="w-full" disabled={reset.isPending}>
        {reset.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Reset Password
      </Button>
    </form>
  );
}

// ── Step: Change password (authenticated) ────────────────────────────────────

function ChangePasswordStep({ onDone }: { onDone: () => void }) {
  const update = useUpdatePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!current) e.current = "Required";
    if (next.length < 8) e.next = "Minimum 8 characters";
    if (next !== confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      await update.mutateAsync({ currentPassword: current, newPassword: next });
      setSuccess(true);
      setTimeout(onDone, 1500);
    } catch {}
  };

  if (success) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Password updated successfully!
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cp-current">Current Password</Label>
        <Input
          id="cp-current"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <FieldError msg={errors.current} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cp-next">New Password</Label>
        <Input
          id="cp-next"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Min. 8 characters"
        />
        <FieldError msg={errors.next} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cp-confirm">Confirm New Password</Label>
        <Input
          id="cp-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <FieldError msg={errors.confirm} />
      </div>
      <FormError msg={update.error?.message} />
      <Button type="submit" className="w-full" disabled={update.isPending}>
        {update.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Update Password
      </Button>
    </form>
  );
}

// ── Root modal ────────────────────────────────────────────────────────────────

const TITLES: Record<AuthModalMode, string> = {
  login: "Sign In",
  register: "Create Account",
  "verify-email": "Verify Email",
  "forgot-password": "Forgot Password",
  "reset-password": "Reset Password",
  "change-password": "Change Password",
};

const DESCS: Record<AuthModalMode, string> = {
  login: "Sign in to track your learning progress.",
  register: "Join to track your learning progress.",
  "verify-email": "Check your inbox for the verification code.",
  "forgot-password": "We'll send a reset code to your email.",
  "reset-password": "Enter your reset code and new password.",
  "change-password": "Update your account password.",
};

export function UserAuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal } = useUserAuth();

  // Local navigation state — mode changes don't close the modal
  const [mode, setMode] = useState<AuthModalMode>(authModalMode);
  const [pendingEmail, setPendingEmail] = useState("");
  const [verifiedMessage, setVerifiedMessage] = useState("");

  // Sync when context opens the modal with a specific mode
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal();
      // Reset local state after close animation
      setTimeout(() => {
        setMode("login");
        setPendingEmail("");
        setVerifiedMessage("");
      }, 200);
    }
  };

  // Keep local mode in sync when modal is re-opened from context
  const resolvedMode = authModalOpen ? mode : authModalMode;
  if (authModalOpen && mode !== resolvedMode && !pendingEmail) {
    setMode(authModalMode);
  }

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>{DESCS[mode]}</DialogDescription>
        </DialogHeader>

        {mode === "login" && <LoginStep onSwitch={setMode} />}

        {mode === "register" && (
          <RegisterStep
            onSwitch={setMode}
            onRegistered={(email) => {
              setPendingEmail(email);
              setMode("verify-email");
            }}
          />
        )}

        {mode === "verify-email" && (
          <VerifyEmailStep
            email={pendingEmail}
            onVerified={() => {
              setVerifiedMessage("Email verified! You can now sign in.");
              setMode("login");
            }}
          />
        )}

        {verifiedMessage && mode === "login" && (
          <p className="text-sm text-emerald-500 -mt-2">{verifiedMessage}</p>
        )}

        {mode === "forgot-password" && (
          <ForgotPasswordStep
            onSent={(email) => {
              setPendingEmail(email);
              setMode("reset-password");
            }}
            onSwitch={setMode}
          />
        )}

        {mode === "reset-password" && (
          <ResetPasswordStep
            email={pendingEmail}
            onReset={() => {
              setMode("login");
            }}
          />
        )}

        {mode === "change-password" && (
          <ChangePasswordStep onDone={closeAuthModal} />
        )}
      </DialogContent>
    </Dialog>
  );
}
