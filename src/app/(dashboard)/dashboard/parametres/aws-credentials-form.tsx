'use client'

import { useActionState, useState, useTransition } from 'react'
import { saveAwsCredentials, testAwsConnection } from './actions'

const AWS_REGIONS = [
  { value: 'eu-west-1', label: 'Europe (Irlande)' },
  { value: 'eu-west-2', label: 'Europe (Londres)' },
  { value: 'eu-central-1', label: 'Europe (Francfort)' },
  { value: 'us-east-1', label: 'US Est (Virginie)' },
  { value: 'us-west-2', label: 'US Ouest (Oregon)' },
]

export default function AwsCredentialsForm({
  existingRegion,
  hasCredentials,
}: {
  existingRegion: string
  hasCredentials: boolean
}) {
  const [state, formAction, pending] = useActionState(saveAwsCredentials, null)
  const [testResult, setTestResult] = useState<{ error: string } | { success: string; quota: number } | null>(null)
  const [testing, startTest] = useTransition()
  const [editing, setEditing] = useState(!hasCredentials)

  function handleTest() {
    startTest(async () => {
      const result = await testAwsConnection()
      setTestResult(result)
    })
  }

  if (!editing && hasCredentials) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Credentials enregistrés — région : <strong>{existingRegion}</strong>
        </div>

        {testResult && (
          <div className={`text-sm px-4 py-3 rounded-lg ${'error' in testResult ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {'error' in testResult
              ? testResult.error
              : `${testResult.success} — quota 24h : ${testResult.quota.toLocaleString()} emails`}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {testing ? 'Test en cours...' : 'Tester la connexion'}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Modifier
          </button>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="access_key_id" className="block text-sm font-medium text-gray-700 mb-1">
          Access Key ID
        </label>
        <input
          id="access_key_id"
          name="access_key_id"
          type="text"
          required
          placeholder="AKIAIOSFODNN7EXAMPLE"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="secret_access_key" className="block text-sm font-medium text-gray-700 mb-1">
          Secret Access Key
        </label>
        <input
          id="secret_access_key"
          name="secret_access_key"
          type="password"
          required
          placeholder="••••••••••••••••••••••••••••••••••••••••"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
        />
      </div>

      <div>
        <label htmlFor="aws_region" className="block text-sm font-medium text-gray-700 mb-1">
          Région SES
        </label>
        <select
          id="aws_region"
          name="aws_region"
          defaultValue={existingRegion}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
        >
          {AWS_REGIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {state && 'error' in state && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{state.error}</p>
      )}
      {state && 'success' in state && (
        <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{state.success}</p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
        {hasCredentials && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  )
}
