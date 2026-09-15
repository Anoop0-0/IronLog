// Achievement kinds come from the server (utils/achievements.js) — it's
// the only thing that decides what counts as a record, so the client just
// renders what it's told.

function TrophyIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z"/>
      <path d="M7 6H5a2 2 0 000 4h2M17 6h2a2 2 0 010 4h-2"/>
    </svg>
  )
}

// stacked bars — "more of the same", which is what a rep record is
function RepsIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19h14M5 13h14M5 7h9"/>
    </svg>
  )
}

const LABELS = {
  weight: {
    badge: 'PR',
    title: 'New personal best',
    // amber for "heaviest ever", violet for "most reps" — two different
    // achievements shouldn't be the same colour, or the badge only tells
    // you that something happened, not what
    pill: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    Icon: TrophyIcon,
  },
  reps: {
    badge: 'REP PR',
    title: 'Rep record',
    pill: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
    Icon: RepsIcon,
  },
}

const detailFor = (kind, reps, weight) =>
  kind === 'weight'
    ? `${weight}kg — the heaviest you've lifted for this exercise`
    : `${reps} reps at ${weight}kg — the most you've done at this weight`

// Small pill shown next to a set that earned a record. Fixed height and
// no-wrap so a row carrying one badge lines up with a row carrying two,
// or none — the set lists put these in their own grid column.
export function AchievementBadge({ kind }) {
  const label = LABELS[kind]
  if (!label) return null
  const { badge, pill, Icon } = label

  return (
    <span
      title={label.title}
      className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full border
                  text-[10px] font-bold uppercase tracking-wide
                  whitespace-nowrap ${pill}`}
    >
      <Icon size={10} />
      {badge}
    </span>
  )
}

// celebration shown right after saving a set that earned a record
export function AchievementBanner({ achievements, reps, weight, onDismiss }) {
  if (!achievements?.length) return null

  return (
    <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3
                    flex items-start gap-3">
      <div className="text-amber-400 mt-0.5 shrink-0">
        <TrophyIcon />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        {achievements.map(kind => (
          <div key={kind}>
            <p className="text-sm font-semibold text-amber-300">
              {LABELS[kind]?.title ?? 'New record'}
            </p>
            <p className="text-xs text-amber-200/70 mt-0.5">
              {detailFor(kind, reps, weight)}
            </p>
          </div>
        ))}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-amber-500/60 active:text-amber-300 text-xs px-1 shrink-0"
      >
        ✕
      </button>
    </div>
  )
}
