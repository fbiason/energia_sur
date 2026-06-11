import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DataUpload from './pages/DataUpload';
import ConsumptionAnalysis from './pages/ConsumptionAnalysis';
import Anomalies from './pages/Anomalies';
import Predictions from './pages/Predictions';
import Comparator from './pages/Comparator';
import SavingsSimulator from './pages/SavingsSimulator';
import Assistant from './pages/Assistant';
import MonthlyReport from './pages/MonthlyReport';
import ExternalSources from './pages/ExternalSources';
import Login from './pages/Login';

import { EnergyRecord, Anomaly } from './types/energy';
import { generateDemoData } from './services/demoData';
import { detectAnomalies } from './services/anomalyDetector';
import './App.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('isAuth') === 'true';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [records, setRecords] = useState<EnergyRecord[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isSimulated, setIsSimulated] = useState<boolean>(true);

  // Initialize with simulated demo data
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const demoRecords = generateDemoData();
    setRecords(demoRecords);
    
    const detected = detectAnomalies(demoRecords);
    setAnomalies(detected);
    setIsSimulated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Update records and re-run anomaly detection
  const updateRecordsAndAnomalies = useCallback((newRecords: EnergyRecord[]) => {
    setRecords(newRecords);
    const detected = detectAnomalies(newRecords);
    setAnomalies(detected);
  }, []);

  // Reset demo data trigger
  const handleResetDemo = useCallback(() => {
    const demoRecords = generateDemoData();
    setRecords(demoRecords);
    const detected = detectAnomalies(demoRecords);
    setAnomalies(detected);
    setIsSimulated(true);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    sessionStorage.setItem('isAuth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAuth');
  };

  const pendingAnomaliesCount = anomalies.filter(a => !a.resolved).length;

  // Render active page component
  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            records={records} 
            anomalies={anomalies} 
            setActiveTab={setActiveTab} 
          />
        );
      case 'upload':
        return (
          <DataUpload
            records={records}
            setRecords={updateRecordsAndAnomalies}
            isSimulated={isSimulated}
            setIsSimulated={setIsSimulated}
            onResetDemo={handleResetDemo}
          />
        );
      case 'analysis':
        return <ConsumptionAnalysis records={records} />;
      case 'anomalies':
        return (
          <Anomalies 
            anomalies={anomalies} 
            setAnomalies={setAnomalies} 
          />
        );
      case 'predictions':
        return <Predictions records={records} />;
      case 'comparator':
        return <Comparator records={records} />;
      case 'simulator':
        return <SavingsSimulator records={records} />;
      case 'assistant':
        return <Assistant records={records} anomalies={anomalies} />;
      case 'report':
        return <MonthlyReport records={records} anomalies={anomalies} />;
      case 'sources':
        return <ExternalSources />;
      default:
        return (
          <Dashboard 
            records={records} 
            anomalies={anomalies} 
            setActiveTab={setActiveTab} 
          />
        );
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex bg-[#020B1F] text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        anomalyCount={pendingAnomaliesCount} 
        onLogout={handleLogout}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto p-8 lg:p-10 pb-12 scrollbar-thin bg-gradient-to-tr from-[#020B1F] via-[#031130] to-[#020B1F]">
        <div className="max-w-7xl mx-auto">
          {renderActivePage()}
        </div>
      </main>
    </div>
  );
}
