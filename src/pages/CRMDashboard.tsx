import React, { useState } from 'react';
import { CRMLayout } from '@/components/CRMLayout';
import { KanbanBoard } from '@/components/KanbanBoard';
import { SalesCompleted } from '@/components/SalesCompleted';
import { WebhooksPanel } from '@/components/WebhooksPanel';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { UsersPanel } from '@/components/UsersPanel';
import { SettingsPanel } from '@/components/SettingsPanel';

export const CRMDashboard: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <KanbanBoard />;
      case 'sales':
        return <SalesCompleted />;
      case 'webhooks':
        return <WebhooksPanel />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'users':
        return <UsersPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <KanbanBoard />;
    }
  };

  return (
    <CRMLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderContent()}
    </CRMLayout>
  );
};