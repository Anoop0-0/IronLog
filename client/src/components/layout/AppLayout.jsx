import Navbar from "./Navbar";

export default function AppLayout({children}){
    return(
         <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* faint ambient glow so light-content pages (a fresh account with
          one workout, one contest) read as "spacious" rather than "empty" —
          echoes the auth screens' glow, much dimmer since this sits behind
          real content on every page, not just a centered form */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-40 right-0
                   w-[420px] h-[420px] rounded-full bg-red-600/10 blur-[130px]"
      />

      {/* pb-44 clears the rest-timer FAB's footprint (bottom-28 + its own
          height) so the last item in any list is never stuck behind it —
          see RestTimer.jsx */}
      <main className="pb-44 max-w-lg mx-auto relative">
        {children}
      </main>

      <Navbar />
    </div>
    )
}
