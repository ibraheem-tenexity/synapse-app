"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/library";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Invalid credentials. Use the demo account or try again.");
      } else if (result?.url) {
        router.push(result.url);
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleContinueAsDemo() {
    setEmail("demo@synapse.app");
    setPassword("demo");
    // Submit after state update using setTimeout
    setTimeout(() => {
      document.getElementById("login-form")?.dispatchEvent(
        new Event("submit", { cancelable: true, bubbles: true })
      );
    }, 0);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-8 p-8 surface-raised rounded-lg shadow-md border hairline">
        {/* Logo / Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand text-brand-foreground text-xl font-bold">
            S
          </div>
          <h1 className="text-heading-lg font-semibold text-foreground">Synapse</h1>
          <p className="text-body-sm text-secondary">
            Concept knowledge graph for learning
          </p>
        </div>

        {/* Login Form */}
        <form
          id="login-form"
          onSubmit={handleSubmit}
          className="space-y-4"
          data-testid="login-form"
        >
          {error && (
            <div
              role="alert"
              className="px-4 py-3 rounded-md bg-danger-soft text-danger text-body-sm"
            >
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-body-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-body-md focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="you@example.com"
              data-testid="login-email"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-body-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-body-md focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="••••••••"
              data-testid="login-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md bg-brand text-brand-foreground font-medium text-body-md transition-opacity hover:opacity-90 disabled:opacity-60"
            data-testid="login-submit"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-subtle" />
          </div>
          <div className="relative flex justify-center text-body-sm">
            <span className="px-2 bg-raised text-secondary">or</span>
          </div>
        </div>

        {/* Continue as Demo */}
        <button
          type="button"
          onClick={handleContinueAsDemo}
          disabled={loading}
          className="w-full py-2 px-4 rounded-md border border-border-default bg-secondary text-secondary-foreground font-medium text-body-md transition-colors hover:bg-muted disabled:opacity-60"
          data-testid="login-demo"
        >
          Continue as demo
        </button>

        <p className="text-center text-caption text-tertiary">
          Demo account: demo@synapse.app · any password
        </p>
      </div>
    </div>
  );
}
