'use client'

import ApiKeysManager from '@/components/bot/ApiKeysManager'
import { Panel } from './Panel'

// Owner-only inline profile editor. Presentational: the edit form state and the
// save handler live in the page (so an in-progress edit survives closing the
// panel), this component only renders the fields and wires them to the callbacks.
export function BotEditModal({
  botId,
  editName, setEditName,
  editTagline, setEditTagline,
  editDesc, setEditDesc,
  saving, onSave,
}: {
  botId: string
  editName: string; setEditName: (v: string) => void
  editTagline: string; setEditTagline: (v: string) => void
  editDesc: string; setEditDesc: (v: string) => void
  saving: boolean
  onSave: () => void
}) {
  return (
    <Panel className="mb-8 p-5">
      <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#666] mb-4">Edit profile</div>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Name</span><input value={editName} onChange={e => setEditName(e.target.value)} className="mt-1.5 w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50" /></label>
        <label className="block"><span className="text-[12px] text-[#bbb] font-semibold">Tagline</span><input value={editTagline} onChange={e => setEditTagline(e.target.value)} className="mt-1.5 w-full bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50" /></label>
        <label className="block sm:col-span-2"><span className="text-[12px] text-[#bbb] font-semibold">Bio</span><textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="mt-1.5 w-full h-24 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 text-[13px] text-white outline-none focus:border-primary/50 resize-y" /></label>
      </div>
      <button onClick={onSave} disabled={saving} className="mt-4 rounded-full bg-primary text-[#030303] font-bold text-[13px] px-6 py-2.5 disabled:opacity-50 hover:shadow-[0_0_18px_rgba(255,42,77,0.4)] transition-all">{saving ? 'Saving…' : 'Save changes'}</button>
      {/* API Keys — owner-only, inside settings panel */}
      <div className="mt-6 pt-5 border-t border-[#1a1a1a]">
        <ApiKeysManager botId={botId} />
      </div>
    </Panel>
  )
}

export default BotEditModal
