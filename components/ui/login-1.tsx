'use client'

import * as React from 'react'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Instagram, Linkedin, Facebook } from 'lucide-react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth'
import { auth } from '@/firebase/client'
import { signIn, signUp } from '@/lib/actions/auth.action'

interface InputProps {
  label?: string
  placeholder?: string
  icon?: React.ReactNode
  type?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  [key: string]: any
}

const AppInput = (props: InputProps) => {
  const { label, placeholder, icon, ...rest } = props
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  return (
    <div className="w-full min-w-[200px] relative">
      {label && <label className='block mb-2 text-sm'>{label}</label>}
      <div className="relative w-full">
        <input
          className="peer relative z-10 border-2 border-[var(--color-border)] h-13 w-full rounded-md bg-[var(--color-surface)] px-4 font-thin outline-none drop-shadow-sm transition-all duration-200 ease-in-out focus:bg-[var(--color-bg)] placeholder:font-medium"
          placeholder={placeholder}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="absolute pointer-events-none top-0 left-0 right-0 h-[2px] z-20 rounded-t-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 0px, var(--color-text-primary) 0%, transparent 70%)`
              }}
            />
            <div
              className="absolute pointer-events-none bottom-0 left-0 right-0 h-[2px] z-20 rounded-b-md overflow-hidden"
              style={{
                background: `radial-gradient(30px circle at ${mousePosition.x}px 2px, var(--color-text-primary) 0%, transparent 70%)`
              }}
            />
          </>
        )}
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface LoginPageProps {
  type: 'sign-in' | 'sign-up'
}

