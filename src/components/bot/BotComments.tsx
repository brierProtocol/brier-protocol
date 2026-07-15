'use client'

import MakerAvatar from '@/components/MakerAvatar'
import { PostBody } from '@/components/bot/PostBody'
import { Panel } from './Panel'
import { personLabel, relDay, type Post } from './botProfile.helpers'
import type { CurrentUser } from '@/hooks/useCurrentUser'

// Comments panel + composer. Presentational: `posts` and the compose/submit state
// stay in the page (the page fetches comments alongside the bot), this component
// just renders and calls back on submit.
export function BotComments({
  posts, postText, setPostText, onPost, isConnected, address, currentUser,
}: {
  posts: Post[]
  postText: string
  setPostText: (v: string) => void
  onPost: () => void
  isConnected: boolean
  address?: string
  currentUser: CurrentUser | null
}) {
  return (
    <div id="comments" className="scroll-mt-28">
    <Panel>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#141414]">
        <div className="flex items-baseline gap-2.5">
          <span className="font-sans font-bold text-[15px] tracking-tight">Comments</span>
          <span className="font-mono text-[11px] text-[#5a5a64] tabular-nums">{posts.length}</span>
        </div>
        <span className="font-mono text-[10px] text-[#48484f] tracking-wide">traders weigh in on this bot</span>
      </div>
      <div className="px-5 py-4 border-b border-[#141414] bg-[#050507]">
        {isConnected && address ? (
          <div className="flex gap-3">
            <MakerAvatar address={address} pfpUrl={currentUser?.pfpUrl} size={36} square />
            <div className="flex-1">
              <textarea value={postText} onChange={e => setPostText(e.target.value)} maxLength={500} placeholder="Is this edge real? Share your read, cite the tape, call the top…" className="w-full h-[68px] bg-[#0a0a0c] border border-[#1f1f28] rounded-lg px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-primary/50 resize-y placeholder:text-[#4a4a54] leading-relaxed" />
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
            <div key={p.id || i} className="flex gap-3 px-5 py-4 border-b border-[#101010] last:border-b-0 hover:bg-[#070709] transition-colors">
              <MakerAvatar address={p.wallet} pfpUrl={p.user?.pfpUrl} size={36} square />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-bold text-white">{personLabel(p.user, p.wallet)}</span>
                  <span className="font-mono text-[10px] text-[#48484f] tabular-nums">{relDay(p.createdAt) || 'now'}</span>
                </div>
                <div className="text-[13px] text-[#cfcfd6] leading-relaxed"><PostBody text={p.text} onQuoteClick={() => {}} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
    </div>
  )
}

export default BotComments
