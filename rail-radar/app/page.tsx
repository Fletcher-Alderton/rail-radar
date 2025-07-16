"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-row justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Rail Radar
          </h1>
          <SignOutButton />
        </div>
      </header>
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Content />
      </main>
    </>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <>
      {isAuthenticated && (
        <button
          className="bg-slate-200 dark:bg-slate-800 text-foreground rounded-md px-2 py-1"
          onClick={() =>
            void signOut().then(() => {
              router.push("/signin");
            })
          }
        >
          Sign out
        </button>
      )}
    </>
  );
}

function Content() {
  const { isAuthenticated } = useConvexAuth();

  if (!isAuthenticated) {
    return (
      <div className="text-center">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Sign in to get started
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Join the community in tracking ticket inspector presence at train stations.
          </p>
          <Link
            href="/signin"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        <FeatureCard
          title="🚂 All Stations"
          description="View all train stations and current ticket inspector reports from the community."
          href="/stations"
          buttonText="View All Stations"
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  href,
  buttonText,
  disabled = false,
  comingSoon = false,
}: {
  title: string;
  description: string;
  href: string;
  buttonText: string;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  const CardContent = (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col transition-shadow ${!disabled ? 'hover:shadow-lg' : ''}`}>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-400 mb-4 flex-grow text-sm">
        {description}
      </p>
      <div className="mt-auto">
        {comingSoon && (
          <span className="inline-block bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs px-2 py-1 rounded-full mb-3">
            Coming Soon
          </span>
        )}
        <div className={`inline-block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          disabled 
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}>
          {buttonText}
        </div>
      </div>
    </div>
  );

  if (disabled) {
    return <div className="cursor-not-allowed">{CardContent}</div>;
  }

  return (
    <Link href={href} className="block">
      {CardContent}
    </Link>
  );
}
