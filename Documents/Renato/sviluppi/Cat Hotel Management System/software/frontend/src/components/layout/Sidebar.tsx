import { NavLink } from 'react-router-dom';
import {
  Users,
  Cat,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Home,
  Settings,
  FileText,
  BarChart2,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: '/',              icon: Home,          label: 'Dashboard' },
  { to: '/clients',       icon: Users,         label: 'Clienti' },
  { to: '/cats',          icon: Cat,           label: 'Gatti' },
  { to: '/bookings',      icon: FileText,      label: 'Prenotazioni' },
  { to: '/appointments',  icon: CalendarDays,  label: 'Appuntamenti' },
  { to: '/tasks',         icon: ClipboardList, label: 'Compiti' },
  { to: '/payments',      icon: CreditCard,    label: 'Pagamenti' },
  { to: '/reports',       icon: BarChart2,     label: 'Report', roles: ['admin', 'ceo', 'titolare', 'manager'] },
  { to: '/settings',      icon: Settings,      label: 'Impostazioni', roles: ['admin', 'titolare'] },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <aside className="w-64 shrink-0 h-screen flex flex-col bg-white border-r border-sage-200">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sage-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sage-500 rounded-lg flex items-center justify-center text-white text-lg">
            🐱
          </div>
          <div>
            <p className="text-sm font-bold text-sage-800">CatHotel</p>
            <p className="text-xs text-gray-400">Gestionale</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="space-y-0.5">
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150 group
                  ${isActive
                    ? 'bg-sage-100 text-sage-700'
                    : 'text-gray-600 hover:bg-sage-50 hover:text-sage-700'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`w-4 h-4 shrink-0 ${isActive ? 'text-sage-600' : 'text-gray-400 group-hover:text-sage-500'}`}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="w-3 h-3 text-sage-400" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User info + logout */}
      <div className="border-t border-sage-100 p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-sage-200 flex items-center justify-center text-sage-700 text-sm font-semibold shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 capitalize truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Esci
        </button>
      </div>
    </aside>
  );
}
