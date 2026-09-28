import test from 'node:test'
import assert from 'node:assert/strict'
import { AccountQueryCache } from './accountQueryCache.ts'

test('private query data cannot cross an account transition', () => {
  const cache = new AccountQueryCache()
  const first = cache.forUser('account-a')
  first.setQueryData(['invoices'], [{ invoice_number: 'private-a' }])

  const second = cache.forUser('account-b')
  assert.notStrictEqual(second, first)
  assert.equal(second.getQueryData(['invoices']), undefined)

  const signedOut = cache.forUser(null)
  assert.notStrictEqual(signedOut, second)
  assert.equal(signedOut.getQueryData(['invoices']), undefined)

  const firstAgain = cache.forUser('account-a')
  assert.notStrictEqual(firstAgain, first)
  assert.equal(firstAgain.getQueryData(['invoices']), undefined)
  assert.strictEqual(cache.forUser('account-a'), firstAgain)
})
