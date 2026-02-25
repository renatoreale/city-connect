import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ClientsPage } from '@/pages/clients/ClientsPage';
import { ClientDetailPage } from '@/pages/clients/ClientDetailPage';
import { ClientFormPage } from '@/pages/clients/ClientFormPage';
import { CatsPage } from '@/pages/cats/CatsPage';
import { CatFormPage } from '@/pages/cats/CatFormPage';
import { QuotesPage } from '@/pages/quotes/QuotesPage';
import { QuoteFormPage } from '@/pages/quotes/QuoteFormPage';
import { QuoteDetailPage } from '@/pages/quotes/QuoteDetailPage';
import { BookingsPage } from '@/pages/bookings/BookingsPage';
import { BookingDetailPage } from '@/pages/bookings/BookingDetailPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/clients" replace />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/new" element={<ClientFormPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/clients/:id/edit" element={<ClientFormPage />} />
          <Route path="/cats" element={<CatsPage />} />
          <Route path="/cats/new" element={<CatFormPage />} />
          <Route path="/cats/:id/edit" element={<CatFormPage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/quotes/new" element={<QuoteFormPage />} />
          <Route path="/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/quotes/:id/edit" element={<QuoteFormPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          {/* Placeholder routes for future blocks */}
          <Route path="/appointments" element={<ComingSoon label="Appuntamenti" />} />
          <Route path="/tasks" element={<ComingSoon label="Compiti" />} />
          <Route path="/payments" element={<ComingSoon label="Pagamenti" />} />
          <Route path="/reports" element={<ComingSoon label="Report" />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/clients" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-2xl font-bold text-sage-700 mb-2">{label}</p>
        <p className="text-sm text-gray-400">In sviluppo — prossimi blocchi</p>
      </div>
    </div>
  );
}
