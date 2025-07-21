import React from "react";

const NAV_ITEMS = [
  { label: "Stations", key: "stations" },
  { label: "Favorites", key: "favorites" },
  { label: "Route", key: "route" },
  { label: "Settings", key: "settings" },
];

export type NavPage = typeof NAV_ITEMS[number]["key"];

export default function Navbar({ current, onChange }: { current: NavPage; onChange: (key: NavPage) => void }) {
  return (
    <nav className="w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-sm fixed bottom-0 z-20">
      <div className="max-w-4xl mx-auto flex flex-row justify-between items-center p-2">
        <div className="flex flex-row gap-2 w-full justify-around">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm ${
                current === item.key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-blue-900"
              }`}
              onClick={() => onChange(item.key as NavPage)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
