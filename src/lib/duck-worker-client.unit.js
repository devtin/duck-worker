import test from 'ava'
import { DuckWorkerClient } from './duck-worker-client.js'
import { forkDuckWorkerIpc } from './__tests__/utils/fork-duck-worker-ipc.js'
import path from 'path'

test.before(async () => {
  await forkDuckWorkerIpc(path.join(__dirname, './__tests__/benchmark/duck-worker-ipc.fork.js'))
})

test('duck worker client success', async (t) => {
  const client = await new DuckWorkerClient()
  t.is(await client.workerA('some payload'), 'received: some payload')
})

test('duck worker client fail', async (t) => {
  const client = await new DuckWorkerClient()
  await t.throwsAsync(() => client.workerB('some error'), {
    instanceOf: Error,
    message: 'some error'
  })
})
