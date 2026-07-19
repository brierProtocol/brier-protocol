'use client'

import { useRef, useState } from 'react'
import MakerAvatar from '@/components/MakerAvatar'
import { PostBody } from '@/components/bot/PostBody'
import { Panel } from './Panel'
import { personLabel, relDay, type Post } from './botProfile.helpers'
import type { CurrentUser } from '@/hooks/useCurrentUser'

// A data: URL client-side cap, generous under the server's 300KB limit so a
// rejected upload fails fast instead of round-tripping to the API first.
const MAX_UPLOAD_BYTES = 260_000

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Attach button + optional preview, shared by the composer and every reply box. */
function MediaPicker({ mediaUrl, onChange, onError }: { mediaUrl: string; onChange: (v: string) => void; onError: (msg: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [urlMode, setUrlMode] = useState(false)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return onError('Only images and GIFs are supported.')
    if (file.size > MAX_UPLOAD_BYTES) return onError('Image too large — keep it under ~250KB (GIFs included).')
    onChange(await readAsDataUrl(file))
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <button type="button" onClick={() => fileRef.current?.click()} className="font-mono text-[10px] text-[#7a7a86] hover:text-primary transition-colors cursor-pointer">
        🖼 image/gif
      </button>
      <button type="button" onClick={() => setUrlMode(v => !v)} className="font-mono text-[10px] text-[#7a7a86] hover:text-primary transition-colors cursor-pointer">
        or paste link
      </button>
      {urlMode && (
        <input
          value={mediaUrl.startsWith('https://') ? mediaUrl : ''}
          onChange={e => onChange(e.target.value)}
          placeholder="https://giphy.com/…"
          className="flex-1 min-w-0 bg-[#0a0a0c] border border-[#1f1f28] rounded px-2 py-1 text-[11px] text-white outline-none focus:border-primary/50 placeholder:text-[#4a4a54]"
        />
      )}
      {mediaUrl && (
        <span className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- data:/gif URLs, next/image can't optimize either */}
          <img src={mediaUrl} alt="" className="w-6 h-6 rounded object-cover border border-[#222]" />
          <button type="button" onClick={() => onChange('')} className="text-[#5a5a64] hover:text-primary text-[13px] leading-none cursor-pointer">×</button>
        </span>
      )}
    </div>
  )
}

function LikeButton({ liked, count, onToggle }: { liked?: boolean; count?: number; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`flex items-center gap-1 font-mono text-[11px] transition-colors cursor-pointer ${liked ? 'text-primary' : 'text-[#5a5a64] hover:text-primary'}`}>
      <span>{liked ? '♥' : '♡'}</span>
      <span className="tabular-nums">{count || 0}</span>
    </button>
  )
}

interface CommentRowProps {
  post: Post
  isReply?: boolean
  parentId?: string
  address?: string
  canReply: boolean
  onLike: (id: string, parentId?: string | null) => void
  onDelete: (id: string, parentId?: string | null) => void
  onReply?: (parentId: string, text: string, mediaUrl?: string) => void
}

