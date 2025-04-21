
import React from 'react';

const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        View and analyze crack detection results on this page.
      </p>
      <div className="p-8 text-center border rounded-lg">
        Dashboard with map and table views will appear here
      </div>
    </div>
  );
};

export default DashboardPage;
