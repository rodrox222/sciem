import { Card, CardContent } from '@/components/ui/card'

interface ExamenMetricsProps {
  total: number
  programmedCount: number
  inProgressCount: number
}

export function ExamenMetrics({ total, programmedCount, inProgressCount }: ExamenMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Exámenes registrados</p>
          <p className="mt-1 text-2xl font-extrabold text-sci-navy">{total}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-muted-foreground">Programados en esta página</p>
          <p className="mt-1 text-2xl font-extrabold text-sci-cyan">{programmedCount}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border bg-card shadow-xs">
        <CardContent className="p-5">
          <p className="text-xs font-medium text-muted-foreground">En proceso en esta página</p>
          <p className="mt-1 text-2xl font-extrabold text-sci-amber">{inProgressCount}</p>
        </CardContent>
      </Card>
    </div>
  )
}