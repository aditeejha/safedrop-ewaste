import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Amplify } from 'aws-amplify'
import { confirmSignUp, fetchAuthSession, signIn, signOut, signUp, resendSignUpCode } from 'aws-amplify/auth'
import { config } from './config'

export type Session = {
  id: string
  email: string
  name: string
  groups: string[]
  pointId?: string
}

export function configureAuth() {
  const { userPoolId, userPoolClientId } = config()
  Amplify.configure({ Auth: { Cognito: { userPoolId, userPoolClientId } } })
}

export async function idToken() {
  const session = await fetchAuthSession()
  return session.tokens?.idToken?.toString() ?? null
}

async function currentSession(): Promise<Session | null> {
  try {
    const session = await fetchAuthSession()
    const payload = session.tokens?.idToken?.payload
    if (!payload) return null
    return {
      id: String(payload.sub),
      email: String(payload.email ?? ''),
      name: String(payload.name ?? payload.email ?? ''),
      groups: (payload['cognito:groups'] as string[] | undefined) ?? [],
      pointId: payload['custom:pointId'] as string | undefined,
    }
  } catch {
    return null
  }
}

export function useSession() {
  return useQuery({ queryKey: ['session'], queryFn: currentSession, staleTime: 60_000 })
}

export function useAuthActions() {
  const client = useQueryClient()
  const refresh = () => client.invalidateQueries()
  return {
    async signIn(email: string, password: string) {
      const result = await signIn({ username: email.trim().toLowerCase(), password })
      await refresh()
      return result
    },
    async signUp(name: string, email: string, password: string) {
      return signUp({
        username: email.trim().toLowerCase(),
        password,
        options: { userAttributes: { email: email.trim().toLowerCase(), name: name.trim() } },
      })
    },
    async confirm(email: string, code: string) {
      return confirmSignUp({ username: email.trim().toLowerCase(), confirmationCode: code.trim() })
    },
    async resend(email: string) {
      return resendSignUpCode({ username: email.trim().toLowerCase() })
    },
    async signOut() {
      await signOut()
      client.clear()
    },
  }
}
