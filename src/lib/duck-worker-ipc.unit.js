import test from 'ava'
import ipc from 'node-ipc'
import { getAppName } from './get-app-name.js'
import { forkDuckWorkerIpc } from './__tests__/utils/fork-duck-worker-ipc.js'
import path from 'path'

let mainDuckWorkerProcess

const setupIpc = async () => {
  Object.assign(ipc.config, {
    appspace: await getAppName(),
    id: 'worker',
    silent: true
  })
}


test.before(async () => {
  await setupIpc()
  mainDuckWorkerProcess = await forkDuckWorkerIpc(path.join(__dirname, './__tests__/benchmark/duck-worker-ipc.fork.js'))
})

test.after(async () => {
  mainDuckWorkerProcess.kill()
  ipc.disconnect('worker')
})

test('duck worker provides ipc interface', async  (t) => {
  ipc.connectTo('worker')
  return new Promise((resolve) => {
    ipc.of['worker'].on('pong', () => {
      t.pass()
      resolve()
    })
    ipc.of['worker'].emit('ping')
  })
})
