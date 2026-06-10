import { createContext, useContext, type ReactNode } from "react";

/** When true, the app shell renders sidebar + header; page components skip their own. */
export const LayoffProofShellChromeContext = createContext(false);

export function useShellManagesChrome(): boolean {
  return useContext(LayoffProofShellChromeContext);
}

export function LayoffProofShellChromeProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <LayoffProofShellChromeContext.Provider value={true}>
      {children}
    </LayoffProofShellChromeContext.Provider>
  );
}
