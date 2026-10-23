import React, { useEffect, useState } from 'react';
import { Megaphone, LoaderCircle, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { noticiasService, type Noticia } from '@/services/noticias.service';
import { NewsCard } from '@/components/home/NewsCard';
import { NuevaNoticiaModal } from '@/components/noticias/NuevaNoticiaModal';

export const NoticiasPage: React.FC = () => {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  
  const [isNoticiaModalOpen, setIsNoticiaModalOpen] = useState(false);
  const [noticiaEditando, setNoticiaEditando] = useState<Noticia | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Obtener estado de autenticación y datos del usuario
  const userContext = authService.getCurrentUser();
  const isAuthenticated = userContext.isAuthenticated;
  
  // CORRECCIÓN: Se reemplaza "any" por una definición segura de tipo
  const currentUserId = (userContext as { id?: string }).id; 
  const normalizedRole = userContext.role.toLowerCase() === 'administrador' ? 'admin' : userContext.role.toLowerCase();
  
  const canPublishNews = isAuthenticated && (normalizedRole === 'admin' || normalizedRole === 'docente');

  useEffect(() => {
    let isMounted = true;

    noticiasService
      .getNoticias(page, !isAuthenticated)
      .then((response) => {
        if (isMounted) {
          setNoticias(response.data);
          setLastPage(response.last_page);
        }
      })
      .catch((error) => {
        if (isMounted) console.error('Error al cargar noticias:', error);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page, isAuthenticated, reloadKey]);

  const handleReload = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const handleEdit = (noticia: Noticia) => {
    setNoticiaEditando(noticia);
    setIsNoticiaModalOpen(true);
  };

  const handleCreate = () => {
    setNoticiaEditando(null);
    setIsNoticiaModalOpen(true);
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-sci-cyan" />
            <div>
              <h1 className="text-3xl font-black text-sci-navy">Avisos Operativos</h1>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated 
                  ? 'Comunicados internos y alertas operativas del sistema.' 
                  : 'Información pública y comunicados generales de la Facultad.'}
              </p>
            </div>
          </div>
          
          {canPublishNews && (
            <Button 
              onClick={handleCreate}
              className="flex items-center gap-2 bg-sci-blue text-white shadow-sm transition-all hover:bg-sci-navy cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              Publicar Aviso
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-sci-cyan" />
          </div>
        ) : noticias.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-slate-400">
            <Megaphone className="mb-4 h-12 w-12 opacity-20" />
            <p className="text-lg font-medium">No hay avisos publicados en este momento.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {noticias.map((noticia) => {
                const isAuthor = noticia.autor.id === currentUserId;
                const canEditNotice = normalizedRole === 'admin' || (normalizedRole === 'docente' && isAuthor);

                return (
                  <NewsCard 
                    key={noticia.id} 
                    noticia={noticia} 
                    canEdit={canEditNotice}
                    onEdit={handleEdit}
                  />
                );
              })}
            </div>

            {lastPage > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button 
                  variant="outline" 
                  disabled={page === 1} 
                  onClick={() => { setLoading(true); setPage((p) => p - 1); }}
                  className="cursor-pointer"
                >
                  Anterior
                </Button>
                <span className="text-sm font-medium text-slate-600">
                  Página {page} de {lastPage}
                </span>
                <Button 
                  variant="outline" 
                  disabled={page === lastPage} 
                  onClick={() => { setLoading(true); setPage((p) => p + 1); }}
                  className="cursor-pointer"
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {canPublishNews && (
        <NuevaNoticiaModal 
          isOpen={isNoticiaModalOpen} 
          onClose={() => setIsNoticiaModalOpen(false)} 
          onSuccess={handleReload}
          noticiaEditando={noticiaEditando}
        />
      )}
    </>
  );
};