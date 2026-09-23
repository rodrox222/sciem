import React from 'react';

type Tab = 'inicio' | 'modulos' | 'agenda' | 'perfil';

interface MobileNavProps {
  activeTab: Tab;
  setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'inicio', label: 'Inicio' },
    { id: 'modulos', label: 'Módulos' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'perfil', label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card px-3 py-2.5 shadow-lg sm:hidden">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center gap-1 cursor-pointer"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive ? 'bg-sci-blue' : 'bg-transparent'
              }`}
            />
            <span
              className={`text-[11px] ${
                isActive ? 'font-bold text-sci-blue' : 'font-medium text-muted-foreground'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};