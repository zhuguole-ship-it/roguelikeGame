export type LocalRuntimeEnvironment = {
  DEV?: boolean
  PROD?: boolean
  MODE?: string
}

export const LOCAL_RUNTIME_HOSTNAMES = ['localhost', '127.0.0.1', '::1'] as const

export const getRuntimeHostname = () => (
  typeof window === 'undefined' ? '' : window.location.hostname
)

export const isLocalDevelopmentRuntime = (
  env: LocalRuntimeEnvironment = import.meta.env,
  hostname = getRuntimeHostname(),
) => {
  const normalizedHostname = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '')

  return env.PROD !== true
    && LOCAL_RUNTIME_HOSTNAMES.includes(normalizedHostname as typeof LOCAL_RUNTIME_HOSTNAMES[number])
}
