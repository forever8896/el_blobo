/**
 * Registration Example Component
 *
 * Example implementation showing how to use the registration hook
 * This can be integrated into the OnboardingFlow or used standalone
 */

"use client";

import { useRegistration } from "@/app/hooks/useRegistration";
import { useAccount } from "wagmi";
import { formatEther } from "viem";

export function RegistrationExample() {
  const { address, isConnected } = useAccount();
  const {
    isLoading,
    isRegistered,
    registrationPrice,
    registrationPriceFormatted,
    error,
    txHash,
    register,
    checkRegistration,
    fetchPrice,
  } = useRegistration();

  const handleRegister = async () => {
    // Register without sponsors
    await register();

    // Or with sponsors:
    // await register(
    //   "0x..." as Address, // big sponsor
    //   "0x..." as Address  // small sponsor
    // );
  };

  if (!isConnected) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
        Please connect your wallet to register
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Blob Registration</h2>

      {/* Registration Status */}
      <div className="p-4 bg-gray-50 rounded">
        <p className="text-sm font-medium text-gray-700">Status:</p>
        <p className="text-lg font-bold">
          {isRegistered ? (
            <span className="text-green-600">✓ Registered</span>
          ) : (
            <span className="text-orange-600">Not Registered</span>
          )}
        </p>
      </div>

      {/* Registration Price */}
      {registrationPrice && (
        <div className="p-4 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-700">Registration Price:</p>
          <p className="text-lg font-bold text-gray-900">
            {registrationPriceFormatted} RON
          </p>
          <p className="text-xs text-gray-500">({registrationPrice.toString()} wei)</p>
        </div>
      )}

      {/* Connected Wallet */}
      <div className="p-4 bg-gray-50 rounded">
        <p className="text-sm font-medium text-gray-700">Wallet:</p>
        <p className="text-sm font-mono text-gray-900 break-all">{address}</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-sm font-medium text-red-800">Error:</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Transaction Hash */}
      {txHash && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-medium text-green-800">Transaction Hash:</p>
          <p className="text-sm font-mono text-green-600 break-all">{txHash}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isRegistered && (
          <button
            onClick={handleRegister}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium ${
              isLoading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Registering..." : "Register"}
          </button>
        )}

        <button
          onClick={checkRegistration}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300 disabled:opacity-50"
        >
          Check Status
        </button>

        <button
          onClick={fetchPrice}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-medium hover:bg-gray-300 disabled:opacity-50"
        >
          Refresh Price
        </button>
      </div>
    </div>
  );
}
