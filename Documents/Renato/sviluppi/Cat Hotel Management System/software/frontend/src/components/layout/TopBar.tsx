import { Bell, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface TopBarProps {
  onMenuToggle?: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const { user, selectedTenantId } = useAuth();

  const tenantName = user?.tenants?.find((t) => t.id === selectedTenantId)?.name;

  return (
    <header className="h-14 shrink-0 bg-white border-b border-sage-200 flex items-center justify-between px-4 gap-4">
      {/* Left: mobile menu toggle + breadcrumb placeholder */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-sage-50 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {tenantName && (
          <span className="text-xs text-gray-400 font-medium hidden sm:block">
            {tenantName}
          </span>
        )}
      </div>

      {/* Right: notifications + user avatar */}
      <div className="flex items-center gap-2">
        <button className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-sage-50 transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        <div className="w-7 h-7 rounded-full bg-sage-200 flex items-center justify-center text-sage-700 text-xs font-semibold select-none">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
