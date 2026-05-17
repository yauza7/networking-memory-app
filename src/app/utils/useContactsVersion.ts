import { useEffect, useState } from "react";
import { CONTACTS_CHANGED_EVENT } from "./contactStore";

/**
 * Returns a monotonically-increasing version number that bumps whenever
 * the contact list changes (local mutation or server sync). Screens can
 * use it as a dep in useMemo / useEffect to force a fresh read of
 * loadStoredContacts() without lifting all state up to a global store.
 */
export function useContactsVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const onChange = () => setV((x) => x + 1);
    window.addEventListener(CONTACTS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONTACTS_CHANGED_EVENT, onChange);
  }, []);
  return v;
}
