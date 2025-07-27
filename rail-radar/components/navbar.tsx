import React from "react";
import { useTheme } from "next-themes";

const NAV_ITEMS = [
  { label: "Stations", key: "stations", icon: "house", aria: "Stations" },
  { label: "Favorites", key: "favorites", icon: "heart", aria: "Favorites" },
  { label: "Route", key: "route", icon: "map", aria: "Route" },
];

export type NavPage = typeof NAV_ITEMS[number]["key"];

export default function Navbar({ 
  current, 
  onChange, 
  searchButton,
  routeFab
}: { 
  current: NavPage; 
  onChange: (key: NavPage) => void;
  searchButton?: React.ReactNode;
  routeFab?: React.ReactNode;
}) {
  const { theme, resolvedTheme } = useTheme();
  const iconSuffix = resolvedTheme === 'dark' ? 'white' : 'black';
  
  // Debug logging
  console.log('Navbar - theme:', theme, 'resolvedTheme:', resolvedTheme, 'iconSuffix:', iconSuffix);

  const getIcon = (iconName: string) => {
    const iconPath = `/icons/${iconName}.${iconSuffix}.svg`;
    console.log('Loading icon:', iconPath);
    return (
      <img
        src={iconPath}
        alt=""
        width={20}
        height={20}
        className="select-none"
        draggable="false"
      />
    );
  };

  return (
    <div className="fixed left-1/2 bottom-6 z-50 -translate-x-1/2 flex items-center gap-3">
      <nav
        className="
          max-w-[280px] w-[calc(100vw-120px)]
          rounded-full bg-background/70 backdrop-blur-xl shadow-xl
          border border-border/10
          px-2 py-1
          flex items-center justify-center
          safe-area-bottom
        "
        style={{
          // For iOS safe area
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex justify-around items-center w-full h-12">
          {NAV_ITEMS.map((item) => {
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
                aria-label={item.aria}
                type="button"
              >
                <div
                  className="mb-0.5 select-none"
                  style={{ filter: isActive ? undefined : 'grayscale(1) opacity(0.7)' }}
                >
                  {getIcon(item.icon)}
                </div>
                <span
                  className="text-[10px] font-medium"
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      
      {searchButton && (
        <div className="flex items-center">
          {searchButton}
        </div>
      )}

      {routeFab && (
        <div className="flex items-center">
          {routeFab}
        </div>
      )}
    </div>
  );
}
