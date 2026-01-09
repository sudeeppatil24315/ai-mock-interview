"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "@/firebase/client";
import { signIn, signUp } from "@/lib/actions/auth.action";
import { toast } from "sonner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleEmailLink = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setStatus("error");
        setErrorMessage("Invalid sign-in link");
        return;
      }

      let email = window.localStorage.getItem("emailForSignIn");
      const authType = window.localStorage.getItem("authType") || "sign-in";
      const name = window.localStorage.getItem("emailLinkName") || "User";

      if (!email) {
        email = window.prompt("Please enter your email for confirmation");
        if (!email) {
          setStatus("error");
          setErrorMessage("Email is required to complete sign-in");
          return;
        }
      }

      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        const user = result.user;
        const idToken = await user.getIdToken();

        // Clear stored data
        window.localStorage.removeItem("emailForSignIn");
        window.localStorage.removeItem("authType");
        window.localStorage.removeItem("emailLinkName");

        // Always try to create user first (handles both sign-up and sign-in)
        await signUp({
          uid: user.uid,
          name: name,
          email: email,
          password: "",
        });

        // Sign in with backend to set session cookie
        const signInResult = await signIn({ email, idToken });

        if (!signInResult?.success) {
          console.error("Sign in failed:", signInResult?.message);
          // Still try to redirect - user might already be authenticated
        }

        setStatus("success");
        toast.success("Signed in successfully!");
        
        // Small delay to ensure cookie is set
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
      } catch (error) {
        console.error("Email link sign-in error:", error);
        setStatus("error");
        setErrorMessage((error as Error).message || "Failed to sign in");
      }
    };

    handleEmailLink();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="text-center p-8 rounded-lg max-w-md" style={{ background: '#1a1a1a' }}>
        {status === "loading" && (
          <>
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
            <h2 className="text-xl text-white">Signing you in...</h2>
            <p className="text-gray-400 mt-2">Please wait</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl text-white">Sign-in Failed</h2>
            <p className="text-gray-400 mt-2">{errorMessage}</p>
            <button
              onClick={() => router.push("/sign-in")}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Try Again
            </button>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl text-white">Success!</h2>
            <p className="text-gray-400 mt-2">Redirecting to dashboard...</p>
          </>
        )}
      </div>
    </div>
  );
}
