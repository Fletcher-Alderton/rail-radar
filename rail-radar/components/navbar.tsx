import React from "react";
import { Cog, Home, Heart, Map } from "lucide-react";

const NAV_ITEMS = [
  { label: "Stations", key: "stations", icon: Home },
  { label: "Favorites", key: "favorites", icon: Heart },
  { label: "Route", key: "route", icon: Map },
  { label: "Settings", key: "settings", icon: Cog },
];

export type NavPage = typeof NAV_ITEMS[number]["key"];

export default function Navbar({ current, onChange }: { current: NavPage; onChange: (key: NavPage) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = current === item.key;
          
          return (
            <button
              key={item.key}
              className={`flex flex-col items-center justify-center gap-1 touch-target transition-colors ${
                isActive 
                  ? 'text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => onChange(item.key as NavPage)}
            >
              <Icon 
                className={`w-6 h-6 transition-all ${
                  isActive ? 'scale-110' : 'scale-100'
                }`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-xs font-medium transition-all ${
                isActive ? 'opacity-100' : 'opacity-75'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
