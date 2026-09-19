import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.jsx';
import LegalDashboard from './components/LegalDashboard.jsx';
import AuthModal from './components/AuthModal.jsx';
import TransitionOverlay from './components/TransitionOverlay.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { authService } from './services/authService.js';

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'app'
  const [activeTab, setActiveTab] = useState('simplifier');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingView, setPendingView] = useState(null);
  const [pendingTab, setPendingTab] = useState(null);

  useEffect(() => {
    // Load default user profile on initial launch
    const active = authService.getCurrentUser();
    if (active) setCurrentUser(active);
  }, []);

  function handleEnterApp(targetTab = 'simplifier') {
    setActiveTab(targetTab);
    if (!currentUser) {
      setPendingTab(targetTab);
      setIsAuthModalOpen(true);
      return;
    }
    // Smooth transition handshake overlay
    setPendingView('app');
    setIsTransitioning(true);
  }

  function handleSelectFeature(featureId) {
    handleEnterApp(featureId);
  }

  function handleLoginSuccess(user) {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setPendingView('app');
    setIsTransitioning(true);
  }

  function handleTransitionComplete() {
    if (pendingView) {
      setView(pendingView);
      setPendingView(null);
    }
    setIsTransitioning(false);
  }

  function handleLogout() {
    authService.logout();
    setCurrentUser(null);
    setView('landing');
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Animated Handshake Transition Overlay */}
        <TransitionOverlay
          isVisible={isTransitioning}
          user={currentUser}
          onComplete={handleTransitionComplete}
        />

        {/* Secured Auth Portal Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />

        {/* Main View Router */}
        {view === 'landing' ? (
          <LandingPage
            onEnterApp={() => handleEnterApp('simplifier')}
            onSelectFeature={handleSelectFeature}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            currentUser={currentUser}
          />
        ) : (
          <LegalDashboard
            onBackToLanding={() => setView('landing')}
            currentUser={currentUser}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            initialTab={activeTab}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
