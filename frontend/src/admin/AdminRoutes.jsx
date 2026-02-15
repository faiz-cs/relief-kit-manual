import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AdminLayout from './AdminLayout';
import DashboardHome from './DashboardHome';
import TokensList from './TokensList';
import EventsManager from './EventsManager';
import Reports from './Reports';
import AuditFeed from './AuditFeed';
import LegacyAdminDashboard from '../pages/AdminDashboard';
import HousesUpload from '../pages/HousesUpload';

export default function AdminRoutes(){
  return (
    <Routes>
      <Route path="" element={<AdminLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="legacy" element={<LegacyAdminDashboard />} />
        <Route path="tokens" element={<TokensList />} />
        <Route path="events" element={<EventsManager />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit" element={<AuditFeed />} />
        <Route path="upload-houses" element={<HousesUpload />} />
      </Route>
    </Routes>
  );
}
