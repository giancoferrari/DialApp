import { supabase } from './supabase'
import type { Wallet } from '../types'

function toWallet(r: Record<string, unknown>): Wallet {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    balance: r.balance as number,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

export async function fetchOrCreateWallet(userId: string): Promise<Wallet> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (data) return toWallet(data)

  const { data: created, error: createErr } = await supabase
    .from('wallets')
    .insert({ user_id: userId, balance: 0 })
    .select()
    .single()
  if (createErr) throw createErr
  return toWallet(created)
}

export async function topUpWallet(userId: string, amount: number): Promise<Wallet> {
  const wallet = await fetchOrCreateWallet(userId)
  const { data, error } = await supabase
    .from('wallets')
    .update({ balance: wallet.balance + amount, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error

  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    amount,
    type: 'topup',
  })

  return toWallet(data)
}

export async function withdrawFromWallet(userId: string, amount: number): Promise<Wallet> {
  const wallet = await fetchOrCreateWallet(userId)
  if (wallet.balance < amount) throw new Error('Insufficient funds.')
  const { data, error } = await supabase
    .from('wallets')
    .update({ balance: wallet.balance - amount, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error

  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    amount: -amount,
    type: 'refund',
  })

  return toWallet(data)
}

export async function deductWager(userId: string, matchId: string, amount: number): Promise<Wallet> {
  const wallet = await fetchOrCreateWallet(userId)
  if (wallet.balance < amount) throw new Error('Insufficient funds.')
  const { data, error } = await supabase
    .from('wallets')
    .update({ balance: wallet.balance - amount, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error

  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    match_id: matchId,
    amount: -amount,
    type: 'wager',
  })

  return toWallet(data)
}

export async function creditWinner(userId: string, matchId: string, amount: number): Promise<Wallet> {
  const wallet = await fetchOrCreateWallet(userId)
  const { data, error } = await supabase
    .from('wallets')
    .update({ balance: wallet.balance + amount, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error

  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    match_id: matchId,
    amount,
    type: 'winnings',
  })

  return toWallet(data)
}

export async function refundWager(userId: string, matchId: string, amount: number): Promise<Wallet> {
  const wallet = await fetchOrCreateWallet(userId)
  const { data, error } = await supabase
    .from('wallets')
    .update({ balance: wallet.balance + amount, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error

  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    match_id: matchId,
    amount,
    type: 'refund',
  })

  return toWallet(data)
}

