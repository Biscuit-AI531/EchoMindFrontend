export async function pollEvaluation(initial, fetchJob, { isCurrent = () => true, onProgress = () => {}, interval = 1500 } = {}) {
  let job = initial
  let failures = 0
  while (isCurrent()) {
    onProgress(job)
    if (job.status === 'completed') return job.result
    if (job.status === 'failed' || job.status === 'cancelled') {
      const error = new Error(job.error || '评测任务失败')
      error.terminal = true
      throw error
    }
    await new Promise(resolve => setTimeout(resolve, interval))
    if (!isCurrent()) return null
    try {
      job = await fetchJob(job.job_id)
      failures = 0
    } catch (error) {
      if ((error.status && error.status < 500 && error.status !== 429) || ++failures >= 3) throw error
    }
  }
  return null
}
