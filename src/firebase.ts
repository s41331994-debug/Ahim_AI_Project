import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with DatabaseId passed from config (CRITICAL!)
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Google Auth Provider
export const googleAuthProvider = new GoogleAuthProvider();

// Configure Workspace Scopes
googleAuthProvider.addScope("https://www.googleapis.com/auth/documents");
googleAuthProvider.addScope("https://www.googleapis.com/auth/forms.body");
googleAuthProvider.addScope("https://www.googleapis.com/auth/meetings.space.created");
googleAuthProvider.addScope("https://www.googleapis.com/auth/chat.spaces");
googleAuthProvider.addScope("https://www.googleapis.com/auth/chat.messages");

// In-memory access token cache
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Standard handle Sign-In with Popup (using popups is compliant in development previews)
export async function signInWithGoogle() {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return result.user;
  } catch (error) {
    console.error("Firebase Sign-In Error: ", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

// Log out handler
export async function logOut() {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error("Firebase Sign-Out Error: ", error);
    throw error;
  }
}

// Access token getter
export async function getAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}

// Access token setter (e.g., if re-authenticating)
export function setAccessToken(token: string | null) {
  cachedAccessToken = token;
}

// Validation function described in SKILL.md to test connection to Firestore on initial boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Please check your Firebase configuration or network status.", error);
    }
  }
}

// --- STANDARD FIRESTORE ERRORS CUSTOM FORMATTER (FirestoreErrorInfo) ---
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error("Firestore Error Detailed Object: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
