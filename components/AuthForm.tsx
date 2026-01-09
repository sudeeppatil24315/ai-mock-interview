"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Form} from "@/components/ui/form"
import Link from "next/link";
import {toast} from "sonner";
import FormField from "@/components/FormField";
import {useRouter} from "next/navigation";
import {
  sendSignInLinkToEmail,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import {auth} from "@/firebase/client";
import {signIn, signUp} from "@/lib/actions/auth.action";
import AuthCard from "./auth/AuthCard";
import AuthHeader from "./auth/AuthHeader";

const authFormSchema = (type: FormType) => {
    return z.object({
        name: type === 'sign-up' ? z.string().min(3) : z.string().optional(),
        email: z.string().email(),
    })
}

const AuthForm = ({ type }: { type: FormType }) => {
    const router = useRouter();
    const formSchema = authFormSchema(type);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setIsEmailLoading(true);
            const { email, name } = values;

            // Store name for sign-up flow
            if (type === 'sign-up' && name) {
                window.localStorage.setItem('emailLinkName', name);
            }

            const actionCodeSettings = {
                url: `${window.location.origin}/auth/callback`,
                handleCodeInApp: true,
            };

            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            
            // Save email for verification on callback
            window.localStorage.setItem('emailForSignIn', email);
            window.localStorage.setItem('authType', type);
            
            setEmailSent(true);
            toast.success('Sign-in link sent! Check your email.');
        } catch (error) {
            console.error('Email link error:', error);
            toast.error(`Failed to send email link: ${(error as Error).message}`);
        } finally {
            setIsEmailLoading(false);
        }
    }

    const handleGoogleSignIn = async () => {
        try {
            setIsGoogleLoading(true);
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            
            const userCredential = await signInWithPopup(auth, provider);
            const user = userCredential.user;
            const idToken = await user.getIdToken();

            const signUpResult = await signUp({
                uid: user.uid,
                name: user.displayName || 'User',
                email: user.email || '',
                password: ''
            });
            
            if (!signUpResult?.success) {
                toast.error(signUpResult?.message || 'Failed to create account');
                return;
            }
            
            const signInResult = await signIn({
                email: user.email || '',
                idToken
            });
            
            if (!signInResult?.success) {
                toast.error(signInResult?.message || 'Failed to sign in');
                return;
            }
            
            toast.success('Signed in successfully with Google');
            router.replace('/');
        } catch (error: unknown) {
            console.error('Google sign-in error:', error);
            if ((error as { code?: string }).code === 'auth/popup-closed-by-user') {
                toast.error('Sign-in cancelled.');
            } else if ((error as { code?: string }).code === 'auth/popup-blocked') {
                toast.error('Pop-up blocked. Please allow pop-ups.');
            } else {
                toast.error(`Google sign-in failed: ${(error as Error)?.message}`);
            }
        } finally {
            setIsGoogleLoading(false);
        }
    };
    
    const isSignIn = type === 'sign-in';

    // Show success message after email is sent
    if (emailSent) {
        return (
            <AuthCard>
                <AuthHeader title="Check your email" />
                <div className="text-center mt-6 space-y-4">
                    <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-light-100">
                        We sent a sign-in link to your email.
                    </p>
                    <p className="text-light-400 text-sm">
                        Click the link in the email to sign in. You can close this page.
                    </p>
                    <Button 
                        variant="outline" 
                        onClick={() => setEmailSent(false)}
                        className="mt-4"
                    >
                        Use a different email
                    </Button>
                </div>
            </AuthCard>
        );
    }

    return (
        <AuthCard>
            <AuthHeader title="AI-powered real-time interview platform for smarter hiring" />

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="w-full space-y-6 mt-4 form"
              >
                {!isSignIn && (
                  <FormField
                    control={form.control}
                    name="name"
                    label="Name"
                    placeholder="Your Name"
                    type="text"
                  />
                )}

                <FormField
                  control={form.control}
                  name="email"
                  label="Email"
                  placeholder="Your email address"
                  type="email"
                />

                <Button className="btn" type="submit" disabled={isEmailLoading}>
                  {isEmailLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>
                      Sending...
                    </span>
                  ) : (
                    <>Send Sign-in Link</>
                  )}
                </Button>
              </form>
            </Form>
            
            <div className="relative flex items-center justify-center mt-6 mb-4">
              <div className="absolute border-t border-gray-700 w-full"></div>
              <span className="relative px-4 bg-gray-700 text-light-300 text-sm rounded-lg">or</span>
            </div>
            
            <Button 
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 border-gray-700 hover:bg-dark-300 transition-colors cursor-pointer"
            >
              {isGoogleLoading ? (
                <span className="animate-spin h-4 w-4 border-2 border-primary-200 rounded-full border-t-transparent"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
              )}
              <span>{isSignIn ? "Sign in with Google" : "Sign up with Google"}</span>
            </Button>

            <p className="text-center flex flex-col sm:flex-row gap-3 justify-center mt-6">
              {isSignIn ? "No account yet?" : "Have an account already?"}
              <Link
                href={!isSignIn ? "/sign-in" : "/sign-up"}
                className="font-bold text-user-primary ml-1"
              >
                {!isSignIn ? "Sign In" : "Sign Up"}
              </Link>
            </p>
        </AuthCard>
    );
};

export default AuthForm;
