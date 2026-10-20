// src/components/Header.tsx
import React, { useState } from 'react';
import { Menu, X, PlusCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import logoSci from '@/assets/logo SSO.svg';
import logoFcyt from '@/assets/fcyt.svg';
import logoUmss from '@/assets/logo_umss_SVG.svg';
import { NuevaNoticiaModal } from '@/components/noticias/NuevaNoticiaModal';

interface NavItem {
  name: string;
  href: string;
}

const NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Usuarios', href: '/usuarios' },
    { name: 'Ambientes', href: '/aulas' },
    { name: 'Normativas', href: '/normas' },
    { name: 'Materias', href: '/materias' },
    { name: 'Exámenes', href: '/examenes' },
    { name: 'Estudiantes', href: '/estudiantes' },
    { name: 'Auditoría', href: '/dashboard/auditoria' },
    { name: 'Configuración', href: '/configuracion' },
    { name: 'Noticias', href: '/noticias' },
  ],
  docente: [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Mis exámenes', href: '/examenes' },
    { name: 'Estudiantes', href: '/estudiantes' },
    { name: 'Noticias', href: '/noticias' },
  ],
  auxiliar: [
    { name: 'Inicio', href: '/dashboard' },
    { name: 'Control de ingreso', href: '/control' },
    { name: 'Aulas', href: '/aulas' },
    { name: 'Noticias', href: '/noticias' },
  ],
   estudiante: [
    { name: 'Mi módulo', href: '/estudiante' },
    { name: 'Noticias', href: '/noticias' },
  ],
};

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNoticiaModalOpen, setIsNoticiaModalOpen] = useState(false);

  const { isAuthenticated, role, name: userName } = authService.getCurrentUser();
  const normalizedRole = role.toLowerCase() === 'administrador' ? 'admin' : role.toLowerCase();
  const navItems = NAV_ITEMS_BY_ROLE[normalizedRole] || NAV_ITEMS_BY_ROLE.docente;

  // Solo Admins y Docentes pueden publicar noticias
  const canPublishNews = isAuthenticated && (normalizedRole === 'admin' || normalizedRole === 'docente');

  const goTo = (href: string) => {
    if (href === '#') return;
    navigate(href);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await authService.logout();
    setIsLoggingOut(false);
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-xs">
        {/* Cinta superior móvil */}
        <div className="flex items-center justify-between bg-sci-navy px-4 py-1.5 text-[10px] font-semibold tracking-wider text-white sm:hidden">
          <span>FCyT · UNIVERSIDAD MAYOR DE SAN SIMÓN</span>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between">
            
            {/* Logo SCI */}
            <div 
              className="flex cursor-pointer select-none items-center gap-2 sm:gap-3"
              onClick={() => goTo(isAuthenticated ? '/dashboard' : '/')}
            >
              <img src={logoSci} alt="Logo SCI" className="h-10 sm:h-12 w-auto object-contain" />
              <div className="leading-tight">
                <span className="block text-lg sm:text-xl font-black tracking-tight text-sci-navy">
                  SCI
                </span>
                <span className="block text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sistema de Control de Ingreso
                </span>
              </div>
            </div>

            {/* Escudos institucionales (Desktop) */}
            <div className="hidden xl:flex items-center gap-8">
              <div className="flex items-center gap-2.5">
                <img src={logoFcyt} alt="FCyT" className="h-8 w-auto object-contain" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                  Facultad de Ciencias y Tecnología
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <img src={logoUmss} alt="UMSS" className="h-8 w-auto object-contain" />
                <span className="text-[11px] font-bold tracking-wider text-foreground">
                  Universidad Mayor de San Simón
                </span>
              </div>
            </div>

            {/* Acciones de usuario y Botón Hamburguesa */}
            <div className="flex items-center gap-2 sm:gap-3">
              {canPublishNews && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsNoticiaModalOpen(true)}
                  className="hidden md:flex gap-1.5 border-sci-cyan text-sci-navy hover:bg-sci-cyan/10 cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4 text-sci-cyan" />
                  Publicar Aviso
                </Button>
              )}

              {isAuthenticated ? (
                <>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                  
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="max-w-[140px] truncate text-sm font-semibold text-foreground">
                      {userName}
                    </span>
                    <span className="text-[11px] capitalize text-muted-foreground">
                      {role}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="hidden sm:inline-flex"
                  >
                    {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                  </Button>
                </>
              ) : (
                <>
                  <span className="hidden md:inline-flex items-center rounded-full border border-border bg-muted/40 px-3.5 py-1 text-xs font-medium text-muted-foreground">
                    Información académica oficial
                  </span>
                  <Button onClick={() => goTo('/login')} size="sm" className="font-semibold shadow-xs cursor-pointer">
                    Ingresar
                  </Button>
                </>
              )}

              {/* Hamburguesa visible SIEMPRE en móviles */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen((prev) => !prev)}
                className="xl:hidden"
                aria-label="Alternar menú de navegación"
              >
                {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden xl:flex justify-center border-t border-border pt-1 text-xs sm:text-sm font-medium">
            {isAuthenticated ? (
              navItems.map((item) => {
                const active = location.pathname.startsWith(item.href);
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => goTo(item.href)}
                    className={`min-h-11 border-b-2 px-4 py-2 transition-colors cursor-pointer ${
                      active
                        ? 'border-primary font-bold text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goTo('/')}
                  className={`border-b-2 px-5 py-2.5 font-bold transition-colors cursor-pointer ${
                    location.pathname === '/'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Inicio
                </button>
                <button
                  type="button"
                  onClick={() => goTo('/cronograma')}
                  className={`border-b-2 px-5 py-2.5 transition-colors cursor-pointer ${
                    location.pathname === '/cronograma'
                      ? 'border-primary font-bold text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Cronograma de exámenes
                </button>
                <button
                  type="button"
                  onClick={() => goTo('/noticias')}
                  className={`border-b-2 px-5 py-2.5 transition-colors cursor-pointer ${
                    location.pathname === '/noticias'
                      ? 'border-primary font-bold text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Noticias
                </button>
              </div>
            )}
          </nav>

          {/* Menú Desplegable Móvil */}
          {mobileOpen && (
            <nav className="border-t border-border py-3 xl:hidden space-y-1">
              {canPublishNews && (
                <button
                  type="button"
                  onClick={() => { setIsNoticiaModalOpen(true); setMobileOpen(false); }}
                  className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-bold text-sci-cyan hover:bg-muted cursor-pointer"
                >
                  + Publicar Aviso Operativo
                </button>
              )}
              {isAuthenticated ? (
                <>
                  {navItems.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => goTo(item.href)}
                      className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
                    >
                      {item.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-destructive hover:bg-muted cursor-pointer"
                  >
                    {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => goTo('/')}
                    className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium hover:bg-muted cursor-pointer"
                  >
                    Inicio
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo('/cronograma')}
                    className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium hover:bg-muted cursor-pointer"
                  >
                    Cronograma de exámenes
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo('/noticias')}
                    className="block w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium hover:bg-muted cursor-pointer"
                  >
                    Noticias
                  </button>
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Inyección del Modal Global */}
      {canPublishNews && (
        <NuevaNoticiaModal 
          isOpen={isNoticiaModalOpen} 
          onClose={() => setIsNoticiaModalOpen(false)} 
          onSuccess={() => {
            // Si el usuario ya está en la vista de noticias, forzamos un reload suave o redibujado.
            if (location.pathname === '/noticias') {
              window.location.reload(); 
            } else {
              goTo('/noticias');
            }
          }}
        />
      )}
    </>
  );
};