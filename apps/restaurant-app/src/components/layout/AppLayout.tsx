/**
 * AppLayout - Main application layout with sidebar and content area
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = React.memo(() => {
  return (
    <div className="flex h-screen bg-gray-50" data-testid="app-layout">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
});

AppLayout.displayName = 'AppLayout';
