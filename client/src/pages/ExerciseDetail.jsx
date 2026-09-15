import { useState, useEffect, useRef, useMemo, Fragment } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import AppLayout       from '../components/layout/AppLayout'
import Stepper         from '../components/workout/Stepper'
import TrendAreaChart  from '../components/charts/TrendAreaChart'
import MultiLineChart  from '../components/charts/MultiLineChart'
import {
  getTodayWorkout, addSetToToday, updateSetInToday, deleteSetFromToday,
  updateExerciseNotes, deleteExerciseFromToday, getExerciseHistory,
} from '../api/workouts.api'
import {
  getMaxRepsSet, getBestSessionVolume, getEstimated1RM, getBestWeightByReps,
  filterByDays, TIMELINE_RANGES,
  getStandingRecords, standingAchievements,
} from '../utils/progressHelpers'
import {
  EXERCISE_GRAPHS, DEFAULT_GRAPH_ID, getExerciseGraphData,
} from '../utils/exerciseGraphs'
import { useTimer } from '../hooks/useTimer'
import { AchievementBadge, AchievementBanner } from '../components/workout/Achievement'
import { vibrate, ACHIEVEMENT } from '../utils/haptics'

const TABS = ['Log', 'History', 'Graphs']

const relativeDate = (iso) => {
  const d = new Date(iso)
  const diff = Math.floor((new Date() - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ExerciseDetail() {
  const { exerciseName } = useParams()
  const name = decodeURIComponent(exerciseName)
  const location = useLocation()
  const navigate = useNavigate()
  const { startRestTimer } = useTimer()

  const [bodyPart,  setBodyPart]  = useState(location.state?.bodyPart || '')
  const [notes,     setNotes]     = useState('')
  const [noteOpen,  setNoteOpen]  = useState(false)
  const [sets,      setSets]      = useState([]) // today's saved sets: [{id, originalId, reps, weight, achievements}]
  const [history,   setHistory]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [error,     setError]     = useState('')

  // the record just earned by the set that was saved, if any — cleared on
  // the next save so it always refers to the most recent one
  const [celebration, setCelebration] = useState(null)

  const [draftWeight,   setDraftWeight]   = useState('')
  const [draftReps,     setDraftReps]     = useState('')
  const [selectedSetId, setSelectedSetId] = useState(null)

  // deep-linkable from Progress's personal-records list, which sends
  // you straight to the Graphs tab for a specific exercise
  const [activeTab, setActiveTab] = useState(location.state?.initialTab ?? 0)
  const scrollRef = useRef(null)

  // defaults to All (unlike Progress's 1M default) — this page is
  // usually reached by tapping a specific PR, which is very often older
  // than 30 days, and landing on an empty "Nothing in range" screen
  // right after that tap would be a bad first impression
  const [range, setRange] = useState(TIMELINE_RANGES[TIMELINE_RANGES.length - 1])
  const [graphId, setGraphId] = useState(DEFAULT_GRAPH_ID)

  useEffect(() => {
    const load = async () => {
      try {
        const [todayRes, historyRes] = await Promise.all([
          getTodayWorkout(),
          getExerciseHistory(name),
        ])

        const todayEx = todayRes.data?.exercises.find(e => e.name === name)

        if (todayEx) {
          const loadedSets = todayEx.sets.map(s => ({
            id: s._id, originalId: s._id, reps: s.reps, weight: s.weight,
            achievements: s.achievements || [],
          }))
          setSets(loadedSets)
          setBodyPart(todayEx.bodyPart)
          setNotes(todayEx.notes || '')
          const last = loadedSets[loadedSets.length - 1]
          if (last) { setDraftWeight(last.weight); setDraftReps(last.reps) }
        } else if (!location.state?.bodyPart) {
          // no existing entry today and no bodyPart context to start a
          // fresh one — nothing sensible to render
          setNotFound(true)
        }

        setHistory(historyRes.data)
      } catch {
        setError('Failed to load exercise')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [name])

  useEffect(() => {
    if (notFound) navigate('/log', { replace: true })
  }, [notFound, navigate])

  // land directly on the deep-linked tab (e.g. Graphs, from Progress's
  // PR list) once the panels have actually rendered — setting activeTab
  // alone doesn't move the scroll container
  useEffect(() => {
    if (!loading && activeTab !== 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ left: activeTab * scrollRef.current.clientWidth })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  const canSave = parseFloat(draftWeight) > 0 && parseFloat(draftReps) > 0
  const isEditing = selectedSetId !== null

  const scrollToTab = (i) => {
    setActiveTab(i)
    scrollRef.current?.scrollTo({ left: i * scrollRef.current.clientWidth, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || el.clientWidth === 0) return
    setActiveTab(Math.round(el.scrollLeft / el.clientWidth))
  }

  const handleStep = (field, delta) => {
    const setter = field === 'weight' ? setDraftWeight : setDraftReps
    setter(prev => {
      const next = Math.max(0, (parseFloat(prev) || 0) + delta)
      return Math.round(next * 10) / 10
    })
  }

  const handleSelectSet = (set) => {
    if (selectedSetId === set.id) {
      setSelectedSetId(null); setDraftWeight(''); setDraftReps('')
    } else {
      setSelectedSetId(set.id); setDraftWeight(set.weight); setDraftReps(set.reps)
    }
  }

  const handleClearDraft = () => { setDraftWeight(''); setDraftReps('') }

  const handleNotesBlur = async () => {
    if (sets.length === 0) return
    try {
      await updateExerciseNotes({ exerciseName: name, notes })
    } catch {
      setError('Failed to save note — try again')
    }
  }

  const handleSaveDraft = async () => {
    if (!draftWeight || !draftReps) return
    setError('')
    setCelebration(null)

    try {
      if (selectedSetId) {
        const set = sets.find(s => s.id === selectedSetId)
        await updateSetInToday(set.originalId, { exerciseName: name, reps: draftReps, weight: draftWeight })
        setSets(prev => prev.map(s => s.id === selectedSetId ? { ...s, reps: draftReps, weight: draftWeight } : s))
        setSelectedSetId(null)
      } else {
        const res = await addSetToToday({
          exerciseName: name, bodyPart, notes,
          set: { reps: draftReps, weight: draftWeight },
        })
        const savedExercise = res.data.exercises.find(e => e.name === name)
        const savedSet = savedExercise.sets[savedExercise.sets.length - 1]
        const achievements = savedSet.achievements || []
        setSets(prev => [...prev, {
          id: savedSet._id, originalId: savedSet._id,
          reps: savedSet.reps, weight: savedSet.weight, achievements,
        }])
        if (achievements.length > 0) {
          setCelebration({ achievements, reps: savedSet.reps, weight: savedSet.weight })
          vibrate(ACHIEVEMENT)
        }
        startRestTimer()
      }
      // this set is now part of "today" in history too
      const historyRes = await getExerciseHistory(name)
      setHistory(historyRes.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save set — check your connection and try again')
    }
  }

  const handleDeleteSelected = async () => {
    const set = sets.find(s => s.id === selectedSetId)
    if (!set) return
    setError('')
    try {
      await deleteSetFromToday(set.originalId, name)
      setSets(prev => prev.filter(s => s.id !== set.id))
      setSelectedSetId(null); setDraftWeight(''); setDraftReps('')
      const historyRes = await getExerciseHistory(name)
      setHistory(historyRes.data)
    } catch {
      setError('Failed to delete set — try again')
    }
  }

  const [confirmDeleteExercise, setConfirmDeleteExercise] = useState(false)
  const handleDeleteExercise = async () => {
    try {
      if (sets.length > 0) await deleteExerciseFromToday(name)
      navigate('/log')
    } catch {
      setError('Failed to delete exercise — try again')
    }
  }

  // graphs/stats respect the timeline filter; the Log/History panels
  // stay all-time — filtering "today's exercises" or your full set-log
  // wouldn't make sense
  const rangeHistory = useMemo(
    () => filterByDays(history, range.days, entry => entry.date),
    [history, range]
  )

  const graph = useMemo(
    () => getExerciseGraphData(rangeHistory, graphId),
    [rangeHistory, graphId]
  )

  // deliberately off the unfiltered history: a badge claims "this is the
  // record", so narrowing the timeline must not promote an old set into
  // one it doesn't actually hold
  const standing = useMemo(() => getStandingRecords(history), [history])
  const personalBest    = rangeHistory.length
    ? Math.max(...rangeHistory.flatMap(e => e.sets.map(s => s.weight)))
    : null
  const maxRepsSet        = getMaxRepsSet(rangeHistory)
  const bestSessionVolume = getBestSessionVolume(rangeHistory)
  const estimated1RM     = getEstimated1RM(rangeHistory)
  const weightByReps     = getBestWeightByReps(rangeHistory)

  if (loading) {
    return (
      <AppLayout>
        <div className="px-4 pt-10">
          <div className="h-8 w-40 bg-gray-900 rounded animate-pulse mb-6" />
          <div className="h-64 bg-gray-900 rounded-xl animate-pulse" />
        </div>
      </AppLayout>
    )
  }

  if (notFound) return null

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-10 pb-3">
        <button onClick={() => navigate('/log')} className="text-gray-400 active:text-white p-1 -m-1 mt-0.5">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold text-white truncate">{name}</h1>
          <span className="text-xs text-gray-400">{bodyPart}</span>
        </div>
        <div className="flex gap-1 items-center">
          <button
            onClick={() => setNoteOpen(prev => !prev)}
            className={`text-xs px-2 py-2 transition-colors ${noteOpen ? 'text-red-400' : 'text-gray-400'}`}
          >
            Notes
          </button>
          <button onClick={() => setConfirmDeleteExercise(true)} className="text-gray-500 active:text-red-500 p-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      {confirmDeleteExercise && (
        <div className="mx-4 mb-3 bg-red-900/20 border border-red-800 rounded-xl
                        p-3 flex justify-between items-center">
          <p className="text-xs text-red-400">Delete this exercise from today?</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDeleteExercise(false)} className="text-xs text-gray-500 px-2 py-1">
              Cancel
            </button>
            <button onClick={handleDeleteExercise} className="text-xs text-red-400 font-medium px-2 py-1">
              Delete
            </button>
          </div>
        </div>
      )}

      {noteOpen && (
        <div className="px-4 pb-3">
          <input
            type="text"
            placeholder="Add a note..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2 text-sm text-gray-300 placeholder-gray-600
                       outline-none focus:border-gray-500"
          />
        </div>
      )}

      {error && (
        <div className="mx-4 mb-3 bg-red-900/20 border border-red-800 rounded-xl
                        p-3 text-red-400 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 text-xs ml-2">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-4 gap-1 mb-3">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => scrollToTab(i)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors
                        ${activeTab === i ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-400'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Swipeable panels */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
      >
        {/* Log panel */}
        <div className="w-full flex-shrink-0 snap-center px-4 pb-4 space-y-4">
          <Stepper label="Weight (kg)" value={draftWeight} onChange={setDraftWeight}
            onStep={(d) => handleStep('weight', d)} step={2.5} />
          <Stepper label="Reps" value={draftReps} onChange={setDraftReps}
            onStep={(d) => handleStep('reps', d)} step={1} />

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button onClick={handleSaveDraft} disabled={!canSave}
                  className="flex-1 bg-green-700 disabled:opacity-30 text-white font-semibold
                             py-3.5 rounded-xl active:scale-95 transition-all">
                  Update
                </button>
                <button onClick={handleDeleteSelected}
                  className="flex-1 bg-red-700 text-white font-semibold py-3.5
                             rounded-xl active:scale-95 transition-all">
                  Delete
                </button>
              </>
            ) : (
              <>
                <button onClick={handleSaveDraft} disabled={!canSave}
                  className="flex-1 bg-green-700 disabled:opacity-30 text-white font-semibold
                             py-3.5 rounded-xl active:scale-95 transition-all">
                  Save
                </button>
                <button onClick={handleClearDraft}
                  className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 font-semibold
                             py-3.5 rounded-xl active:scale-95 transition-all">
                  Clear
                </button>
              </>
            )}
          </div>

          {celebration && (
            <AchievementBanner
              achievements={celebration.achievements}
              reps={celebration.reps}
              weight={celebration.weight}
              onDismiss={() => setCelebration(null)}
            />
          )}

          {sets.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <p className="text-xs text-gray-400 uppercase tracking-wide px-4 pt-3 pb-1">Today</p>
              {sets.map((set, i) => (
                <button
                  key={set.id}
                  onClick={() => handleSelectSet(set)}
                  className={`w-full flex items-center px-4 py-3 text-left border-t border-gray-800
                             transition-colors ${selectedSetId === set.id ? 'bg-red-950/30' : 'active:bg-gray-800/50'}`}
                >
                  <span className="w-8 text-xs text-gray-400 font-medium">{i + 1}</span>
                  <span className="flex-1 text-sm text-white text-center">
                    {set.weight}<span className="text-gray-500 text-xs ml-1">kg</span>
                  </span>
                  <span className="flex-1 text-sm text-white text-center">
                    {set.reps}<span className="text-gray-500 text-xs ml-1">reps</span>
                  </span>
                  {/* fixed width so every row's reps column lands in the
                      same place whether or not that set earned a badge;
                      wraps rather than overflowing when a set is both a
                      weight and a rep record */}
                  <span className="w-20 shrink-0 flex flex-wrap justify-end gap-1">
                    {standingAchievements(set, standing).map(kind => (
                      <AchievementBadge key={kind} kind={kind} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* History panel */}
        <div className="w-full flex-shrink-0 snap-center px-4 pb-4">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">No history yet</p>
              <p className="text-gray-600 text-xs mt-1">Sets you log will show up here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-2">{relativeDate(entry.date)}</p>
                  {/* One grid for the whole list, not a flex row per set:
                      grid columns size to the widest cell across every row,
                      so the badges and the weight/reps text line up even
                      when some sets have a badge, two badges, or none. */}
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1.5 text-sm">
                    {entry.sets.map((s, si) => (
                      <Fragment key={si}>
                        <span className="text-gray-500">Set {si + 1}</span>
                        <span className="flex items-center justify-end gap-1.5">
                          {standingAchievements(s, standing).map(kind => (
                            <AchievementBadge key={kind} kind={kind} />
                          ))}
                        </span>
                        <span className="text-white text-right tabular-nums">
                          {s.weight}kg × {s.reps} reps
                        </span>
                      </Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Graphs panel */}
        <div className="w-full flex-shrink-0 snap-center px-4 pb-4">
          {history.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">Nothing logged yet</p>
              <p className="text-gray-600 text-xs mt-1">Stats and trends show up after your first set</p>
            </div>
          ) : (
            <>
              {/* Graph type */}
              <div className="mb-3">
                <label className="block text-[10px] font-medium text-gray-500 uppercase
                                  tracking-wider mb-1.5">
                  Graph
                </label>
                <div className="relative">
                  <select
                    value={graphId}
                    onChange={e => setGraphId(e.target.value)}
                    className="w-full appearance-none bg-gray-900 border border-gray-800
                               rounded-lg pl-3 pr-9 py-2.5 text-sm text-white
                               outline-none focus:border-red-700"
                  >
                    {EXERCISE_GRAPHS.map(g => (
                      <option key={g.id} value={g.id}>{g.label}</option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#777"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </div>
              </div>

              {/* Timeline range — same filter as the Progress page */}
              <div className="flex gap-2 mb-4">
                {TIMELINE_RANGES.map(r => (
                  <button
                    key={r.label}
                    onClick={() => setRange(r)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors
                                ${range.label === r.label
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-900 text-gray-400 border border-gray-800'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {personalBest === null ? (
                <div className="text-center py-16">
                  <p className="text-gray-400 text-sm">No sets in this range</p>
                  <p className="text-gray-600 text-xs mt-1">Try a wider timeline above</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Personal best</p>
                      <p className="text-lg font-bold text-red-400">{personalBest}kg</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Max reps</p>
                      <p className="text-lg font-bold text-red-400">{maxRepsSet.reps}</p>
                      <p className="text-xs text-gray-500 mt-0.5">@ {maxRepsSet.weight}kg</p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Est. 1RM</p>
                      <p className="text-lg font-bold text-red-400">{estimated1RM.estimate}kg</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        from {estimated1RM.weight}kg × {estimated1RM.reps}
                      </p>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Best session volume</p>
                      <p className="text-lg font-bold text-red-400">
                        {bestSessionVolume.volume.toLocaleString()}<span className="text-xs">kg</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-white mb-2">{graph.label}</p>
                    {graph.kind === 'multi' ? (
                      <MultiLineChart
                        data={graph.data}
                        keys={graph.keys}
                        valueSuffix={graph.suffix}
                      />
                    ) : (
                      <TrendAreaChart data={graph.data} valueSuffix={graph.suffix} />
                    )}
                  </div>
                </>
              )}

              {weightByReps.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <p className="text-sm font-semibold text-white px-4 pt-3 pb-2">Best weight by reps</p>
                  {weightByReps.map(({ reps, weight }) => (
                    <div key={reps} className="flex justify-between px-4 py-2.5 border-t border-gray-800">
                      <span className="text-sm text-gray-400">{reps} {reps === 1 ? 'rep' : 'reps'}</span>
                      <span className="text-sm text-white font-medium">{weight}kg</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
