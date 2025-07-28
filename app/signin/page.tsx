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
    <div className="flex flex-col gap-8 w-full max-w-sm mx-auto min-h-screen justify-center items-center px-4 safe-area-top safe-area-bottom relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-0 w-full h-full">
          {/* Primary animated orb - Green */}
          <div className="absolute top-0 left-0 w-[80vw] h-[80vw] max-w-[32rem] max-h-[32rem] bg-green-500/30 rounded-full blur-3xl animate-pulse" 
               style={{
                 animation: 'float 8s ease-in-out infinite',
                 transform: 'translate(-25%, -25%)'
               }} />
          
          {/* Secondary animated orb - Yellow */}
          <div className="absolute top-0 right-0 w-[60vw] h-[60vw] max-w-[24rem] max-h-[24rem] bg-yellow-500/40 rounded-full blur-3xl" 
               style={{
                 animation: 'float 12s ease-in-out infinite reverse',
                 transform: 'translate(25%, -25%)'
               }} />
          
          {/* Tertiary animated orb - Red */}
          <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] max-w-[20rem] max-h-[20rem] bg-red-500/35 rounded-full blur-3xl" 
               style={{
                 animation: 'float 10s ease-in-out infinite',
                 transform: 'translate(-25%, 25%)'
               }} />
          
          {/* Fourth animated orb - Green */}
          <div className="absolute bottom-0 right-0 w-[45vw] h-[45vw] max-w-[18rem] max-h-[18rem] bg-green-500/25 rounded-full blur-3xl" 
               style={{
                 animation: 'float 14s ease-in-out infinite reverse',
                 transform: 'translate(25%, 25%)'
               }} />
          
          {/* Fifth animated orb - Yellow */}
          <div className="absolute top-1/2 left-0 w-[35vw] h-[35vw] max-w-[14rem] max-h-[14rem] bg-yellow-500/30 rounded-full blur-3xl" 
               style={{
                 animation: 'float 16s ease-in-out infinite',
                 transform: 'translate(-25%, -50%)'
               }} />
          
          {/* Sixth animated orb - Red */}
          <div className="absolute top-1/2 right-0 w-[40vw] h-[40vw] max-w-[16rem] max-h-[16rem] bg-red-500/20 rounded-full blur-3xl" 
               style={{
                 animation: 'float 18s ease-in-out infinite reverse',
                 transform: 'translate(25%, -50%)'
               }} />
        </div>
        
        {/* Animated mesh gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-background/5 to-transparent animate-pulse" 
             style={{ animationDuration: '4s' }} />
      </div>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
          }
          25% {
            transform: translate(-40%, -60%) scale(1.1) rotate(90deg);
          }
          50% {
            transform: translate(-60%, -40%) scale(0.9) rotate(180deg);
          }
          75% {
            transform: translate(-45%, -55%) scale(1.05) rotate(270deg);
          }
        }
      `}</style>
      
      {/* Glassmorphism card container */}
      <div className="relative w-full">
        {/* Glassmorphism background */}
        <div className="absolute inset-0 rounded-3xl bg-background/60 backdrop-blur-2xl border border-border/10 shadow-2xl" />
        
        {/* Card content */}
        <div className="relative z-10 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {flow === "signIn" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-muted-foreground">
              {flow === "signIn" 
                ? "Sign in to track ticket inspector presence" 
                : "Join the community in tracking ticket inspectors"
              }
            </p>
          </div>
          
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setIsLoading(true);
              
              const formData = new FormData(e.target as HTMLFormElement);
              formData.set("flow", flow);
              
              try {
                await signIn("password", formData);
                router.push("/");
              } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : "An error occurred during authentication";
                if (errorMessage.includes("UNAUTHORIZED") || errorMessage.includes("_id")) {
                  if (flow === "signIn") {
                    setError("Account not found. Please check your credentials or sign up first.");
                  } else {
                    setError("Account already exists. Please sign in instead.");
                  }
                } else {
                  setError(errorMessage);
                }
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <div className="space-y-1">
              <input
                className="w-full bg-background/50 text-foreground rounded-xl p-4 border border-border/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50 backdrop-blur-sm"
                type="email"
                name="email"
                placeholder="Email address"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-1">
              <input
                className="w-full bg-background/50 text-foreground rounded-xl p-4 border border-border/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50 backdrop-blur-sm"
                type="password"
                name="password"
                placeholder="Password"
                required
                disabled={isLoading}
              />
            </div>
            
            <button
              className="w-full bg-foreground text-background rounded-xl p-4 font-semibold touch-target transition-all disabled:opacity-50 hover:bg-foreground/90 active:scale-95 shadow-lg"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                  Please wait...
                </div>
              ) : (
                flow === "signIn" ? "Sign In" : "Create Account"
              )}
            </button>
            
            <div className="flex flex-row gap-2 text-sm justify-center pt-2">
              <span className="text-muted-foreground">
                {flow === "signIn"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </span>
              <button
                type="button"
                className="text-primary underline hover:no-underline cursor-pointer font-medium"
                onClick={() => {
                  setFlow(flow === "signIn" ? "signUp" : "signIn");
                  setError(null);
                }}
              >
                {flow === "signIn" ? "Sign up" : "Sign in"}
              </button>
            </div>
            
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mt-4 backdrop-blur-sm">
                <p className="text-destructive text-sm text-center">
                  {error}
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
