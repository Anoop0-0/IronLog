import { NavLink } from 'react-router-dom'


const tabs = [
  { to: '/dashboard', label: 'Home',     icon: HomeIcon },
  { to: '/log',       label: 'Log',      icon: PlusIcon },
  { to: '/progress',  label: 'Progress', icon: ChartIcon },
  { to: '/contests',  label: 'Compete',  icon: TrophyIcon },
  { to: '/profile',   label: 'Profile',  icon: UserIcon },
]

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-50">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) =>
          `flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors
           ${isActive ? 'text-red-500' : 'text-gray-500'}`
        }>
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
function HomeIcon()  { return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 12L12 3l9 9"/><path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9"/></svg> }
function PlusIcon()  { return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg> }
function ChartIcon() { return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 20h18M5 20V10m4 10V6m4 14v-4m4 4V4"/></svg> }
function TrophyIcon(){ return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M8 21h8m-4-4v4M5 3H3v5a4 4 0 004 4h10a4 4 0 004-4V3h-2"/><path d="M5 3h14v6a7 7 0 01-14 0V3z"/></svg> }
function UserIcon()  { return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> }

