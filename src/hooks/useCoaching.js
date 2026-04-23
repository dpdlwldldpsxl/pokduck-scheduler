import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('coaching_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (data) setConversations(data)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const create = async (type = 'general') => {
    const titles = {
      general: '자유 대화',
      schedule: '일정 상담',
      mental: '마음 털기',
      study: '학습 조언',
    }
    const { data } = await supabase
      .from('coaching_conversations')
      .insert({ user_id: user.id, title: titles[type] || '새 대화', conversation_type: type })
      .select()
    if (data) {
      setConversations([data[0], ...conversations])
      return data[0]
    }
  }

  const remove = async (id) => {
    await supabase.from('coaching_conversations').delete().eq('id', id)
    setConversations(conversations.filter((c) => c.id !== id))
  }

  return { conversations, loading, create, remove, reload: load }
}

export function useMessages(conversationId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!conversationId) return
    const { data } = await supabase
      .from('coaching_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
    setLoading(false)
  }, [conversationId])

  useEffect(() => { load() }, [load])

  const addLocal = (role, content) => {
    const msg = { id: crypto.randomUUID(), role, content, created_at: new Date().toISOString() }
    setMessages((prev) => [...prev, msg])
    return msg
  }

  const replaceLastAssistant = (content) => {
    setMessages((prev) => {
      const copy = [...prev]
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === 'assistant') {
          copy[i] = { ...copy[i], content }
          break
        }
      }
      return copy
    })
  }

  return { messages, loading, addLocal, replaceLastAssistant, reload: load }
}
