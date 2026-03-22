'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  return (
    <div
      style={{ fontFamily: 'Circular, -apple-system, BlinkMacSystemFont, Roboto, sans-serif' }}
      className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#FF385C' }}
          >
            <svg viewBox="0 0 32 32" width="28" height="28" fill="white" aria-hidden="true">
              <path d="M16 1C10.5 1 6 8.5 6 14c0 4.1 2 7.7 5 9.8L16 31l5-7.2c3-2.1 5-5.7 5-9.8C26 8.5 21.5 1 16 1zm0 18a5 5 0 110-10 5 5 0 010 10z" />
            </svg>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-6 text-center tracking-tight">
            Log in or sign up
          </h1>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#FF385C',
                    brandAccent: '#E31C5F',
                    brandButtonText: 'white',
                    inputBorder: '#DDDDDD',
                    inputBorderHover: '#222222',
                    inputBorderFocus: '#222222',
                    inputText: '#222222',
                    inputPlaceholder: '#717171',
                    messageText: '#222222',
                    anchorTextColor: '#222222',
                    anchorTextHoverColor: '#FF385C',
                    dividerBackground: '#EBEBEB',
                  },
                  radii: {
                    borderRadiusButton: '8px',
                    buttonBorderRadius: '8px',
                    inputBorderRadius: '8px',
                  },
                  fonts: {
                    bodyFontFamily: 'Circular, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                    buttonFontFamily: 'Circular, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                    inputFontFamily: 'Circular, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
                  },
                  fontSizes: {
                    baseBodySize: '14px',
                    baseInputSize: '14px',
                    baseLabelSize: '13px',
                  },
                  space: {
                    inputPadding: '12px 14px',
                    buttonPadding: '12px 14px',
                    labelBottomMargin: '6px',
                  },
                },
              },
              style: {
                button: {
                  fontWeight: '500',
                  fontSize: '14px',
                },
                input: {
                  fontSize: '14px',
                },
                label: {
                  color: '#222222',
                  fontWeight: '500',
                },
                anchor: {
                  fontWeight: '500',
                  textDecoration: 'underline',
                },
                divider: {
                  margin: '16px 0',
                },
                container: {
                  gap: '12px',
                },
              },
            }}
            providers={['google']}
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
            onlyThirdPartyProviders={false}
            socialLayout="horizontal"
            view="sign_in"
          />
        </div>

        <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
          By continuing, you agree to StaySeeker&apos;s{' '}
          <a href="#" className="underline text-gray-700 hover:text-gray-900">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="underline text-gray-700 hover:text-gray-900">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  )
}