const LoginPage = ({ type }: LoginPageProps) => {
  const router = useRouter()
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })

  const handleMouseMove = (e: React.MouseEvent) => {
    const leftSection = e.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - leftSection.left,
      y: e.clientY - leftSection.top
    })
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (type === 'sign-up') {
        const { name, email, password } = formData

        const userCredentials = await createUserWithEmailAndPassword(auth, email, password)

        const result = await signUp({
          uid: userCredentials.user.uid,
          name: name!,
          email,
          password
        })

        if (!result?.success) {
          toast.error(result?.message)
          return
        }

        const idToken = await userCredentials.user.getIdToken()
        await signIn({ email, idToken })
        toast.success('Account created successfully!')
        router.push('/')
      } else {
        const { email, password } = formData

        const userCredential = await signInWithEmailAndPassword(auth, email, password)

        const idToken = await userCredential.user.getIdToken()

        if (!idToken) {
          toast.error('Sign in failed')
          return
        }

        await signIn({
          email,
          idToken
        })

        toast.success('Sign in successfully.')
        router.push('/')
      }
    } catch (error) {
      console.log(error)
      toast.error(`There was an error: ${error}`)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)
      const provider = new GoogleAuthProvider()

      provider.setCustomParameters({
        prompt: 'select_account'
      })

      try {
        const userCredential = await signInWithPopup(auth, provider)

        const user = userCredential.user

        const idToken = await user.getIdToken()

        const signUpResult = await signUp({
          uid: user.uid,
          name: user.displayName || 'User',
          email: user.email || '',
          password: ''
        })

        if (!signUpResult?.success) {
          toast.error(signUpResult?.message || 'Failed to create account')
          setIsGoogleLoading(false)
          return
        }

        const signInResult = await signIn({
          email: user.email || '',
          idToken
        })

        if (!signInResult?.success) {
          toast.error(signInResult?.message || 'Failed to sign in')
          setIsGoogleLoading(false)
          return
        }

        toast.success('Signed in successfully with Google')

        router.replace('/')
      } catch (popupError: unknown) {
        console.error('Popup error:', popupError)

        if (
          (popupError as { code?: string }).code === 'auth/popup-closed-by-user' ||
          (popupError as { code?: string }).code === 'auth/popup-blocked' ||
          (popupError as Error).message?.includes('Cross-Origin-Opener-Policy')
        ) {
          toast.error('Popup authentication failed. Please try again.')
          throw popupError
        }
      }
    } catch (error: unknown) {
      console.error('Google sign-in error:', error)

      if ((error as { code?: string }).code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in cancelled. Please try again.')
      } else if ((error as { code?: string }).code === 'auth/popup-blocked') {
        toast.error('Pop-up blocked by browser. Please allow pop-ups for this site.')
      } else {
        toast.error(`Google sign-in failed: ${(error as Error)?.message || 'Unknown error'}`)
      }
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const socialIcons = [
    {
      icon: <Instagram className="w-6 h-6" />,
      href: '#',
      gradient: 'bg-[var(--color-bg)]'
    },
    {
      icon: <Linkedin className="w-6 h-6" />,
      href: '#',
      bg: 'bg-[var(--color-bg)]'
    },
    {
      icon: <Facebook className="w-6 h-6" />,
      href: '#',
      bg: 'bg-[var(--color-bg)]'
    }
  ]

  const isSignIn = type === 'sign-in'

  return (
    <div className="h-screen w-full bg-[var(--color-bg)] flex items-center justify-center">
      <div className='card w-full h-full flex justify-between'>
        <div
          className='w-full lg:w-1/2 px-4 lg:px-16 left h-full relative overflow-hidden'
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={`absolute pointer-events-none w-[500px] h-[500px] bg-gradient-to-r from-purple-300/30 via-blue-300/30 to-pink-300/30 rounded-full blur-3xl transition-opacity duration-200 ${
              isHovering ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: `translate(${mousePosition.x - 250}px, ${mousePosition.y - 250}px)`,
              transition: 'transform 0.1s ease-out'
            }}
          />
          <div className="form-container sign-in-container h-full z-10">
            <form className='text-center py-10 md:py-20 grid gap-2 h-full' onSubmit={handleSubmit}>
              <div className='grid gap-4 md:gap-6 mb-2'>
                <h1 className='text-3xl md:text-4xl font-extrabold'>
                  {isSignIn ? 'Sign in' : 'Sign up'}
                </h1>
                <div className="social-container">
                  <div className="flex items-center justify-center">
                    <ul className="flex gap-3 md:gap-4">
                      {socialIcons.map((social, index) => {
                        return (
                          <li key={index} className="list-none">
                            <a
                              href={social.href}
                              className={`w-[2.5rem] md:w-[3rem] h-[2.5rem] md:h-[3rem] bg-[var(--color-bg-2)] rounded-full flex justify-center items-center relative z-[1] border-3 border-[var(--color-text-primary)] overflow-hidden group`}
                            >
                              <div
                                className={`absolute inset-0 w-full h-full ${
                                  social.gradient || social.bg
                                } scale-y-0 origin-bottom transition-transform duration-500 ease-in-out group-hover:scale-y-100`}
                              />
                              <span className="text-[1.5rem] text-[hsl(203,92%,8%)] transition-all duration-500 ease-in-out z-[2] group-hover:text-[var(--color-text-primary)] group-hover:rotate-y-360">
                                {social.icon}
                              </span>
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
                <span className='text-sm'>or use your account</span>
              </div>
              <div className='grid gap-4 items-center'>
                {!isSignIn && (
                  <AppInput
                    placeholder="Name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                )}
                <AppInput
                  placeholder="Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <AppInput
                  placeholder="Password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              {isSignIn && (
                <a href="#" className='font-light text-sm md:text-md'>
                  Forgot your password?
                </a>
              )}
              <div className='flex gap-4 justify-center items-center flex-col'>
                <button
                  type="submit"
                  className="group/button relative inline-flex justify-center items-center overflow-hidden rounded-md bg-[var(--color-border)] px-4 py-1.5 text-xs font-normal text-white transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-text-primary)] cursor-pointer"
                >
                  <span className="text-sm px-2 py-1">{isSignIn ? 'Sign In' : 'Sign Up'}</span>
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                    <div className="relative h-full w-8 bg-white/20" />
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleLoading}
                  className="group/button relative inline-flex justify-center items-center overflow-hidden rounded-md bg-[var(--color-border)] px-4 py-1.5 text-xs font-normal text-white transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-text-primary)] cursor-pointer gap-2"
                >
                  {isGoogleLoading ? (
                    <span className="animate-spin h-4 w-4 border-2 border-primary-200 rounded-full border-t-transparent"></span>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="16" height="16">
                      <path
                        fill="#FFC107"
                        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                      />
                      <path
                        fill="#FF3D00"
                        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                      />
                      <path
                        fill="#4CAF50"
                        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                      />
                      <path
                        fill="#1976D2"
                        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                      />
                    </svg>
                  )}
                  <span className="text-sm px-2 py-1">
                    {isSignIn ? 'Sign in with Google' : 'Sign up with Google'}
                  </span>
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                    <div className="relative h-full w-8 bg-white/20" />
                  </div>
                </button>

                <p className="text-center text-sm mt-2">
                  {isSignIn ? "No account yet?" : "Have an account already?"}
                  <Link
                    href={!isSignIn ? "/sign-in" : "/sign-up"}
                    className="font-bold text-primary-200 ml-1"
                  >
                    {!isSignIn ? "Sign In" : "Sign Up"}
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
        <div className='hidden lg:block w-1/2 right h-full overflow-hidden'>
          <Image
            src='https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1260&h=750&fit=crop'
            loader={({ src }) => src}
            width={1000}
            height={1000}
            priority
            alt="Team collaboration"
            className="w-full h-full object-cover transition-transform duration-300 opacity-30"
          />
        </div>
      </div>
    </div>
  )
}

export default LoginPage
