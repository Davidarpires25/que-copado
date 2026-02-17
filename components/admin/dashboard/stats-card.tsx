'use client'

import { motion } from 'framer-motion'
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
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-[#FEC501]',
  iconBgColor = 'bg-[#FEC501]/10',
  trend,
  trendLabel = 'vs. periodo anterior',
  delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#1a1d24] backdrop-blur border border-[#2a2f3a] rounded-xl p-6 hover:border-[#3a4150] transition-colors duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[#8b9ab0] text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-[#f0f2f5] mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-[#8b9ab0] mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              trend.isPositive ? 'text-green-500' : 'text-red-500'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-[#8b9ab0] font-normal">{trendLabel}</span>
            </div>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBgColor)}>
          <Icon className={cn('h-6 w-6', iconColor)} />
        </div>
      </div>
    </motion.div>
  )
}
