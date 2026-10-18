/**
 * Sign in with Apple is iOS only. This version is what Android and web get, so they never load the
 * iOS-only modules. The real one is `appleAuth.ios.tsx`.
 */
export function useAppleAvailable(): boolean {
  return false;
}

export function AppleContinueButton(_props: { onError: (message: string) => void }) {
  return null;
}
