'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'

const inp: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  padding: '12px 14px', color: '#e8e8e8', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', marginBottom: 10,
  fontFamily: 'inherit',
}

export default function PerfilPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [toast, setToast] = useState('')
  const [email, setEmail] = useState('')
  const [f, setF] = useState({
    full_name: '',
    username: '',
    country: '',
    avatar_url: '',
  })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/auth'); return }
      setEmail(data.session.user.email ?? '')
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single()
      if (profile) {
        setF({
          full_name: profile.full_name ?? '',
          username: profile.username ?? '',
          country: profile.country ?? '',
          avatar_url: profile.avatar_url ?? '',
        })
      }
      setLoading(false)
    })
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: f.full_name.trim(),
        username: f.username.trim(),
        country: f.country.trim(),
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) { showToast('❌ Error al guardar'); return }
    showToast('✅ Perfil actualizado')
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { showToast('❌ Máximo 3MB'); return }
    if (!file.type.startsWith('image/')) { showToast('❌ Solo imágenes'); return }

    setUploadingAvatar(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) { showToast('❌ Error al subir imagen'); setUploadingAvatar(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
    setF(prev => ({ ...prev, avatar_url: publicUrl }))
    showToast('✅ Foto actualizada')
    setUploadingAvatar(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Nav />
      <div style={{ padding: 80, textAlign: 'center', color: '#444', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>Cargando...</div>
    </div>
  )

  const initials = f.full_name ? f.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' }}>
      <Nav />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.startsWith('❌') ? '#ef4444' : '#C9A84C', color: toast.startsWith('❌') ? '#fff' : '#000', padding: '11px 28px', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: '1px solid #2a2a2a', padding: '40px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 10, textTransform: 'uppercase' }}>Mi cuenta</div>
          <div style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>Perfil</div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40 }}>
          <div style={{ width: 80, height: 80, background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {f.avatar_url
              ? <img src={f.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 28, fontWeight: 900, color: '#000' }}>{initials}</span>
            }
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 4 }}>{f.full_name || 'Sin nombre'}</div>
            <div style={{ fontSize: 12, color: '#444', marginBottom: 12 }}>{email}</div>
            <label style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '8px 16px', color: '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', display: 'inline-block' }}>
              {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
              <input type="file" accept="image/*" onChange={uploadAvatar} style={{ display: 'none' }} disabled={uploadingAvatar} />
            </label>
          </div>
        </div>

        {/* Formulario */}
        <div style={{ borderTop: '2px solid #C9A84C', paddingTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: '#C9A84C', marginBottom: 20, textTransform: 'uppercase' }}>Información personal</div>

          <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Nombre completo</div>
          <input
            value={f.full_name}
            onChange={e => setF(x => ({ ...x, full_name: e.target.value }))}
            placeholder="Tu nombre completo"
            style={inp}
          />

          <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Usuario</div>
          <input
            value={f.username}
            onChange={e => setF(x => ({ ...x, username: e.target.value }))}
            placeholder="@usuario"
            style={inp}
          />

          <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>País</div>
          <input
            value={f.country}
            onChange={e => setF(x => ({ ...x, country: e.target.value }))}
            placeholder="Argentina"
            style={inp}
          />

          <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Email</div>
          <input
            value={email}
            disabled
            style={{ ...inp, color: '#444', cursor: 'not-allowed' }}
          />
          <div style={{ fontSize: 11, color: '#333', marginBottom: 20, letterSpacing: 1 }}>El email no se puede modificar.</div>

          <button onClick={save} disabled={saving} style={{ background: '#C9A84C', border: 'none', padding: '12px 28px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}