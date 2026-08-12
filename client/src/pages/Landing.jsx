import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4
                      border-b border-white/5 sticky top-0 bg-gray-950 z-10">
        <span className="text-xl font-bold tracking-[3px] text-red-500">
          IRONLOG
        </span>
        <button
          onClick={() => navigate('/login')}
          className="bg-red-500 text-white text-sm font-semibold
                     px-5 py-2 rounded-lg active:scale-95 transition-all"
        >
          Get started
        </button>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-16 max-w-3xl mx-auto">
        <div className="inline-block bg-red-950/40 border border-red-500/20
                        text-red-400 text-xs px-4 py-1.5 rounded-full
                        mb-6 tracking-wide">
          Now with Google Sign-In
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight
                       tracking-tight mb-5">
          Track lifts.<br/>
          <span className="text-red-500">Crush</span> friends.
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed mb-10
                      max-w-lg mx-auto">
          The gym tracker built for people who actually train. Log sets instantly,
          visualize progress, and compete on real-time leaderboards.
        </p>
        <div className="flex gap-3 justify-center flex-wrap mb-14">
          <button
            onClick={() => navigate('/login')}
            className="bg-red-500 text-white font-semibold px-8 py-3.5
                       rounded-xl text-base active:scale-95 transition-all"
          >
            Start for free
          </button>
          <button
            onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
            className="bg-transparent text-gray-500 border border-white/10
                       font-medium px-8 py-3.5 rounded-xl text-base
                       active:scale-95 transition-all"
          >
            See how it works
          </button>
        </div>

        {/* Phone mockup */}
        <div className="flex justify-center">
          <div className="bg-[#111] border border-white/5 rounded-[28px]
                          w-56 overflow-hidden shadow-2xl">
            <div className="bg-gray-950 px-4 py-3 text-right
                            text-xs text-white/20">
              9:41
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className="text-xs text-gray-600">Welcome back</p>
                  <p className="text-sm font-bold">Anoop 👋</p>
                </div>
                <div className="bg-red-500 text-white text-xs
                                px-2.5 py-1.5 rounded-md font-semibold">
                  + Log
                </div>
              </div>
              <div className="bg-[#161616] border border-white/5
                              rounded-xl p-3 mb-2">
                <p className="text-xs text-gray-600 mb-1">Today</p>
                <p className="text-xs font-semibold text-gray-300">
                  Bench Press
                </p>
                <p className="text-xs text-red-400 mt-1">
                  Set 1 &nbsp; 8 reps @ 80kg ✓
                </p>
                <p className="text-xs text-red-400">
                  Set 2 &nbsp; 8 reps @ 85kg ✓
                </p>
              </div>
              <div className="bg-blue-950/40 border border-blue-500/20
                              rounded-xl p-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"/>
                <p className="text-xs text-blue-400 font-semibold">
                  Rest timer · 01:24
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-16 max-w-5xl mx-auto">
        <p className="text-xs tracking-widest text-red-500 uppercase mb-2">
          Everything you need
        </p>
        <h2 className="text-3xl font-bold mb-2">Built for the gym floor</h2>
        <p className="text-gray-600 mb-12">
          Not a spreadsheet. Not a notes app. A real gym tracker.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              icon: '💾',
              color: 'bg-red-500/10',
              title: 'Save sets instantly',
              desc: 'Tap Save after each set — syncs immediately. Switch tabs, lock your phone, come back. Your data is safe.'
            },
            {
              icon: '⏱️',
              color: 'bg-blue-500/10',
              title: 'Auto rest timer',
              desc: 'Timer starts automatically when you save a set. Presets at 60s, 90s, 2min, 3min or any custom duration.'
            },
            {
              icon: '📈',
              color: 'bg-green-500/10',
              title: 'Progress analytics',
              desc: 'Weekly volume charts, personal record detection, body-part breakdowns. See exactly where you\'re improving.'
            },
            {
              icon: '🏆',
              color: 'bg-amber-500/10',
              title: 'Friend contests',
              desc: 'Create a challenge, share an invite code, compete on heaviest lift. Leaderboard updates in real time.'
            },
          ].map((f, i) => (
            <div key={i} className="bg-[#111] border border-white/5
                                    rounded-2xl p-6">
              <div className={`w-10 h-10 ${f.color} rounded-xl flex
                              items-center justify-center text-lg mb-4`}>
                {f.icon}
              </div>
              <h3 className="font-semibold text-gray-200 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contest leaderboard mockup */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <p className="text-xs tracking-widest text-red-500 uppercase mb-2">
          Compete
        </p>
        <h2 className="text-3xl font-bold mb-2">Real-time leaderboards</h2>
        <p className="text-gray-600 mb-10">
          Challenge your gym friends. Scores update the moment a qualifying
          workout is logged.
        </p>

        <div className="bg-[#111] border border-white/5 rounded-2xl
                        overflow-hidden max-w-sm mx-auto">
          <div className="p-4 border-b border-white/5">
            <h3 className="font-semibold text-white text-sm">
              Bench Press Battle
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Bench Press · Heaviest single lift
            </p>
            <div className="flex gap-2 mt-3">
              {['🔄 Live', '4d left', '4 athletes'].map(t => (
                <span key={t} className="text-xs bg-white/5 text-gray-600
                                         px-2 py-1 rounded-full border
                                         border-white/5">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {[
            { rank: '🥇', name: 'anoop',  reps: 5, weight: '100kg', gold: true  },
            { rank: '🥈', name: 'rahul',  reps: 6, weight: '90kg',  gold: false },
            { rank: '🥉', name: 'priya',  reps: 8, weight: '85kg',  gold: false },
            { rank: '4',  name: 'vikram', reps: 5, weight: '80kg',  gold: false },
          ].map((e, i) => (
            <div key={i} className={`flex items-center px-4 py-3.5
                                     border-b border-white/[0.04] last:border-0
                                     ${e.gold ? 'bg-yellow-900/10' : ''}`}>
              <span className={`w-8 text-lg ${!e.gold && i === 3 ? 'text-xs text-gray-600' : ''}`}>
                {e.rank}
              </span>
              <div className="w-9 h-9 rounded-full bg-white/5 border
                              border-white/10 flex items-center justify-center
                              text-xs font-semibold text-gray-500 mx-3">
                {e.name[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-300">{e.name}</p>
                <p className="text-xs text-gray-600">{e.reps} reps</p>
              </div>
              <p className={`text-lg font-bold
                            ${e.gold ? 'text-yellow-400' : 'text-red-400'}`}>
                {e.weight}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 py-20 border-t border-white/5">
        <h2 className="text-4xl font-bold mb-4">
          Ready to start lifting smarter?
        </h2>
        <p className="text-gray-500 mb-8">
          No credit card. Works on any phone. Install it like a native app.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="bg-red-500 text-white font-semibold px-10 py-4
                     rounded-xl text-lg active:scale-95 transition-all"
        >
          Open IRONLOG
        </button>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-white/5
                         text-xs text-gray-700">
        © 2026 IRONLOG · Built by Anoop Baghel
      </footer>
    </div>
  )
}