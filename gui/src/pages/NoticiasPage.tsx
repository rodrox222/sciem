import React, { useEffect, useState } from 'react';
import { Megaphone, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { noticiasService, type Noticia } from '@/services/noticias.service';
import { NewsCard } from '@/components/home/NewsCard';

export const NoticiasPage: React.FC = () => {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const isAuthenticated = authService.getCurrentUser().isAuthenticated;

  useEffect(() => {
    const fetchNoticias = async () => {
      setLoading(true);
      try {
        // Si no está autenticado, pasa isPublic = true
        const response = await noticiasService.getNoticias(page, !isAuthenticated);
        setNoticias(response.data);
        setLastPage(response.last_page);
      } catch (error) {
        console.error('Error al cargar noticias:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNoticias();
  }, [page, isAuthenticated]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Encabezado */}
      <div className="mb-8 flex items-center gap-3 border-b border-border pb-4">
        <Megaphone className="h-8 w-8 text-sci-cyan" />
        <div>
          <h1 className="text-3xl font-black text-sci-navy">Avisos</h1>
          <p className="text-sm text-muted-foreground">
            {isAuthenticated 
              ? 'Comunicados internos y alertas operativas del sistema.' 
              : 'Información pública y comunicados generales de la Facultad.'}
          </p>
        </div>
      </div>

      {/* Contenido */}
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
            {noticias.map((noticia) => (
              <NewsCard key={noticia.id} noticia={noticia} />
            ))}
          </div>

          {/* Paginación */}
          {lastPage > 1 && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <Button 
                variant="outline" 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm font-medium text-slate-600">
                Página {page} de {lastPage}
              </span>
              <Button 
                variant="outline" 
                disabled={page === lastPage} 
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};