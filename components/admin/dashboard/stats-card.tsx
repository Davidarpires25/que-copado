import Link from 'next/link'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBgColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  trendLabel?: string
  delay?: number
  href?: string
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-[var(--admin-accent-text)]',
  iconBgColor = 'bg-[var(--admin-accent)]/10',
  trend,
  trendLabel = 'vs. periodo anterior',
  delay = 0,
  href,
}: StatsCardProps) {
  const content = (
    <div
      className={cn(
        "bg-[var(--admin-surface)] border border-[var(--admin-border)] rounded-xl p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-md)] hover:border-[var(--admin-accent)]/40 transition-all duration-200 h-full animate-fade-in-up",
        href && "cursor-pointer"
      )}
      style={{ animationDelay: `${delay * 1000}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[var(--admin-text-muted)] text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-[var(--admin-text)] mt-1 num-tabular">{value}</p>
          {subtitle && (
            <p className="text-sm text-[var(--admin-text-muted)] mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              trend.isPositive ? 'text-green-500' : 'text-red-500'
            )}>
              {trend.isPositive
                ? <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                : <TrendingDown className="h-3.5 w-3.5 shrink-0" />
              }
              <span className="num-tabular">{Math.abs(trend.value)}%</span>
              <span className="text-[var(--admin-text-muted)] font-normal">{trendLabel}</span>
            </div>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBgColor)}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