function CommentRow({ post: p, isReply, parentId, address, canReply, onLike, onDelete, onReply }: CommentRowProps) {
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyMedia, setReplyMedia] = useState('')
  const [error, setError] = useState('')
  const isOwn = !!address && p.wallet?.toLowerCase() === address.toLowerCase()
  const hasReplies = !isReply && (p.replies?.length || 0) > 0

  const submitReply = () => {
    if (!onReply || (!replyText.trim() && !replyMedia)) return
    onReply(p.id, replyText, replyMedia || undefined)
    setReplyText(''); setReplyMedia(''); setReplying(false)
  }

  return (
    <div className={isReply ? 'flex gap-3 pl-[60px] pt-4' : 'flex gap-4 px-6 py-5'}>
      <MakerAvatar address={p.wallet} pfpUrl={p.user?.pfpUrl} size={isReply ? 32 : 44} square />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-bold text-white hover:text-primary transition-colors cursor-pointer ${isReply ? 'text-[13px]' : 'text-[15px]'}`}>{personLabel(p.user, p.wallet)}</span>
          <span className="font-mono text-[10px] text-[#555] tabular-nums">{relDay(p.createdAt) || 'now'}</span>
        </div>
        {p.text && <div className="text-[14px] text-[#e0e0e6] leading-relaxed mt-0.5"><PostBody text={p.text} onQuoteClick={() => {}} /></div>}
        {p.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- data:/gif URLs, next/image can't optimize either
          <img src={p.mediaUrl} alt="" className="mt-2 max-h-56 rounded-lg border border-[#1a1a1a] object-contain" />
        )}
        <div className="flex items-center gap-4 mt-1.5">
          <LikeButton liked={p.likedByViewer} count={p.likes} onToggle={() => onLike(p.id, parentId ?? null)} />
          {canReply && !isReply && (
            <button onClick={() => setReplying(v => !v)} className="font-mono text-[11px] text-[#5a5a64] hover:text-primary transition-colors cursor-pointer">reply</button>
          )}
          {isOwn && (
            <button onClick={() => onDelete(p.id, parentId ?? null)} className="font-mono text-[11px] text-[#5a5a64] hover:text-primary transition-colors cursor-pointer">
              delete{hasReplies ? ` (+${p.replies!.length})` : ''}
            </button>
          )}
        </div>

        {replying && (
          <div className="mt-3 flex gap-3">
            <MakerAvatar address={address} size={32} square />
            <div className="flex-1">
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} maxLength={500} placeholder={`Reply to ${personLabel(p.user, p.wallet)}…`}
                className="w-full h-[64px] bg-[#0a0a0c] border border-[#1f1f28] rounded-lg px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-primary/50 resize-y placeholder:text-[#4a4a54]" />
              {error && <div className="text-[10px] text-primary mt-1">{error}</div>}
              <div className="flex items-center justify-between mt-1.5">
                <MediaPicker mediaUrl={replyMedia} onChange={setReplyMedia} onError={setError} />
                <button onClick={submitReply} disabled={!replyText.trim() && !replyMedia} className="rounded-full bg-primary text-[#030303] font-bold text-[11px] px-4 py-1.5 disabled:opacity-30 hover:shadow-[0_0_14px_rgba(255,42,77,0.4)] transition-all shrink-0 ml-3">Reply</button>
              </div>
            </div>
          </div>
        )}

        {!isReply && (p.replies?.length ?? 0) > 0 && (
          <div className="flex flex-col">
            {p.replies!.map(r => (
              <CommentRow key={r.id} post={r} isReply parentId={p.id} address={address} canReply={false} onLike={onLike} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Comments panel + composer. Presentational: `posts` and the compose/submit state
// stay in the page (the page fetches comments alongside the bot), this component
// just renders and calls back on submit / reply / like / delete.
export function BotComments({
  posts, postText, setPostText, onPost, onReply, onDelete, onLike, isConnected, address, currentUser,
}: {
  posts: Post[]
  postText: string
  setPostText: (v: string) => void
  onPost: () => void
  onReply: (parentId: string, text: string, mediaUrl?: string) => void
  onDelete: (id: string, parentId?: string | null) => void
  onLike: (id: string, parentId?: string | null) => void
  isConnected: boolean
  address?: string
  currentUser: CurrentUser | null
}) {
  const totalCount = posts.reduce((n, p) => n + 1 + (p.replies?.length || 0), 0)

  return (
    <div id="comments" className="scroll-mt-28">
    <Panel>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight">Comments</span>
          <span className="font-mono text-[11px] text-[#5a5a64] tabular-nums">{totalCount}</span>
        </div>
        <span className="font-mono text-[10px] text-[#48484f] tracking-wide">traders weigh in on this bot</span>
      </div>
      <div className="px-6 py-5 border-b border-[#141414] bg-[#050507]">
        {isConnected && address ? (
          <div className="flex gap-4">
            <MakerAvatar address={address} pfpUrl={currentUser?.pfpUrl} size={44} square />
            <div className="flex-1">
              <textarea value={postText} onChange={e => setPostText(e.target.value)} maxLength={500} placeholder="Is this edge real? Share your read, cite the tape, call the top…" className="w-full h-[84px] bg-[#0a0a0c] border border-[#1f1f28] rounded-lg px-4 py-3 text-[14px] text-white outline-none focus:border-primary/50 resize-y placeholder:text-[#4a4a54] leading-relaxed" />
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono text-[10px] text-[#3f3f48]">{postText.length}/500 · markdown & {'>'}quotes</span>
                <button onClick={onPost} disabled={!postText.trim()} className="rounded-full bg-primary text-[#030303] font-bold text-[12px] px-5 py-2 disabled:opacity-30 hover:shadow-[0_0_14px_rgba(255,42,77,0.4)] transition-all">Post</button>
              </div>
            </div>
          </div>
        ) : <div className="text-[13px] text-[#8a8a94]">Connect your wallet to weigh in.</div>}
      </div>
      {posts.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="text-[13px] text-[#6a6a74]">No comments yet.</div>
          <div className="text-[11px] text-[#3f3f48] mt-1 font-mono">be the first to call it</div>
        </div>
      ) : (
        <div className="flex flex-col">
          {posts.map((p, i) => (
            <div key={p.id || i} className="border-b border-[#101010] last:border-b-0 hover:bg-[#070709] transition-colors">
              <CommentRow post={p} address={address} canReply={isConnected} onLike={onLike} onDelete={onDelete} onReply={onReply} />
            </div>
          ))}
        </div>
      )}
    </Panel>
    </div>
  )
}

export default BotComments
