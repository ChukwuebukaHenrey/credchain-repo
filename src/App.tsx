/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import ProofSection from "./components/ProofSection";
import WhoItsFor from "./components/WhoItsFor";
import Features from "./components/Features";
import CTASection from "./components/CTASection";
import TrustStrip from "./components/TrustStrip";
import Footer from "./components/Footer";
import RoleSelection from "./pages/RoleSelection";
import Login from "./pages/Login";
import SignupCandidate from "./pages/SignupCandidate";
import SignupIssuer from "./pages/SignupIssuer";
import SignupVerifier from "./pages/SignupVerifier";
import CandidateDashboard from "./pages/CandidateDashboard";
import IssuerDashboard from "./pages/IssuerDashboard";
import VerifierDashboard from "./pages/VerifierDashboard";
import PublicProfile from "./pages/PublicProfile";
import AuthCallback from "./pages/AuthCallback";

function Landing() {
  return (
    <div className="relative min-h-screen bg-bg-base text-txt-primary">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <ProofSection />
        <WhoItsFor />
        <Features />
        <CTASection />
        <TrustStrip />
      </main>
      <Footer />
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, role } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/role" element={<RoleSelection />} />
      <Route path="/signup/candidate" element={<SignupCandidate />} />
      <Route path="/signup/issuer" element={<SignupIssuer />} />
      <Route path="/signup/verifier" element={<SignupVerifier />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Protected Dashboards */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute allow="candidate">
            <CandidateDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/candidate" 
        element={
          <ProtectedRoute allow="candidate">
            <CandidateDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/issuer" 
        element={
          <ProtectedRoute allow="issuer">
            <IssuerDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/issuer" 
        element={
          <ProtectedRoute allow="issuer">
            <IssuerDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/verifier" 
        element={
          <ProtectedRoute allow="verifier">
            <VerifierDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard/verifier" 
        element={
          <ProtectedRoute allow="verifier">
            <VerifierDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route path="/verify/:candidateId" element={<PublicProfile />} />
      
      {/* Fallback */}
      <Route 
        path="*" 
        element={
          isAuthenticated ? (
            <Navigate to={role === 'candidate' ? '/dashboard' : role === 'issuer' ? '/issuer' : '/verifier'} replace />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
