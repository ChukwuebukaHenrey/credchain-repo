/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/role" element={<RoleSelection />} />
        <Route path="/signup/candidate" element={<SignupCandidate />} />
        <Route path="/signup/issuer" element={<SignupIssuer />} />
        <Route path="/signup/verifier" element={<SignupVerifier />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<CandidateDashboard />} />
        <Route path="/dashboard/candidate" element={<CandidateDashboard />} />
        <Route path="/issuer" element={<IssuerDashboard />} />
        <Route path="/dashboard/issuer" element={<IssuerDashboard />} />
        <Route path="/verifier" element={<VerifierDashboard />} />
        <Route path="/dashboard/verifier" element={<VerifierDashboard />} />
        <Route path="/verify/:candidateId" element={<PublicProfile />} />
      </Routes>
    </BrowserRouter>
  );
}
