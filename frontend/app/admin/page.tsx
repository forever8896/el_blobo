"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { TantoConnectButton } from "@sky-mavis/tanto-widget";
import { isAdmin } from "@/app/config/admin";
import { parseEther, formatEther } from "viem";
import { DEPLOYED_CONTRACTS } from "@/app/config/contracts";
import { useWalletClient } from "wagmi";
import VaultABI from "@/app/abis/NativeRewardVault.json";

interface TreasuryInfo {
  totalAssets: number;
  allocatedAssets: number;
  availableAssets: number;
  totalShares: number;
  allocatedShares: number;
  unallocatedShares: number;
  utilizationRate: number;
}

interface VaultData {
  balance: string;
  balanceWei: string;
  treasury: TreasuryInfo;
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [suggestions, setSuggestions] = useState("");
  const [originalSuggestions, setOriginalSuggestions] = useState("");
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isLoadingVault, setIsLoadingVault] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [depositMessage, setDepositMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (address) {
      setIsAuthorized(isAdmin(address));
    } else {
      setIsAuthorized(false);
    }
  }, [address]);

  // Load admin suggestions
  useEffect(() => {
    if (isAuthorized) {
      loadSuggestions();
    }
  }, [isAuthorized]);

  // Load vault data
  useEffect(() => {
    if (isAuthorized) {
      loadVaultData();
    }
  }, [isAuthorized]);

  const loadSuggestions = async () => {
    try {
      setIsLoadingSuggestions(true);
      const response = await fetch("/api/admin/suggestions");
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.data.suggestions);
        setOriginalSuggestions(data.data.suggestions);
      }
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const loadVaultData = async () => {
    try {
      setIsLoadingVault(true);
      const response = await fetch("/api/admin/vault");
      const data = await response.json();

      if (data.success) {
        setVaultData(data.data);
      }
    } catch (error) {
      console.error("Error loading vault data:", error);
    } finally {
      setIsLoadingVault(false);
    }
  };

  const handleSaveSuggestions = async () => {
    if (!address) return;

    try {
      setIsSaving(true);
      setSaveMessage(null);

      const response = await fetch("/api/admin/suggestions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          suggestions,
          walletAddress: address,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOriginalSuggestions(suggestions);
        setSaveMessage({ type: "success", text: "Suggestions updated successfully!" });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to update suggestions" });
      }
    } catch (error) {
      console.error("Error saving suggestions:", error);
      setSaveMessage({ type: "error", text: "An error occurred while saving" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeposit = async () => {
    if (!walletClient || !address || !depositAmount) return;

    try {
      setIsDepositing(true);
      setDepositMessage(null);

      const amountWei = parseEther(depositAmount);

      // Call the deposit function on the vault contract
      const hash = await walletClient.writeContract({
        address: DEPLOYED_CONTRACTS.nativeRewardVault,
        abi: VaultABI,
        functionName: "deposit",
        args: [amountWei],
        value: amountWei,
        account: address,
      });

      setDepositMessage({ type: "success", text: `Deposit successful! TX: ${hash}` });
      setDepositAmount("");

      // Reload vault data after a short delay
      setTimeout(() => {
        loadVaultData();
      }, 2000);
    } catch (error: any) {
      console.error("Error depositing:", error);
      setDepositMessage({
        type: "error",
        text: error.message || "Failed to deposit",
      });
    } finally {
      setIsDepositing(false);
    }
  };

  // Unauthorized view
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Admin Portal</h1>
          <p className="text-gray-300 mb-8">Please connect your wallet to continue</p>
          <TantoConnectButton />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        <div className="text-center bg-gray-800 rounded-lg p-8 max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-white mb-4">Unauthorized</h1>
          <p className="text-gray-300 mb-4">
            Your wallet address is not authorized to access the admin portal.
          </p>
          <p className="text-sm text-gray-400 font-mono">{address}</p>
        </div>
      </div>
    );
  }

  // Admin dashboard view
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Portal</h1>
            <p className="text-gray-300">Manage job suggestions and vault deposits</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Connected as:</p>
            <p className="text-sm font-mono text-purple-300">{address}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vault Management Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-purple-500/30">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span>💰</span> Vault Management
            </h2>

            {isLoadingVault ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading vault data...</p>
              </div>
            ) : vaultData ? (
              <>
                {/* Vault Balance Display */}
                <div className="bg-gray-900 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Total Assets</p>
                      <p className="text-2xl font-bold text-green-400">
                        {vaultData.treasury.totalAssets.toFixed(4)} RON
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Available</p>
                      <p className="text-2xl font-bold text-blue-400">
                        {vaultData.treasury.availableAssets.toFixed(4)} RON
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Allocated</p>
                      <p className="text-lg text-yellow-400">
                        {vaultData.treasury.allocatedAssets.toFixed(4)} RON
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Utilization</p>
                      <p className="text-lg text-purple-400">
                        {vaultData.treasury.utilizationRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Deposit Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Deposit Amount (RON)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:cursor-not-allowed"
                  >
                    {isDepositing ? "Depositing..." : "Deposit RON"}
                  </button>

                  {depositMessage && (
                    <div
                      className={`p-3 rounded-lg ${
                        depositMessage.type === "success"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {depositMessage.text}
                    </div>
                  )}
                </div>

                <div className="mt-4 text-xs text-gray-400 bg-gray-900 p-3 rounded">
                  <p className="font-semibold mb-1">Vault Contract:</p>
                  <p className="font-mono break-all">{DEPLOYED_CONTRACTS.nativeRewardVault}</p>
                </div>
              </>
            ) : (
              <p className="text-gray-400">Failed to load vault data</p>
            )}
          </div>

          {/* Job Suggestions Section */}
          <div className="bg-gray-800 rounded-lg p-6 border border-purple-500/30">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span>📋</span> Job Suggestions
            </h2>

            {isLoadingSuggestions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                <p className="text-gray-400 mt-4">Loading suggestions...</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-4">
                  These suggestions will be injected into the AI system prompt to guide job creation and align user contributions with ecosystem goals.
                </p>

                <textarea
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                  rows={20}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500 resize-none"
                  placeholder="Enter job suggestions here..."
                />

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={handleSaveSuggestions}
                    disabled={isSaving || suggestions === originalSuggestions}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:cursor-not-allowed"
                  >
                    {isSaving ? "Saving..." : "Save Suggestions"}
                  </button>

                  <button
                    onClick={() => setSuggestions(originalSuggestions)}
                    disabled={suggestions === originalSuggestions}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                </div>

                {saveMessage && (
                  <div
                    className={`mt-4 p-3 rounded-lg ${
                      saveMessage.type === "success"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {saveMessage.text}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
