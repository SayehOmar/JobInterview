"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LOGIN_MUTATION } from "@/graphql/auth";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onToggle: () => void;
}

export function LoginForm({ onToggle }: LoginFormProps) {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const [login, { loading }] = useMutation(LOGIN_MUTATION);

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError("");
      const result = await login({ variables: { input: data } });
      // @ts-ignore
      const { token, user } = result.data.login || "";
      setAuth(user, token);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    }
  };

  const isBusy = loading || isSubmitting;

  return (
    <div style={styles.card}>

      {/* Badge */}
      <div style={styles.badge}>
        <span style={styles.badgeDot} />
        Forest Viewer
      </div>

      {/* Header */}
      <h2 style={styles.title}>Welcome back</h2>
      <p style={styles.subtitle}>Sign in to access the forest viewer</p>

      <hr style={styles.sep} />

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span style={styles.errorDot} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* Email */}
        <div style={styles.field}>
          <label style={styles.label}>Email address</label>
          <div style={styles.inputGroup}>
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              style={styles.input}
            />
          </div>
          {errors.email && (
            <p style={styles.fieldError}>
              <span style={styles.errorDot} />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <div style={styles.passwordRow}>
            <div style={styles.inputGroup}>
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                placeholder="your password"
                autoComplete="current-password"
                style={styles.input}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeOutsideBtn}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p style={styles.fieldError}>
              <span style={styles.errorDot} />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isBusy}
          style={{
            ...styles.btnPrimary,
            ...(isBusy ? styles.btnDisabled : {}),
          }}
        >
          {isBusy && <Loader2 size={15} className="animate-spin" />}
          Sign In
        </button>
      </form>

      {/* Footer */}
      <p style={styles.footer}>
        Don't have an account?{" "}
        <button onClick={onToggle} style={styles.link}>
          Create one
        </button>
      </p>
    </div>
  );
}

const BRAND = "#0b4a59";

const styles = {
  card: {
    width: "100%",
    maxWidth: 400,
    background: "#ffffff",
    borderRadius: 18,
    border: "1px solid #dde5e2",
    padding: "44px 40px 36px",
    fontFamily: "'Sora', sans-serif",
  } as React.CSSProperties,

  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#e6f0ed",
    color: BRAND,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.06em",
    padding: "4px 10px",
    borderRadius: 20,
    marginBottom: 20,
  } as React.CSSProperties,

  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: BRAND,
    flexShrink: 0,
    display: "inline-block",
  } as React.CSSProperties,

  title: {
    fontSize: 26,
    fontWeight: 600,
    color: "#0d1f24",
    margin: "0 0 6px",
    lineHeight: 1.2,
  } as React.CSSProperties,

  subtitle: {
    fontSize: 13.5,
    color: "#6b8a90",
    fontWeight: 300,
    margin: "0 0 32px",
  } as React.CSSProperties,

  sep: {
    border: "none",
    borderTop: "1px solid #e8eeec",
    margin: "0 0 28px",
  } as React.CSSProperties,

  errorBanner: {
    background: "#fff5f5",
    border: "1px solid #fccaca",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 12.5,
    color: "#c0392b",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    gap: 8,
  } as React.CSSProperties,

  field: {
    marginBottom: 18,
  } as React.CSSProperties,

  label: {
    display: "block",
    fontSize: 11.5,
    fontWeight: 500,
    color: "#4a6870",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    marginBottom: 7,
  } as React.CSSProperties,

  inputGroup: {
    display: "flex",
    alignItems: "center",
    border: "1.5px solid #d0ddd9",
    borderRadius: 10,
    background: "#f8fbfa",
    overflow: "hidden",
    transition: "border-color 0.18s, background 0.18s",
  } as React.CSSProperties,

  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    padding: "11px 14px",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#0d1f24",
    fontWeight: 400,
  } as React.CSSProperties,

  passwordRow: {
    display: "flex",
    alignItems: "stretch",
    gap: 10,
  } as React.CSSProperties,

  eyeOutsideBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    border: "1.5px solid #d0ddd9",
    background: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b8a90",
    flexShrink: 0,
    transition: "background 0.15s, border-color 0.15s, color 0.15s",
  } as React.CSSProperties,

  fieldError: {
    fontSize: 12,
    color: "#c0392b",
    marginTop: 5,
    paddingLeft: 2,
    display: "flex",
    alignItems: "center",
    gap: 5,
  } as React.CSSProperties,

  errorDot: {
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#c0392b",
    flexShrink: 0,
    display: "inline-block",
  } as React.CSSProperties,

  btnPrimary: {
    width: "100%",
    height: 44,
    background: BRAND,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    marginTop: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    letterSpacing: "0.01em",
  } as React.CSSProperties,

  btnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  } as React.CSSProperties,

  footer: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 13,
    color: "#7a9ea6",
  } as React.CSSProperties,

  link: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 500,
    color: BRAND,
    padding: 0,
  } as React.CSSProperties,
};