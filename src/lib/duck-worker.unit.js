import test from 'ava'
import path from 'path'
import { forkDuckWorkerIpc } from './__tests__/utils/fork-duck-worker-ipc.js'
import { DuckWorkerClient } from './duck-worker-client.js'

let client

test.before(async () => {
  await forkDuckWorkerIpc(path.join(__dirname, './__tests__/benchmark/duck-worker.fork.js'))
  client = await new DuckWorkerClient()
})

test('loads workers from folder', async (t) => {
  await t.throwsAsync(() => client.taskA('something'), {
    message: 'got: something'
  })

  t.like(await client.taskB({ name: 'Olivia' }), {
    output: 'name is: Olivia'
  })


  const r = await client.nameSpace.taskC('what is love?')

  t.like(r.errorsThrown[0], {
    payload: 'what is love?'
  })
})
