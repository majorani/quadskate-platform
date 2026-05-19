'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import type { User } from '@supabase/supabase-js'
import type { Event, Category, Participant } from '@/lib/supabase'
import { REGLAMENTO_ESTANDAR_URL } from '@/lib/supabase'
import { validateFileMagicBytes } from '@/lib/utils'

const GOLD = '#C9A84C'

const inp: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  padding: '12px 14px', color: '#e8e8e8', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', marginBottom: 10,
  fontFamily: 'inherit',
}

const RESPONSIVE_STYLES = `
  .manage-header-inner { max-width: 900px; margin: 0 auto; }
  .manage-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .status-btns { display: flex; gap: 1px; background: #2a2a2a; flex-wrap: wrap; align-self: flex-start; }
  .tabs-row { display: flex; border-bottom: 1px solid #2a2a2a; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
  .tabs-row::-webkit-scrollbar { display: none; }
  .tab-btn { padding: 12px 18px; border: none; cursor: pointer; font-weight: 700; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; background: transparent; white-space: nowrap; flex-shrink: 0; margin-bottom: -1px; }
  .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .format-btns { display: flex; gap: 1px; background: #2a2a2a; margin-bottom: 16px; flex-wrap: wrap; }
  .format-btn { flex: 1; min-width: 80px; border: none; cursor: pointer; font-weight: 700; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 9px 12px; white-space: nowrap; }
  .consolidation-btns { display: flex; gap: 1px; background: #2a2a2a; margin-bottom: 16px; flex-wrap: wrap; }
  .consolidation-btn { flex: 1; min-width: 90px; border: none; cursor: pointer; font-weight: 700; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; padding: 9px 12px; white-space: nowrap; }
  .participant-row { background: #0a0a0a; padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
  .battery-selector { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .battery-btns { display: flex; gap: 1px; background: #2a2a2a; }
  .form-action-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 4px; }
  .flyer-section { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
  .jam-batteries { display: flex; gap: 1px; background: #2a2a2a; margin-bottom: 12px; flex-wrap: wrap; }
  @media (max-width: 640px) {
    .manage-title-row { flex-direction: column; }
    .status-btns { width: 100%; }
    .status-btns button { flex: 1; min-width: 70px; }
    .form-grid-2 { grid-template-columns: 1fr !important; }
    .participant-row { flex-wrap: wrap; gap: 8px; }
    .battery-selector { width: 100%; }
    .flyer-section { flex-direction: column; }
    .manage-header-inner { padding: 0 16px; }
  }
`

