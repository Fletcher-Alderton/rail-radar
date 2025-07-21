"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto h-screen justify-center items-center">
      <p>Log in to see the numbers</p>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setIsLoading(true);
          
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          
          try {
            await signIn("password", formData);
            router.push("/");
          } catch (error: any) {
            console.error("Sign in error:", error);
            // Provide more helpful error messages
            if (error.message.includes("UNAUTHORIZED") || error.message.includes("_id")) {
              if (flow === "signIn") {
                setError("Account not found. Please check your credentials or sign up first.");
              } else {
                setError("Account already exists. Please sign in instead.");
              }
            } else {
              setError(error.message || "An error occurred during authentication");
            }
          } finally {
            setIsLoading(false);
          }
        }}
      >
        <input
          className="bg-background text-foreground rounded-md p-2 border-2 border-slate-200 dark:border-slate-800"
          type="email"
          name="email"
          placeholder="Email"
          required
          disabled={isLoading}
        />
        <input
          className="bg-background text-foreground rounded-md p-2 border-2 border-slate-200 dark:border-slate-800"
          type="password"
          name="password"
          placeholder="Password"
          required
          disabled={isLoading}
        />
        <button
          className="bg-foreground text-background rounded-md p-2 disabled:opacity-50"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Please wait..." : (flow === "signIn" ? "Sign in" : "Sign up")}
        </button>
        <div className="flex flex-row gap-2">
          <span>
            {flow === "signIn"
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>
          <span
            className="text-foreground underline hover:no-underline cursor-pointer"
            onClick={() => {
              setFlow(flow === "signIn" ? "signUp" : "signIn");
              setError(null);
            }}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </span>
        </div>
        {error && (
          <div className="bg-red-500/20 border-2 border-red-500/50 rounded-md p-2">
            <p className="text-foreground font-mono text-xs">
              {error}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
