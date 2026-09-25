"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { LegacyVaultFactoryABI } from "@/lib/contracts/abis";
import { LandingHero } from "@/components/LandingHero";

export default function HomePage() {
  const router = useRouter();
  const { address } = useAccount();

  const { data: userVaults } = useReadContract({
    address: CONTRACT_ADDRESSES.factory,
    abi: LegacyVaultFactoryABI,
    functionName: "getVaults",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const hasVaults = Boolean(userVaults && userVaults.length > 0);

  return (
    <LandingHero
      onOpenVault={() => router.push("/vault")}
      hasVaults={hasVaults}
    />
  );
}
