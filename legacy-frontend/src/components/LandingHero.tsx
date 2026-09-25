"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useWalletModal } from "@/components/WalletModal";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

interface LandingHeroProps {
  onOpenVault?: () => void;
  hasVaults?: boolean;
}



// Fades a section in once it scrolls into view, with an optional per-item
// stagger delay — used for the lifecycle/architecture card grids so they
// don't just materialize fully-formed on load.
function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

function RevealCard({
  index = 0,
  className = "",
  style,
  children,
}: {
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const delay = Math.min(index, 6) * 90;

  return (
    <div
      ref={ref}
      className={`reveal-card${inView ? " reveal-card--visible" : ""}${className ? ` ${className}` : ""}`}
      style={{ ...style, transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function LandingHero({ onOpenVault, hasVaults = false }: LandingHeroProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useWalletModal();

  const handlePrimaryAction = () => {
    if (isConnected && onOpenVault) {
      onOpenVault();
    } else {
      openConnectModal();
    }
  };

  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      const targetId = hash === "architecture" ? "specs" : hash;
      const el = document.getElementById(targetId) || document.getElementById(hash);
      if (el) {
        setTimeout(() => {
          const y = el.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        }, 120);
      }
    };

    handleHashScroll();
    window.addEventListener("hashchange", handleHashScroll);
    return () => window.removeEventListener("hashchange", handleHashScroll);
  }, []);


  return (
    <div className="landing-canvas">
      {/* ── Hero Main Content ────────────────────────────────── */}
      <main className="hero-content-wrap" role="main">
        {/* Giant Stacked Title in Murs Gothic */}
        <h1 className="hero-giant-title animate-fade-up" style={{ animationDelay: "0ms" }}>
          <span>AUTONOMOUS</span>
          <span>SUCCESSION</span>
          <span className="text-stroke-white">DIGITAL</span>
          <span className="text-stroke-white">LEGACY</span>
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle animate-fade-up" style={{ animationDelay: "90ms" }}>
          Self-sovereign digital inheritance on World Chain.
        </p>

        {/* Action Buttons */}
        <div
          className="animate-fade-up"
          style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", marginTop: "32px", animationDelay: "160ms" }}
        >
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="btn-hero-action"
            id="hero-launch-vault-btn"
            style={{ marginTop: 0 }}
          >
            <span>{isConnected ? (hasVaults ? "OPEN VAULT DASHBOARD" : "DEPLOY YOUR VAULT") : "LAUNCH VAULT"}</span>
            <span className="arrow-icon" aria-hidden="true">→</span>
          </button>

          <Link
            href="/claim"
            className="btn-hero-action"
            style={{
              marginTop: 0,
              backgroundColor: "transparent",
              color: "#ffffff",
              borderColor: "rgba(255, 255, 255, 0.35)",
            }}
          >
            <span>HEIR PORTAL</span>
            <span className="arrow-icon" aria-hidden="true">↗</span>
          </Link>
        </div>

        {/* Telemetry Strip */}
        <div
          className="hero-telemetry-strip animate-fade-up"
          aria-label="Protocol Specifications"
          style={{ animationDelay: "230ms" }}
        >
          <div className="telemetry-cell">
            <span className="telemetry-label">01 // LIVENESS VERIFICATION</span>
            <span className="telemetry-value">WORLD ID ORB ZK-PROOF</span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-label">02 // TARGET NETWORK</span>
            <span className="telemetry-value">WORLD CHAIN SEPOLIA (4801)</span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-label">03 // ARCHITECTURE</span>
            <span className="telemetry-value">EIP-1167 MINIMAL PROXY</span>
          </div>
          <div className="telemetry-cell">
            <span className="telemetry-label">04 // STATE ENGINE</span>
            <span className="telemetry-value">GREEN · AMBER · RED</span>
          </div>
        </div>
      </main>

      {/* ── Section 1: Three-Tier State Lifecycle ────────────── */}
      <section id="lifecycle" className="landing-section-wrap" aria-labelledby="lifecycle-title">
        <div className="landing-section-header">
          <span className="section-tag">[ 01 // STATE ENGINE ]</span>
          <h2 id="lifecycle-title" className="section-title">
            THREE-TIER AUTONOMOUS SUCCESSION
          </h2>
          <p className="section-lead">
            Vault state transitions occur strictly on-chain, governed by deterministic heartbeats, configurable grace periods, and dispute-resistant contestable windows.
          </p>
        </div>

        <div className="lifecycle-grid">
          {/* Card 1: Green */}
          <RevealCard index={0} className="lifecycle-card lifecycle-card--green">
            <div className="lifecycle-card-top">
              <span className="lifecycle-badge" style={{ color: "var(--status-green)" }}>
                <span className="network-dot" style={{ backgroundColor: "var(--status-green)" }} />
                STATUS: GREEN
              </span>
              <span className="lifecycle-stage-num">STAGE 01</span>
            </div>
            <h3 className="lifecycle-name">ACTIVE LIVENESS</h3>
            <p className="lifecycle-desc">
              The vault owner conducts periodic cryptographic check-ins using World ID. The zero-knowledge proof verifies human vitality on-chain without revealing biometric or private data. Full asset custody remains exclusively with the owner.
            </p>
            <div className="lifecycle-mechanic">
              <code>LegacyVault.checkIn(root, nullifierHash, proof)</code>
              <div style={{ marginTop: "4px", color: "var(--text-secondary)", fontSize: "0.6875rem" }}>
                Resets check-in timer to 100% capacity.
              </div>
            </div>
          </RevealCard>

          {/* Card 2: Amber */}
          <RevealCard index={1} className="lifecycle-card lifecycle-card--amber">
            <div className="lifecycle-card-top">
              <span className="lifecycle-badge" style={{ color: "var(--status-amber)" }}>
                <span className="network-dot" style={{ backgroundColor: "var(--status-amber)" }} />
                STATUS: AMBER
              </span>
              <span className="lifecycle-stage-num">STAGE 02</span>
            </div>
            <h3 className="lifecycle-name">GRACE BUFFER</h3>
            <p className="lifecycle-desc">
              Triggered automatically when the check-in window expires without a heartbeat. The vault enters a protected buffer window (default 7 days). Assets remain frozen to heirs, and a single owner check-in instantly restores Green status.
            </p>
            <div className="lifecycle-mechanic">
              <code>block.timestamp &gt; lastCheckIn + checkInInterval</code>
              <div style={{ marginTop: "4px", color: "var(--text-secondary)", fontSize: "0.6875rem" }}>
                Warning buffer active. Owner maintains total priority.
              </div>
            </div>
          </RevealCard>

          {/* Card 3: Red */}
          <RevealCard index={2} className="lifecycle-card lifecycle-card--red">
            <div className="lifecycle-card-top">
              <span className="lifecycle-badge" style={{ color: "var(--status-red)" }}>
                <span className="network-dot" style={{ backgroundColor: "var(--status-red)" }} />
                STATUS: RED
              </span>
              <span className="lifecycle-stage-num">STAGE 03</span>
            </div>
            <h3 className="lifecycle-name">CONTESTABLE SUCCESSION</h3>
            <p className="lifecycle-desc">
              Once the grace period concludes, designated heirs can initiate succession claims. A 48-hour contestable window begins. If the owner is alive, they can instantly veto the claim before executors distribute assets.
            </p>
            <div className="lifecycle-mechanic">
              <code>initiateClaim() &rarr; contestableWindow &rarr; finalizeClaim()</code>
              <div style={{ marginTop: "4px", color: "var(--text-secondary)", fontSize: "0.6875rem" }}>
                Contestable window protects against hostile claims.
              </div>
            </div>
          </RevealCard>
        </div>
      </section>

      {/* ── Section 2: Cryptographic Architecture ───────────── */}
      <section id="specs" className="landing-section-wrap" aria-labelledby="arch-title" style={{ paddingTop: 0 }}>
        <span id="architecture" style={{ display: "block", position: "relative", top: "-80px", visibility: "hidden" }} />
        <div className="landing-section-header">
          <span className="section-tag">[ 02 // PROTOCOL SPECIFICATION ]</span>
          <h2 id="arch-title" className="section-title">
            BUILT FOR GENERATIONAL ASSURANCE
          </h2>
          <p className="section-lead">
            Legacy operates without centralized custodians, trusted legal oracles, or vulnerable multisigs. Everything is enforced purely by smart contracts on World Chain.
          </p>
        </div>

        <div className="arch-grid">
          <RevealCard index={0} className="arch-card">
            <span className="arch-card-num">01 // PROOF OF PERSONHOOD</span>
            <h3 className="arch-card-title">World ID ZK-SNARK Verification</h3>
            <p className="arch-card-desc">
              Utilizes World ID&apos;s canonical on-chain router and Semaphore ZK-SNARK verifier. Proves unique human vitality without publishing any biometric identifier, address link, or identity leak on the public blockchain.
            </p>
          </RevealCard>

          <RevealCard index={1} className="arch-card">
            <span className="arch-card-num">02 // NON-CUSTODIAL ISOLATION</span>
            <h3 className="arch-card-title">EIP-1167 Minimal Proxy Clones</h3>
            <p className="arch-card-desc">
              Each user deploys an independent, lightweight clone vault contract directly from the canonical factory. No pooled asset risk, no centralized upgrade backdoors, and 100% sovereign asset ownership.
            </p>
          </RevealCard>

          <RevealCard index={2} className="arch-card">
            <span className="arch-card-num">03 // DISPUTE-RESISTANT VETO</span>
            <h3 className="arch-card-title">Contestable Window Protection</h3>
            <p className="arch-card-desc">
              Heirs cannot seize assets immediately upon grace expiry. The contestable window creates an infallible safety valve: any check-in by the living owner immediately revokes the claim and resets the instrument.
            </p>
          </RevealCard>

          <RevealCard index={3} className="arch-card">
            <span className="arch-card-num">04 // MODULAR ASSET DISTRIBUTION</span>
            <h3 className="arch-card-title">Granular Allocation Adapters</h3>
            <p className="arch-card-desc">
              Assign native ETH, ERC-20 tokens, and NFTs to specific designated heirs. Custom vault executors enable arbitrary on-chain contract executions upon finalized claim settlement.
            </p>
          </RevealCard>
        </div>

        {/* ── Call to Action Banner ── */}
        <div id="get-started" className="landing-cta-banner">
          <div className="cta-banner-content">
            <span className="section-tag">[ GET STARTED ]</span>
            <h3 className="cta-banner-title">SECURE YOUR DIGITAL ESTATE</h3>
            <p className="cta-banner-desc">
              Deploy your non-custodial succession vault on World Chain Sepolia in under sixty seconds. Set your heartbeat frequency, assign your beneficiaries, and protect your legacy.
            </p>
          </div>
          <div className="cta-banner-actions">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="btn-hero-action"
              style={{ marginTop: 0 }}
            >
              <span>{isConnected ? "ENTER VAULT INSTRUMENT" : "CONNECT & LAUNCH VAULT"}</span>
              <span className="arrow-icon" aria-hidden="true">→</span>
            </button>
            <Link
              href="/claim"
              className="btn-hero-action"
              style={{
                marginTop: 0,
                backgroundColor: "transparent",
                color: "#ffffff",
                borderColor: "rgba(255, 255, 255, 0.35)",
              }}
            >
              <span>HEIR CLAIM PORTAL</span>
              <span className="arrow-icon" aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Minimal Footer ───────────────────────────────────── */}
      <footer className="landing-footer-shell" role="contentinfo">
        <div className="landing-footer-inner">
          <div>
            <span style={{ fontWeight: 800, color: "#ffffff", letterSpacing: "0.06em" }}>LEGACY PROTOCOL</span>
            <span style={{ margin: "0 10px" }}>·</span>
            <span>WORLD CHAIN SEPOLIA (CHAIN ID 4801)</span>
          </div>

          <div className="landing-footer-links">
            <button
              type="button"
              onClick={handlePrimaryAction}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", font: "inherit", padding: 0 }}
            >
              Vault
            </button>
            <Link href="/claim">Heir Portal</Link>
            <Link href="/lookup">Lookup</Link>
            <a
              href={`https://sepolia.worldscan.org/address/${CONTRACT_ADDRESSES.factory}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Factory Contract ↗
            </a>
            <a
              href={`https://sepolia.worldscan.org/address/${CONTRACT_ADDRESSES.verifier}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Verifier Contract ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
