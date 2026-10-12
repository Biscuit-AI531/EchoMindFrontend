import test from 'node:test'
import assert from 'node:assert/strict'
import { pollEvaluation } from '../src/lib/evaluationJobs.js'
test('polls until report is ready', async () => {
  let count = 0
  const result = await pollEvaluation({job_id:'x', status:'queued'}, async () => (++count === 1 ? {job_id:'x',status:'running'} : {job_id:'x',status:'completed',result:{total:5}}), {interval:0})
  assert.deepEqual(result, {total:5})
  assert.equal(count, 2)
})
test('propagates job failure', async () => {
  await assert.rejects(pollEvaluation({status:'failed',error:'timeout'}, () => {}), /timeout/)
})
test('backend switch stops polling', async () => {
  let called = false
  const result = await pollEvaluation({status:'queued'}, () => {called = true}, {isCurrent:() => false})
  assert.equal(result, null)
  assert.equal(called, false)
})

test('temporary network errors retry without submitting new job', async () => {
  let calls = 0
  const result = await pollEvaluation({job_id:'same',status:'running'}, async id => {
    assert.equal(id, 'same')
    if (++calls < 3) throw new TypeError('network')
    return {job_id:id,status:'completed',result:{total:1}}
  }, {interval:0})
  assert.equal(calls, 3)
  assert.deepEqual(result, {total:1})
})
test('expired task stops immediately', async () => {
  let calls = 0
  await assert.rejects(pollEvaluation({job_id:'gone',status:'queued'}, async () => {
    calls++
    const error = new Error('expired'); error.status = 404; throw error
  }, {interval:0}), /expired/)
  assert.equal(calls, 1)
})