export default function ManageEventPage() {
  const t = useTranslations('ManageEventPage')
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [user, setUser] = useState<User | null>(null)
  const [ev, setEv] = useState<Event | null>(null)
  const [cats, setCats] = useState<Category[]>([])
  const [parts, setParts] = useState<Participant[]>([])
  const [judges, setJudges] = useState<any[]>([])
  const [tab, setTab] = useState('info')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.push('/auth'); return }
      setUser(data.session.user)
      loadAll()
    })

    const partsChannel = supabase.channel(`dashboard-parts-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${eventId}` },
        async () => {
          const { data } = await supabase.from('participants').select('*, profiles(full_name)').eq('event_id', eventId)
          if (data) setParts(data)
        })
      .subscribe()

    const judgesChannel = supabase.channel(`dashboard-judges-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'judges', filter: `event_id=eq.${eventId}` },
        async () => {
          const { data } = await supabase.from('judges').select('*, profiles(full_name, avatar_url)').eq('event_id', eventId)
          if (data) setJudges(data)
        })
      .subscribe()

    return () => {
      supabase.removeChannel(partsChannel)
      supabase.removeChannel(judgesChannel)
    }
  }, [])

  async function loadAll() {
    setLoading(true)
    const [evRes, catsRes, partsRes, judgesRes, scRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).single(),
      supabase.from('categories').select('*').eq('event_id', eventId),
      supabase.from('participants').select('*, profiles(full_name)').eq('event_id', eventId),
      supabase.from('judges').select('*, profiles(full_name, avatar_url)').eq('event_id', eventId),
      supabase.from('scorecards').select('judge_id, participant_id, category_id, run').eq('event_id', eventId),
    ])
    setEv(evRes.data); setCats(catsRes.data ?? [])
    setParts(partsRes.data ?? []); setJudges(judgesRes.data ?? [])
    setScores(scRes.data ?? [])
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function updateStatus(status: string) {
    const { error } = await supabase.from('events').update({ status }).eq('id', eventId)
    if (error) { showToast(t('toastStatusError')); return }
    setEv(prev => prev ? { ...prev, status: status as any } : prev)
    showToast(t('toastStatusOk'))
    if (status === 'published') {
      await fetch('/api/events/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) })
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Nav />
      <div style={{ padding: 80, textAlign: 'center', color: '#444', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>{t('loading')}</div>
    </div>
  )
  if (!ev) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <Nav />
      <div style={{ padding: 80, textAlign: 'center', color: '#ef4444' }}>{t('notFound')}</div>
    </div>
  )

  const isEncuentro = (ev as any).event_type === 'encuentro'

  const tabs = isEncuentro
    ? [
        { id: 'info',          label: t('tabInfo') },
        { id: 'parts',         label: t('tabParts') },
        { id: 'organizadores', label: t('tabOrganizers') },
        { id: 'minijam',       label: t('tabMiniJam') },
      ]
    : [
        { id: 'info',   label: t('tabInfo') },
        { id: 'cats',   label: t('tabCats') },
        { id: 'parts',  label: t('tabParts') },
        { id: 'judges', label: t('tabJudges') },
      ]

  const statusOptions = [
    { value: 'draft',     label: t('statusDraft'),    color: '#444' },
    { value: 'published', label: t('statusPublish'),  color: GOLD },
    { value: 'active',    label: t('statusActivate'), color: '#4CAF50' },
    { value: 'finished',  label: t('statusFinish'),   color: '#666' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' }}>
      <style>{RESPONSIVE_STYLES}</style>
      <Nav />

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: toast.startsWith('❌') ? '#ef4444' : GOLD, color: toast.startsWith('❌') ? '#fff' : '#000', padding: '11px 28px', fontWeight: 900, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <div style={{ borderBottom: '1px solid #2a2a2a', padding: '32px 16px 0' }}>
        <div className="manage-header-inner">
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20, fontWeight: 700, padding: 0 }}>
            {t('backButton')}
          </button>
          <div className="manage-title-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, textTransform: 'uppercase' }}>
                  {isEncuentro ? t('eyebrowEncuentro') : t('eyebrowCompetencia')}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '2px 7px', border: `1px solid ${isEncuentro ? '#555' : GOLD}`, color: isEncuentro ? '#666' : GOLD }}>
                  {isEncuentro ? t('badgeEncuentro') : t('badgeCompetencia')}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>{ev.name}</div>
            </div>
            <div className="status-btns">
              {statusOptions.map(s => (
                <button key={s.value} onClick={() => updateStatus(s.value)} style={{ padding: '10px 14px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', background: ev.status === s.value ? s.color : '#0a0a0a', color: ev.status === s.value ? (s.value === 'published' ? '#000' : '#fff') : '#444' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="tabs-row">
            {tabs.map(tb => (
              <button key={tb.id} onClick={() => setTab(tb.id)} className="tab-btn" style={{ color: tab === tb.id ? GOLD : '#444', borderBottom: tab === tb.id ? `2px solid ${GOLD}` : '2px solid transparent' }}>
                {tb.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 16px' }}>
        {tab === 'info' && <InfoTab ev={ev} setEv={setEv} eventId={eventId} showToast={showToast} t={t} />}
        {!isEncuentro && tab === 'cats'   && <CatsTab cats={cats} setCats={setCats} eventId={eventId} showToast={showToast} t={t} />}
        {!isEncuentro && tab === 'parts'  && <PartsTab parts={parts} setParts={setParts} cats={cats} setCats={setCats} judges={judges} scores={scores} eventId={eventId} showToast={showToast} t={t} />}
        {!isEncuentro && tab === 'judges' && <PeopleTab people={judges} setPeople={setJudges} eventId={eventId} showToast={showToast} t={t} role="judge" title={t('judgesTitle')} addLabel={t('judgesAddLabel')} emptyLabel={t('judgesEmpty')} />}
        {isEncuentro && tab === 'parts'         && <EncuentroPartsTab parts={parts} setParts={setParts} eventId={eventId} showToast={showToast} t={t} />}
        {isEncuentro && tab === 'organizadores' && <PeopleTab people={judges} setPeople={setJudges} eventId={eventId} showToast={showToast} t={t} role="judge" title={t('organizersTitle')} addLabel={t('organizersAddLabel')} emptyLabel={t('organizersEmpty')} />}
        {isEncuentro && tab === 'minijam'       && <MiniJamTab cats={cats} setCats={setCats} parts={parts} setParts={setParts} eventId={eventId} showToast={showToast} t={t} />}
      </div>
    </div>
  )
}

function InfoTab({ ev, setEv, eventId, showToast, t }: any) {
  const [f, setF] = useState({
    name: ev.name, city: ev.city ?? '', country: ev.country ?? 'AR',
    event_date: ev.event_date ?? '', event_time: ev.event_time?.slice(0, 5) ?? '',
    location_name: ev.location_name ?? '', address: ev.address ?? '', description: ev.description ?? ''
  })
  const [saving, setSaving] = useState(false)
  const [uploadingFlyer, setUploadingFlyer] = useState(false)
  const [flyerUrl, setFlyerUrl] = useState(ev.flyer_url ?? null)

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('events').update(f).eq('id', eventId)
    setSaving(false)
    if (error) { showToast(t('toastInfoError')); return }
    setEv((prev: any) => ({ ...prev, ...f }))
    showToast(t('toastInfoSaved'))
  }

  async function uploadFlyer(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast(t('toastFlyerSizeError')); return }
    if (!file.type.startsWith('image/')) { showToast(t('toastFlyerTypeError')); return }
    const validMime = await validateFileMagicBytes(file, 'image')
    if (!validMime) { showToast(t('toastFlyerTypeError')); return }
    setUploadingFlyer(true)
    const ext = file.name.split('.').pop()
    const path = `${eventId}/flyer.${ext}`
    const { error: uploadError } = await supabase.storage.from('flyers').upload(path, file, { upsert: true })
    if (uploadError) { showToast(t('toastFlyerUploadError')); setUploadingFlyer(false); return }
    const { data: { publicUrl } } = supabase.storage.from('flyers').getPublicUrl(path)
    const { error: updateError } = await supabase.from('events').update({ flyer_url: publicUrl }).eq('id', eventId)
    if (updateError) { showToast(t('toastFlyerUpdateError')); setUploadingFlyer(false); return }
    setFlyerUrl(publicUrl)
    setEv((prev: any) => ({ ...prev, flyer_url: publicUrl }))
    showToast(t('toastFlyerUploaded'))
    setUploadingFlyer(false)
  }

  async function removeFlyer() {
    const { error } = await supabase.from('events').update({ flyer_url: null }).eq('id', eventId)
    if (error) { showToast(t('toastStatusError')); return }
    setFlyerUrl(null)
    setEv((prev: any) => ({ ...prev, flyer_url: null }))
    showToast(t('toastFlyerRemoved'))
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>{t('infoTitle')}</div>
      <input placeholder={t('infoPlaceholderName')} value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} style={inp} />
      <div className="form-grid-2">
        <input placeholder={t('infoPlaceholderCity')} value={f.city} onChange={e => setF(x => ({ ...x, city: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
        <input placeholder={t('infoPlaceholderCountry')} value={f.country} onChange={e => setF(x => ({ ...x, country: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
      </div>
      <div style={{ marginBottom: 10 }} />
      <input placeholder={t('infoPlaceholderLocation')} value={f.location_name} onChange={e => setF(x => ({ ...x, location_name: e.target.value }))} style={inp} />
      <input placeholder={t('infoPlaceholderAddress')} value={f.address} onChange={e => setF(x => ({ ...x, address: e.target.value }))} style={inp} />
      <div className="form-grid-2">
        <input type="date" value={f.event_date} onChange={e => setF(x => ({ ...x, event_date: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
        <input type="time" value={f.event_time} onChange={e => setF(x => ({ ...x, event_time: e.target.value }))} style={{ ...inp, marginBottom: 0 }} />
      </div>
      <div style={{ marginBottom: 10 }} />
      <textarea placeholder={t('infoPlaceholderDescription')} value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} style={{ ...inp, minHeight: 80, resize: 'vertical' }} />
      <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 16, textTransform: 'uppercase' }}>{t('flyerTitle')}</div>
        {flyerUrl ? (
          <div className="flyer-section">
            <img src={flyerUrl} alt="Flyer" style={{ width: 120, height: 160, objectFit: 'cover', border: '1px solid #2a2a2a', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ background: '#111', border: '1px solid #2a2a2a', padding: '10px 16px', color: '#e8e8e8', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', display: 'inline-block' }}>
                {uploadingFlyer ? t('flyerUploading') : t('flyerChange')}
                <input type="file" accept="image/*" onChange={uploadFlyer} style={{ display: 'none' }} disabled={uploadingFlyer} />
              </label>
              <button onClick={removeFlyer} style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '10px 16px', color: '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}>
                {t('flyerRemove')}
              </button>
            </div>
          </div>
        ) : (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #2a2a2a', padding: '32px 24px', cursor: 'pointer', gap: 8 }}>
            <div style={{ fontSize: 28 }}>🖼</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: uploadingFlyer ? GOLD : '#444' }}>
              {uploadingFlyer ? t('flyerUploading') : t('flyerUpload')}
            </div>
            <div style={{ fontSize: 10, color: '#333', letterSpacing: 1 }}>{t('flyerHint')}</div>
            <input type="file" accept="image/*" onChange={uploadFlyer} style={{ display: 'none' }} disabled={uploadingFlyer} />
          </label>
        )}
      </div>
      <ReglamentoSection eventId={eventId} ev={ev} setEv={setEv} showToast={showToast} t={t} />

      <button onClick={save} disabled={saving} style={{ background: GOLD, border: 'none', padding: '12px 28px', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', opacity: saving ? 0.7 : 1 }}>
        {saving ? t('infoSaving') : t('infoSave')}
      </button>
    </div>
  )
}

function CatsTab({ cats, setCats, eventId, showToast, t }: any) {
  const [name, setName] = useState('')
  const [format, setFormat] = useState('formal')
  const [maxRuns, setMaxRuns] = useState(2)
  const [hasFinal, setHasFinal] = useState(false)
  const [finalistsCount, setFinalistsCount] = useState(8)
  const [hasBestTrickFinal, setHasBestTrickFinal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingCat, setEditingCat] = useState<any>(null)
  const [editFormat, setEditFormat] = useState('')
  const [editMaxRuns, setEditMaxRuns] = useState(2)
  const [editHasFinal, setEditHasFinal] = useState(false)
  const [editFinalistsCount, setEditFinalistsCount] = useState(8)
  const [editHasBestTrickFinal, setEditHasBestTrickFinal] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const fmtL: Record<string, string> = { formal: t('catsFormatFormal'), jam: t('catsFormatJam'), best_trick: t('catsFormatBestTrick') }
  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 16px' }

  function startEdit(cat: any) {
    setEditingCat(cat)
    setEditFormat(cat.format)
    setEditMaxRuns(cat.max_runs ?? 2)
    setEditHasFinal(cat.has_final ?? false)
    setEditFinalistsCount(cat.finalists_count ?? 8)
    setEditHasBestTrickFinal(cat.has_best_trick_final ?? false)
  }

  async function saveEdit() {
    if (!editingCat) return
    setEditSaving(true)
    const weights = { intencion: 15, dificultad: 30, ejecucion: 30, estilo: 10, secuencia: 15 }
    const { error } = await supabase.from('categories').update({
      format: editFormat,
      max_runs: editMaxRuns,
      has_final: editFormat === 'formal' ? editHasFinal : false,
      finalists_count: editFormat === 'formal' ? editFinalistsCount : null,
      has_best_trick_final: editFormat === 'formal' ? editHasBestTrickFinal : false,
      weights,
    }).eq('id', editingCat.id)
    setEditSaving(false)
    if (error) { showToast(t('toastCatError', { msg: error.message })); return }
    setCats((prev: any) => prev.map((c: any) => c.id === editingCat.id
      ? { ...c, format: editFormat, max_runs: editMaxRuns, has_final: editHasFinal, finalists_count: editFinalistsCount, has_best_trick_final: editHasBestTrickFinal }
      : c
    ))
    setEditingCat(null)
    showToast(t('toastCatUpdated'))
  }

  async function addCat() {
    if (!name.trim()) return
    setSaving(true)
    const weights = { intencion: 15, dificultad: 30, ejecucion: 30, estilo: 10, secuencia: 15 }
    const { data, error } = await supabase.from('categories').insert({
      event_id: eventId,
      name,
      format,
      max_runs: format === 'jam' ? 1 : maxRuns,
      consolidation: 'best_run',
      weights,
      has_final: format === 'formal' ? hasFinal : false,
      finalists_count: format === 'formal' ? finalistsCount : null,
      has_best_trick_final: format === 'formal' ? hasBestTrickFinal : false,
      phase: 'qualification',
    }).select().single()
    setSaving(false)
    if (error) { showToast(t('toastCatError', { msg: error.message })); return }
    setCats((prev: any) => [...prev, data])
    setName('')
    setHasFinal(false)
    setFinalistsCount(8)
    setHasBestTrickFinal(false)
    showToast(t('toastCatCreated'))
  }

  async function delCat(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setCats((prev: any) => prev.filter((c: any) => c.id !== id))
    showToast(t('toastCatDeleted'))
  }

  function FinalConfig({ hasFinal, setHasFinal, finalistsCount, setFinalistsCount, hasBestTrickFinal, setHasBestTrickFinal }: any) {
    return (
      <div style={{ background: '#111', borderLeft: `3px solid ${GOLD}`, padding: '14px 16px', marginBottom: 16 }}>
        {/* Toggle final */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasFinal ? 14 : 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#e8e8e8' }}>¿Tiene final?</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Activa la fase de final con finalistas</div>
          </div>
          <button onClick={() => setHasFinal(!hasFinal)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <div style={{ width: 44, height: 24, background: hasFinal ? '#1e3a5f' : '#2a2a2a', position: 'relative', transition: 'background .2s' }}>
              <div style={{ position: 'absolute', top: 3, left: hasFinal ? 22 : 3, width: 18, height: 18, background: hasFinal ? GOLD : '#444', transition: 'left .2s' }} />
            </div>
          </button>
        </div>

        {hasFinal && (
          <>
            {/* Cantidad de finalistas */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Cantidad de finalistas</div>
              <div style={{ display: 'flex', gap: 1, background: '#2a2a2a' }}>
                {[4, 6, 8, 10, 12].map(n => (
                  <button key={n} onClick={() => setFinalistsCount(n)}
                    style={{ ...btnBase, flex: 1, background: finalistsCount === n ? GOLD : '#0a0a0a', color: finalistsCount === n ? '#000' : '#444' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle best trick en final */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#e8e8e8' }}>¿Best trick en final?</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Agrega 4 intentos de best trick después de la pasada</div>
              </div>
              <button onClick={() => setHasBestTrickFinal(!hasBestTrickFinal)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{ width: 44, height: 24, background: hasBestTrickFinal ? '#1e3a5f' : '#2a2a2a', position: 'relative', transition: 'background .2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: hasBestTrickFinal ? 22 : 3, width: 18, height: 18, background: hasBestTrickFinal ? GOLD : '#444', transition: 'left .2s' }} />
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Modal edición */}
      {editingCat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', maxWidth: 500, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a2a' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>{t('catEditTitle')}</div>
              <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>{editingCat.name}</div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('catsFormatLabel')}</div>
              <div className="format-btns" style={{ marginBottom: 16 }}>
                {(['formal', 'jam', 'best_trick'] as const).map(f => (
                  <button key={f} onClick={() => setEditFormat(f)} className="format-btn"
                    style={{ background: editFormat === f ? GOLD : '#0a0a0a', color: editFormat === f ? '#000' : '#444' }}>
                    {fmtL[f]}
                  </button>
                ))}
              </div>
              {editFormat === 'formal' && (
                <>
                  <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('catsRunsLabel')}</div>
                  <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
                    {[1, 2].map(n => (
                      <button key={n} onClick={() => setEditMaxRuns(n)}
                        style={{ ...btnBase, flex: 1, background: editMaxRuns === n ? GOLD : '#0a0a0a', color: editMaxRuns === n ? '#000' : '#444' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <FinalConfig
                    hasFinal={editHasFinal} setHasFinal={setEditHasFinal}
                    finalistsCount={editFinalistsCount} setFinalistsCount={setEditFinalistsCount}
                    hasBestTrickFinal={editHasBestTrickFinal} setHasBestTrickFinal={setEditHasBestTrickFinal}
                  />
                </>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={saveEdit} disabled={editSaving}
                  style={{ ...btnBase, background: GOLD, color: '#000', padding: '12px 24px', opacity: editSaving ? 0.7 : 1 }}>
                  {editSaving ? '...' : t('catSaveEdit')}
                </button>
                <button onClick={() => setEditingCat(null)}
                  style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666', padding: '12px 24px' }}>
                  {t('catCancelEdit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>{t('catsTitle')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: 32 }}>
        {cats.length === 0 && <div style={{ background: '#0a0a0a', padding: 24, color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('catsEmpty')}</div>}
        {cats.map((cat: any) => (
          <div key={cat.id} style={{ background: '#0a0a0a', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: -0.3 }}>{cat.name}</div>
              <div style={{ color: '#444', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span>{fmtL[cat.format] ?? cat.format}</span>
                {cat.format === 'formal' && <span>· {cat.max_runs} pasada{cat.max_runs !== 1 ? 's' : ''}</span>}
                {cat.has_final && <span style={{ color: GOLD }}>· Final ({cat.finalists_count} finalistas)</span>}
                {cat.has_best_trick_final && <span style={{ color: GOLD }}>· BT Final</span>}
                {cat.phase === 'final' && <span style={{ color: '#4CAF50' }}>· EN FINAL</span>}
              </div>
            </div>
            <button onClick={() => startEdit(cat)}
              style={{ ...btnBase, background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, flexShrink: 0 }}>
              {t('catEditBtn')}
            </button>
            <button onClick={() => delCat(cat.id)}
              style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666', flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: `2px solid ${GOLD}`, paddingTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 16, textTransform: 'uppercase' }}>{t('catsNewTitle')}</div>
        <input placeholder={t('catsPlaceholderName')} value={name} onChange={e => setName(e.target.value)} style={inp} />
        <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('catsFormatLabel')}</div>
        <div className="format-btns">
          {(['formal', 'jam', 'best_trick'] as const).map(f => (
            <button key={f} onClick={() => setFormat(f)} className="format-btn"
              style={{ background: format === f ? GOLD : '#0a0a0a', color: format === f ? '#000' : '#444' }}>{fmtL[f]}</button>
          ))}
        </div>
        {format === 'formal' && (
          <>
            <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('catsRunsLabel')}</div>
            <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
              {[1, 2].map(n => (
                <button key={n} onClick={() => setMaxRuns(n)}
                  style={{ ...btnBase, flex: 1, background: maxRuns === n ? GOLD : '#0a0a0a', color: maxRuns === n ? '#000' : '#444' }}>{n}</button>
              ))}
            </div>
            <FinalConfig
              hasFinal={hasFinal} setHasFinal={setHasFinal}
              finalistsCount={finalistsCount} setFinalistsCount={setFinalistsCount}
              hasBestTrickFinal={hasBestTrickFinal} setHasBestTrickFinal={setHasBestTrickFinal}
            />
          </>
        )}
        <button onClick={addCat} disabled={saving}
          style={{ ...btnBase, background: GOLD, color: '#000', padding: '12px 28px', opacity: saving ? 0.7 : 1 }}>
          {saving ? t('catsCreating') : t('catsAdd')}
        </button>
      </div>
    </div>
  )
}

function PartsTab({ parts, setParts, cats, setCats, judges, scores, eventId, showToast, t }: any) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [catId, setCatId] = useState(cats[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [showList, setShowList] = useState(false)
  const [showFinalConfirm, setShowFinalConfirm] = useState<string | null>(null)
  const [activatingFinal, setActivatingFinal] = useState(false)
  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 16px' }

  async function addPart() {
    if (!email.trim() || !displayName.trim() || !catId) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast(t('toastNoSession')); setSaving(false); return }
    const res = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ email: email.trim(), displayName: displayName.trim(), eventId, role: 'participant', categoryId: catId }) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { showToast('❌ ' + (data.error || 'Error')); return }
    showToast(data.hadAccount ? t('toastPartAdded') : t('toastPartInvited'))
    setEmail(''); setDisplayName('')
    const { data: partsData } = await supabase.from('participants').select('*').eq('event_id', eventId)
    if (partsData) setParts(partsData)
  }

  async function delPart(id: string) {
    await supabase.from('participants').delete().eq('id', id)
    setParts((prev: any) => prev.filter((p: any) => p.id !== id))
    showToast(t('toastPartDeleted'))
  }

  async function updateBattery(partId: string, battery: number) {
    const { error } = await supabase.from('participants').update({ battery }).eq('id', partId)
    if (error) { showToast(t('toastPartBatteryError')); return }
    setParts((prev: any) => prev.map((p: any) => p.id === partId ? { ...p, battery } : p))
  }

  async function recategorize(partId: string, newCatId: string) {
    const { error } = await supabase.from('participants').update({ category_id: newCatId }).eq('id', partId)
    if (error) { showToast('❌ Error'); return }
    setParts((prev: any) => prev.map((p: any) => p.id === partId ? { ...p, category_id: newCatId } : p))
    showToast(t('toastPartRecategorized'))
  }

  async function moveOrder(catParts: any[], idx: number, dir: 'up' | 'down') {
    const newParts = [...catParts]
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newParts.length) return
    const a = newParts[idx]; const b = newParts[swapIdx]
    const aOrder = a.sort_order ?? idx; const bOrder = b.sort_order ?? swapIdx
    await Promise.all([
      supabase.from('participants').update({ sort_order: bOrder }).eq('id', a.id),
      supabase.from('participants').update({ sort_order: aOrder }).eq('id', b.id),
    ])
    setParts((prev: any) => prev.map((p: any) => {
      if (p.id === a.id) return { ...p, sort_order: bOrder }
      if (p.id === b.id) return { ...p, sort_order: aOrder }
      return p
    }))
    showToast(t('toastPartOrderUpdated'))
  }

  // Verificar si todos los participantes de una categoría tienen puntaje run=1 de al menos 1 juez
  function allScored(catId: string): boolean {
    const catParts = parts.filter((p: any) => p.category_id === catId)
    if (!catParts.length || !judges.length) return false
    return catParts.every((p: any) =>
      scores.some((s: any) => s.participant_id === p.id && s.category_id === catId && s.run === 1)
    )
  }

  // Calcular score de clasificación para ordenar finalistas
  function qualScore(partId: string, catId: string): number {
    const partScores = scores.filter((s: any) => s.participant_id === partId && s.category_id === catId && s.run === 1)
    if (!partScores.length) return -1
    // Promedio entre jueces (simplificado para ordenar)
    return partScores.length
  }

  async function activateFinal(cat: any) {
    setActivatingFinal(true)
    const catParts = parts.filter((p: any) => p.category_id === cat.id)

    // Ordenar por cantidad de scorecards run=1 (proxy de puntaje — el puntaje real lo calcula eventos/[id])
    // Para el pase a final usamos el orden actual sort_order o el que tenga más scorecards
    const sorted = [...catParts].sort((a, b) => qualScore(b.id, cat.id) - qualScore(a.id, cat.id))
    const finalistIds = sorted.slice(0, cat.finalists_count).map((p: any) => p.id)
    const nonFinalistIds = sorted.slice(cat.finalists_count).map((p: any) => p.id)

    try {
      await Promise.all([
        ...finalistIds.map((id: string) => supabase.from('participants').update({ is_finalist: true }).eq('id', id)),
        ...nonFinalistIds.map((id: string) => supabase.from('participants').update({ is_finalist: false }).eq('id', id)),
      ])
      await supabase.from('categories').update({ phase: 'final' }).eq('id', cat.id)

      setParts((prev: any) => prev.map((p: any) => ({
        ...p,
        is_finalist: finalistIds.includes(p.id) ? true : nonFinalistIds.includes(p.id) ? false : p.is_finalist
      })))
      setCats((prev: any) => prev.map((c: any) => c.id === cat.id ? { ...c, phase: 'final' } : c))
      showToast(t('toastFinalActivated'))
    } catch {
      showToast(t('toastFinalError'))
    }
    setActivatingFinal(false)
    setShowFinalConfirm(null)
  }

  const allParts = parts.map((p: any) => ({
    ...p,
    catName: cats.find((c: any) => c.id === p.category_id)?.name ?? '—'
  }))

  return (
    <div>
      {/* Modal confirmación final */}
      {showFinalConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0a0a0a', border: `2px solid ${GOLD}`, maxWidth: 400, width: '100%', padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 16 }}>🏆</div>
            <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 12 }}>{t('finalizeQualificationConfirm')}</div>
            {(() => {
              const cat = cats.find((c: any) => c.id === showFinalConfirm)
              return cat ? <div style={{ fontSize: 11, color: '#555', marginBottom: 24 }}>{t('finalizeQualificationHint', { count: cat.finalists_count })}</div> : null
            })()}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => { const cat = cats.find((c: any) => c.id === showFinalConfirm); if (cat) activateFinal(cat) }}
                disabled={activatingFinal}
                style={{ ...btnBase, background: GOLD, color: '#000', padding: '12px 24px', opacity: activatingFinal ? 0.7 : 1 }}
              >
                {activatingFinal ? '...' : t('finalizeQualificationBtn')}
              </button>
              <button onClick={() => setShowFinalConfirm(null)} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666', padding: '12px 24px' }}>
                {t('cancelBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal lista */}
      {showList && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', maxWidth: 700, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color: GOLD }}>{t('partsListTitle')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => window.print()} style={{ ...btnBase, background: GOLD, color: '#000', padding: '8px 16px' }}>{t('partsListPrint')}</button>
                <button onClick={() => setShowList(false)} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666', padding: '8px 16px' }}>{t('partsListClose')}</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {allParts.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#333', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>{t('partsListEmpty')}</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #2a2a2a' }}>
                      {[t('partsListName'), t('partsListEmail'), t('partsListCategory'), t('partsListStatus')].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 9, fontWeight: 700, letterSpacing: 3, color: GOLD, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allParts.map((p: any, i: number) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? '#0a0a0a' : '#0d0d0d' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>{p.profiles?.full_name || p.display_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#666' }}>{p.email}</td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{p.catName}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: p.status === 'confirmed' ? '#4CAF50' : GOLD }}>
                            {p.status === 'confirmed' ? t('partsStatusConfirmed') : t('partsStatusPending')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: '12px 24px', borderTop: '1px solid #2a2a2a', fontSize: 10, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>
              {allParts.length} participante{allParts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, textTransform: 'uppercase' }}>{t('partsTitle')}</div>
        {parts.length > 0 && (
          <button onClick={() => setShowList(true)} style={{ ...btnBase, background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD, padding: '8px 14px' }}>
            {t('partsListBtn')}
          </button>
        )}
      </div>

      {cats.map((cat: any) => {
        const catParts = [...parts.filter((p: any) => p.category_id === cat.id)]
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        const isJam = cat.format === 'jam'
        const isFormal = cat.format === 'formal'
        const maxBattery = isJam ? Math.max(1, ...catParts.map((p: any) => p.battery || 1)) : 1
        const canActivateFinal = isFormal && cat.has_final && cat.phase === 'qualification' && allScored(cat.id) && catParts.length >= cat.finalists_count

        return (
          <div key={cat.id} style={{ marginBottom: 32 }}>
            {/* Header categoría */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
                {cat.name}
                {cat.phase === 'final' && <span style={{ color: '#4CAF50', marginLeft: 8 }}>· {t('phaseFinal')}</span>}
                {cat.phase === 'qualification' && cat.has_final && <span style={{ color: '#555', marginLeft: 8 }}>· {t('phaseQualification')}</span>}
              </div>
              {/* Botón pasar a final */}
              {isFormal && cat.has_final && cat.phase === 'qualification' && (
                <button
                  onClick={() => canActivateFinal ? setShowFinalConfirm(cat.id) : null}
                  disabled={!canActivateFinal}
                  style={{ ...btnBase, background: canActivateFinal ? GOLD : '#111', color: canActivateFinal ? '#000' : '#333', border: `1px solid ${canActivateFinal ? GOLD : '#2a2a2a'}`, padding: '6px 12px', fontSize: 10, opacity: canActivateFinal ? 1 : 0.6 }}
                >
                  {canActivateFinal ? t('finalizeQualification') : t('pendingScores')}
                </button>
              )}
            </div>

            {isJam && catParts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{t('partsBatteryLabel')}</div>
                <div className="jam-batteries">
                  {Array.from({ length: maxBattery }, (_, i) => i + 1).map(b => {
                    const bParts = catParts.filter((p: any) => (p.battery || 1) === b)
                    return (
                      <div key={b} style={{ background: '#0a0a0a', padding: '10px 14px', flex: 1, minWidth: 110 }}>
                        <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{t('partsBattery', { n: b })}</div>
                        {bParts.length === 0 ? <div style={{ fontSize: 10, color: '#333' }}>{t('partsBatteryEmpty')}</div> : bParts.map((p: any) => <div key={p.id} style={{ fontSize: 11, color: '#e8e8e8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{p.display_name}</div>)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a' }}>
              {catParts.length === 0 && <div style={{ background: '#0a0a0a', padding: '14px 16px', color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('partsEmpty')}</div>}
              {catParts.map((p: any, idx: number) => (
                <div key={p.id} className="participant-row">
                  {/* Orden */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                    <button onClick={() => moveOrder(catParts, idx, 'up')} disabled={idx === 0}
                      style={{ width: 22, height: 22, border: '1px solid #2a2a2a', background: 'transparent', color: idx === 0 ? '#222' : '#666', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
                    <button onClick={() => moveOrder(catParts, idx, 'down')} disabled={idx === catParts.length - 1}
                      style={{ width: 22, height: 22, border: '1px solid #2a2a2a', background: 'transparent', color: idx === catParts.length - 1 ? '#222' : '#666', cursor: idx === catParts.length - 1 ? 'default' : 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
                  </div>

                  <div style={{ fontSize: 11, color: '#333', fontWeight: 700, width: 20, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.profiles?.full_name || p.display_name}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                      <div style={{ fontSize: 10, color: p.status === 'confirmed' ? '#4CAF50' : GOLD, letterSpacing: 2, textTransform: 'uppercase' }}>
                        {p.status === 'confirmed' ? t('partsStatusConfirmed') : t('partsStatusPending')}
                      </div>
                      {cat.has_final && cat.phase === 'final' && (
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: p.is_finalist ? GOLD : '#333', border: `1px solid ${p.is_finalist ? GOLD : '#2a2a2a'}`, padding: '1px 6px' }}>
                          {p.is_finalist ? t('finalist') : t('notFinalist')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recategorizar */}
                  <select value={p.category_id} onChange={e => recategorize(p.id, e.target.value)}
                    style={{ background: '#111', border: '1px solid #2a2a2a', color: '#888', fontSize: 10, padding: '4px 8px', cursor: 'pointer', flexShrink: 0, maxWidth: 120 }}>
                    {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>

                  {isJam && (
                    <div className="battery-selector">
                      <span style={{ fontSize: 9, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>BAT</span>
                      <div className="battery-btns">
                        {[1, 2, 3, 4, 5].map(b => (
                          <button key={b} onClick={() => updateBattery(p.id, b)}
                            style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 11, background: (p.battery || 1) === b ? GOLD : '#0a0a0a', color: (p.battery || 1) === b ? '#000' : '#444' }}>{b}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => delPart(p.id)} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div style={{ borderTop: `2px solid ${GOLD}`, paddingTop: 24, marginTop: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 16, textTransform: 'uppercase' }}>{t('partsNewTitle')}</div>
        <input placeholder={t('partsPlaceholderName')} value={displayName} onChange={e => setDisplayName(e.target.value)} style={inp} />
        <input placeholder={t('partsPlaceholderEmail')} value={email} onChange={e => setEmail(e.target.value)} type="email" style={inp} />
        <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('partsCategoryLabel')}</div>
        <select value={catId} onChange={e => setCatId(e.target.value)} style={{ ...inp, marginBottom: 8 }}>
          {cats.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ fontSize: 11, color: '#444', marginBottom: 16, letterSpacing: 1 }}>{t('partsInviteHint')}</div>
        <button onClick={addPart} disabled={saving} style={{ ...btnBase, background: GOLD, color: '#000', padding: '12px 28px', opacity: saving ? 0.7 : 1 }}>
          {saving ? t('partsAdding') : t('partsAdd')}
        </button>
      </div>
    </div>
  )
}

function EncuentroPartsTab({ parts, setParts, eventId, showToast, t }: any) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 16px' }
  const freeParts = parts.filter((p: any) => !p.category_id || p.category_id === null)

  async function addPart() {
    if (!email.trim() || !displayName.trim()) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast(t('toastNoSession')); setSaving(false); return }
    const res = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ email: email.trim(), displayName: displayName.trim(), eventId, role: 'participant' }) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { showToast('❌ ' + (data.error || 'Error')); return }
    showToast(data.hadAccount ? t('toastPartAdded') : t('toastPartInvited'))
    setEmail(''); setDisplayName('')
    const { data: partsData } = await supabase.from('participants').select('*, profiles(full_name)').eq('event_id', eventId)
    if (partsData) setParts(partsData)
  }

  async function delPart(id: string) {
    await supabase.from('participants').delete().eq('id', id)
    setParts((prev: any) => prev.filter((p: any) => p.id !== id))
    showToast(t('toastPartDeleted'))
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>{t('partsTitle')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: 32 }}>
        {freeParts.length === 0 && <div style={{ background: '#0a0a0a', padding: 24, color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('partsEmpty')}</div>}
        {freeParts.map((p: any) => (
          <div key={p.id} className="participant-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.profiles?.full_name || p.display_name}</div>
              <div style={{ fontSize: 10, color: p.status === 'confirmed' ? '#4CAF50' : GOLD, letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>
                {p.status === 'confirmed' ? t('partsStatusConfirmed') : t('partsStatusPending')}
              </div>
            </div>
            <button onClick={() => delPart(p.id)} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666', flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `2px solid ${GOLD}`, paddingTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 16, textTransform: 'uppercase' }}>{t('encuentroPartsAddTitle')}</div>
        <input placeholder={t('partsPlaceholderName')} value={displayName} onChange={e => setDisplayName(e.target.value)} style={inp} />
        <input placeholder={t('partsPlaceholderEmail')} value={email} onChange={e => setEmail(e.target.value)} type="email" style={inp} />
        <div style={{ fontSize: 11, color: '#444', marginBottom: 16, letterSpacing: 1 }}>{t('partsInviteHint')}</div>
        <button onClick={addPart} disabled={saving} style={{ ...btnBase, background: GOLD, color: '#000', padding: '12px 28px', opacity: saving ? 0.7 : 1 }}>
          {saving ? t('partsAdding') : t('partsAdd')}
        </button>
      </div>
    </div>
  )
}

function PeopleTab({ people, setPeople, eventId, showToast, t, role, title, addLabel, emptyLabel }: any) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 16px' }

  async function invite() {
    if (!email.trim() || !displayName.trim()) return
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast(t('toastNoSession')); setSaving(false); return }
    const res = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ email: email.trim(), displayName: displayName.trim(), eventId, role }) })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { showToast('❌ ' + (data.error || 'Error')); return }
    showToast(data.hadAccount ? t('toastPeopleAdded', { singular: title.slice(0, -1) }) : t('toastPeopleInvited'))
    setEmail(''); setDisplayName('')
    const { data: fresh } = await supabase.from('judges').select('*, profiles(full_name, avatar_url)').eq('event_id', eventId)
    if (fresh) setPeople(fresh)
  }

  async function remove(id: string) {
    await supabase.from('judges').delete().eq('id', id)
    setPeople((prev: any) => prev.filter((j: any) => j.id !== id))
    showToast(t('toastPeopleDeleted'))
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: 32 }}>
        {people.length === 0 && <div style={{ background: '#0a0a0a', padding: 24, color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{emptyLabel}</div>}
        {people.map((j: any) => (
          <div key={j.id} style={{ background: '#0a0a0a', padding: '16px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
              {(j.profiles?.full_name ?? j.display_name ?? '?')[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.profiles?.full_name ?? j.display_name ?? title}</div>
              <div style={{ fontSize: 10, color: j.status === 'confirmed' ? '#4CAF50' : GOLD, letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>
                {j.status === 'confirmed' ? t('peopleStatusConfirmed') : t('peopleStatusPending')}
              </div>
            </div>
            <button onClick={() => remove(j.id)} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666', flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `2px solid ${GOLD}`, paddingTop: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 16, textTransform: 'uppercase' }}>{addLabel}</div>
        <input placeholder={t('partsPlaceholderName')} value={displayName} onChange={e => setDisplayName(e.target.value)} style={inp} />
        <input placeholder={t('partsPlaceholderEmail')} value={email} onChange={e => setEmail(e.target.value)} type="email" style={inp} />
        <div style={{ fontSize: 11, color: '#444', marginBottom: 16, letterSpacing: 1 }}>{t('peopleInviteHint')}</div>
        <button onClick={invite} disabled={saving} style={{ ...btnBase, background: GOLD, color: '#000', padding: '12px 28px', opacity: saving ? 0.7 : 1 }}>
          {saving ? t('peopleAdding') : addLabel}
        </button>
      </div>
    </div>
  )
}

function MiniJamTab({ cats, setCats, parts, setParts, eventId, showToast, t }: any) {
  const miniJam = cats.find((c: any) => c.format === 'jam')
  const [jamName, setJamName] = useState('Mini Jam')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const btnBase: React.CSSProperties = { border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', padding: '9px 16px' }

  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  async function activateJam() {
    setCreating(true)
    const weights = { intencion: 15, dificultad: 30, ejecucion: 30, estilo: 10, secuencia: 15 }
    const { data, error } = await supabase.from('categories').insert({ event_id: eventId, name: jamName.trim() || 'Mini Jam', format: 'jam', max_runs: 1, consolidation: 'best_run', weights }).select().single()
    setCreating(false)
    if (error) { showToast(t('toastMiniJamError')); return }
    setCats((prev: any) => [...prev, data])
    showToast(t('toastMiniJamCreated'))
  }

  async function deactivateJam() {
    if (!miniJam) return
    setDeleting(true)
    await supabase.from('participants').delete().eq('category_id', miniJam.id)
    await supabase.from('categories').delete().eq('id', miniJam.id)
    setCats((prev: any) => prev.filter((c: any) => c.id !== miniJam.id))
    setParts((prev: any) => prev.filter((p: any) => p.category_id !== miniJam.id))
    setDeleting(false)
    showToast(t('toastMiniJamDeactivated'))
  }

  const jamParts = miniJam ? parts.filter((p: any) => p.category_id === miniJam.id) : []
  const maxBattery = jamParts.length > 0 ? Math.max(1, ...jamParts.map((p: any) => p.battery || 1)) : 1

  async function addJamPart() {
    if (!addEmail.trim() || !addName.trim() || !miniJam) return
    setAddSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast(t('toastNoSession')); setAddSaving(false); return }
    const res = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ email: addEmail.trim(), displayName: addName.trim(), eventId, role: 'participant', categoryId: miniJam.id }) })
    const data = await res.json()
    setAddSaving(false)
    if (!res.ok) { showToast('❌ ' + (data.error || 'Error')); return }
    showToast(data.hadAccount ? t('toastPartAdded') : t('toastPartInvited'))
    setAddEmail(''); setAddName('')
    const { data: partsData } = await supabase.from('participants').select('*, profiles(full_name)').eq('event_id', eventId)
    if (partsData) setParts(partsData)
  }

  async function delJamPart(id: string) {
    await supabase.from('participants').delete().eq('id', id)
    setParts((prev: any) => prev.filter((p: any) => p.id !== id))
    showToast(t('toastPartDeleted'))
  }

  async function updateBattery(partId: string, battery: number) {
    const { error } = await supabase.from('participants').update({ battery }).eq('id', partId)
    if (error) { showToast(t('toastPartBatteryError')); return }
    setParts((prev: any) => prev.map((p: any) => p.id === partId ? { ...p, battery } : p))
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 20, textTransform: 'uppercase' }}>{t('miniJamTitle')}</div>
      {!miniJam ? (
        <div>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', padding: 24, marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🛼</div>
            <div style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.3, marginBottom: 8 }}>{t('miniJamInactive')}</div>
            <div style={{ fontSize: 11, color: '#555', letterSpacing: 0.5, lineHeight: 1.6 }}>{t('miniJamInactiveHint')}</div>
          </div>
          <div style={{ fontSize: 10, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{t('miniJamNameLabel')}</div>
          <input placeholder={t('miniJamNamePlaceholder')} value={jamName} onChange={e => setJamName(e.target.value)} style={inp} />
          <button onClick={activateJam} disabled={creating} style={{ ...btnBase, background: GOLD, color: '#000', padding: '12px 28px', opacity: creating ? 0.7 : 1 }}>
            {creating ? t('miniJamActivating') : t('miniJamActivate')}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111', borderLeft: `3px solid ${GOLD}`, padding: '14px 16px', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>{t('miniJamActive')}</div>
              <div style={{ fontSize: 18, fontWeight: 900, textTransform: 'uppercase' }}>{miniJam.name}</div>
              <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, marginTop: 4 }}>
                {jamParts.length !== 1 ? t('miniJamParticipantsPlural', { count: jamParts.length }) : t('miniJamParticipants', { count: jamParts.length })}
                {' · '}
                {maxBattery !== 1 ? t('miniJamBatteryPlural', { count: maxBattery }) : t('miniJamBattery', { count: maxBattery })}
              </div>
            </div>
            <button onClick={deactivateJam} disabled={deleting} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#555', padding: '8px 14px' }}>
              {deleting ? t('miniJamDeactivating') : t('miniJamDeactivate')}
            </button>
          </div>
          {jamParts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: '#444', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>{t('miniJamBatteriesLabel')}</div>
              <div className="jam-batteries">
                {Array.from({ length: maxBattery }, (_, i) => i + 1).map(b => {
                  const bParts = jamParts.filter((p: any) => (p.battery || 1) === b)
                  return (
                    <div key={b} style={{ background: '#0a0a0a', padding: '10px 14px', flex: 1, minWidth: 110 }}>
                      <div style={{ fontSize: 9, color: GOLD, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{t('miniJamBatteryN', { n: b })}</div>
                      {bParts.length === 0 ? <div style={{ fontSize: 10, color: '#333' }}>{t('miniJamBatteryEmpty')}</div> : bParts.map((p: any) => <div key={p.id} style={{ fontSize: 11, color: '#e8e8e8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{p.display_name}</div>)}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: '#2a2a2a', marginBottom: 32 }}>
            {jamParts.length === 0 && <div style={{ background: '#0a0a0a', padding: 24, color: '#333', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>{t('miniJamEmptyParts')}</div>}
            {jamParts.map((p: any) => (
              <div key={p.id} className="participant-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.profiles?.full_name || p.display_name}</div>
                  <div style={{ fontSize: 10, color: p.status === 'confirmed' ? '#4CAF50' : GOLD, letterSpacing: 2, textTransform: 'uppercase', marginTop: 3 }}>
                    {p.status === 'confirmed' ? t('partsStatusConfirmed') : t('partsStatusPending')}
                  </div>
                </div>
                <div className="battery-selector">
                  <span style={{ fontSize: 9, color: '#444', letterSpacing: 2, textTransform: 'uppercase' }}>BAT</span>
                  <div className="battery-btns">
                    {[1, 2, 3, 4, 5].map(b => (
                      <button key={b} onClick={() => updateBattery(p.id, b)} style={{ width: 28, height: 28, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 11, background: (p.battery || 1) === b ? GOLD : '#0a0a0a', color: (p.battery || 1) === b ? '#000' : '#444' }}>{b}</button>
                    ))}
                  </div>
                </div>
                <button onClick={() => delJamPart(p.id)} style={{ ...btnBase, background: 'transparent', border: '1px solid #2a2a2a', color: '#666', flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `2px solid ${GOLD}`, paddingTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 16, textTransform: 'uppercase' }}>{t('miniJamAddTitle')}</div>
            <input placeholder={t('partsPlaceholderName')} value={addName} onChange={e => setAddName(e.target.value)} style={inp} />
            <input placeholder={t('partsPlaceholderEmail')} value={addEmail} onChange={e => setAddEmail(e.target.value)} type="email" style={inp} />
            <div style={{ fontSize: 11, color: '#444', marginBottom: 16, letterSpacing: 1 }}>{t('miniJamAddHint')}</div>
            <button onClick={addJamPart} disabled={addSaving} style={{ ...btnBase, background: GOLD, color: '#000', padding: '12px 28px', opacity: addSaving ? 0.7 : 1 }}>
              {addSaving ? t('miniJamAdding') : t('miniJamAdd')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReglamentoSection({ eventId, ev, setEv, showToast, t }: any) {
  const [useCustom, setUseCustom] = useState<boolean>(ev.use_custom_reglamento ?? false)
  const [reglamentoUrl, setReglamentoUrl] = useState<string | null>(ev.reglamento_url ?? null)
  const [uploading, setUploading] = useState(false)

  async function toggleCustom(val: boolean) {
    setUseCustom(val)
    await supabase.from('events').update({ use_custom_reglamento: val }).eq('id', eventId)
    setEv((prev: any) => ({ ...prev, use_custom_reglamento: val }))
  }

  async function uploadReglamento(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { showToast(t('toastReglamentoSizeError')); return }
    if (file.type !== 'application/pdf') { showToast(t('toastReglamentoTypeError')); return }
    const validMime = await validateFileMagicBytes(file, 'pdf')
    if (!validMime) { showToast(t('toastReglamentoTypeError')); return }
    setUploading(true)
    const path = `${eventId}/reglamento.pdf`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (uploadError) { showToast(t('toastReglamentoUploadError')); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('events').update({ reglamento_url: publicUrl, use_custom_reglamento: true }).eq('id', eventId)
    setReglamentoUrl(publicUrl)
    setUseCustom(true)
    setEv((prev: any) => ({ ...prev, reglamento_url: publicUrl, use_custom_reglamento: true }))
    showToast(t('toastReglamentoUploaded'))
    setUploading(false)
  }

  async function removeReglamento() {
    await supabase.from('events').update({ reglamento_url: null, use_custom_reglamento: false }).eq('id', eventId)
    setReglamentoUrl(null)
    setUseCustom(false)
    setEv((prev: any) => ({ ...prev, reglamento_url: null, use_custom_reglamento: false }))
    showToast(t('toastReglamentoRemoved'))
  }

  return (
    <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 24, marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 4, color: GOLD, marginBottom: 16, textTransform: 'uppercase' }}>
        {t('reglamentoTitle')}
      </div>

      <div style={{ display: 'flex', gap: 1, background: '#2a2a2a', marginBottom: 16 }}>
        <button
          onClick={() => toggleCustom(false)}
          style={{ flex: 1, padding: '10px 12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', background: !useCustom ? GOLD : '#0a0a0a', color: !useCustom ? '#000' : '#444' }}
        >
          {t('reglamentoUseStandard')}
        </button>
        <button
          onClick={() => toggleCustom(true)}
          style={{ flex: 1, padding: '10px 12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', background: useCustom ? GOLD : '#0a0a0a', color: useCustom ? '#000' : '#444' }}
        >
          {t('reglamentoUseCustom')}
        </button>
      </div>

      {!useCustom && (
        <div style={{ background: '#111', borderLeft: '3px solid #2a2a2a', padding: '10px 14px', fontSize: 11, color: '#555', letterSpacing: 0.5 }}>
          {t('reglamentoHintStandard')}
        </div>
      )}

      {useCustom && (
        <div>
          <div style={{ background: '#111', borderLeft: `3px solid ${GOLD}`, padding: '10px 14px', fontSize: 11, color: '#555', letterSpacing: 0.5, marginBottom: 16 }}>
            {t('reglamentoHintCustom')}
          </div>
          {reglamentoUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#111', border: '1px solid #2a2a2a', padding: '14px 16px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#e8e8e8', marginBottom: 4 }}>{t('reglamentoCurrentCustom')}</div>
                <a href={reglamentoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: GOLD, letterSpacing: 1, textDecoration: 'none' }}>{t('reglamentoView')}</a>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <label style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '8px 14px', color: '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', display: 'inline-block' }}>
                  {uploading ? t('reglamentoUploading') : t('reglamentoChange')}
                  <input type="file" accept="application/pdf" onChange={uploadReglamento} style={{ display: 'none' }} disabled={uploading} />
                </label>
                <button onClick={removeReglamento} style={{ background: 'transparent', border: '1px solid #2a2a2a', padding: '8px 14px', color: '#666', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase' }}>
                  {t('reglamentoRemove')}
                </button>
              </div>
            </div>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #2a2a2a', padding: '28px 24px', cursor: 'pointer', gap: 8 }}>
              <div style={{ fontSize: 28 }}>📄</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: uploading ? GOLD : '#444' }}>
                {uploading ? t('reglamentoUploading') : t('reglamentoUpload')}
              </div>
              <div style={{ fontSize: 10, color: '#333', letterSpacing: 1 }}>{t('reglamentoHintFile')}</div>
              <input type="file" accept="application/pdf" onChange={uploadReglamento} style={{ display: 'none' }} disabled={uploading} />
            </label>
          )}
        </div>
      )}
    </div>
  )
}