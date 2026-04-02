'use client'

import { Member, calculateBalance, formatCurrency } from '@/lib/store'
import { ChevronRight } from 'lucide-react'

interface MemberCardProps {
  member: Member
  onClick: () => void
}

export function MemberCard({ member, onClick }: MemberCardProps) {
  const balance = calculateBalance(member)
  const isPositive = balance >= 0
  
  return (
    <button
      onClick={onClick}
      className="w-full p-4 bg-card border border-border rounded-xl flex items-center gap-3 active:bg-secondary transition-colors"
    >
      <div 
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
          isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}
      >
        {member.name.charAt(0).toUpperCase()}
      </div>
      
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-foreground truncate">{member.name}</p>
        <p className="text-xs text-muted-foreground">
          {member.transactions.length} txn{member.transactions.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div className="text-right">
        <p className={`font-bold font-mono tabular-nums ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? '+' : '-'}{formatCurrency(balance)}
        </p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {isPositive ? 'lena' : 'dena'}
        </p>
      </div>
      
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  )
}
