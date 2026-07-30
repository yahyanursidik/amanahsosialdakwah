import type { AccessContext } from "./permission-resolver";

let currentAccessContext: AccessContext | null = null;

export function getCurrentAccessContext(): AccessContext | null {
  return currentAccessContext;
}

export function setCurrentAccessContext(context: AccessContext | null) {
  currentAccessContext = context;
}
