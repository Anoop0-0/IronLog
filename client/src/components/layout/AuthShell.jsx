// Shared shell for Login / ForgotPassword / ResetPassword. These screens
// previously just vertically centered a form on a flat background, leaving
// ~150-250px of dead space above/below on a normal phone with no visual
// anchor — a flat step down from the Landing page one tap earlier. The
// ambient glow echoes Landing's energy without needing new assets.
export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center
                    justify-center p-4 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2
                   w-[520px] h-[520px] rounded-full bg-red-600/20 blur-[120px]"
      />
      <div className="w-full max-w-md relative">
        {children}
      </div>
    </div>
  )
}
