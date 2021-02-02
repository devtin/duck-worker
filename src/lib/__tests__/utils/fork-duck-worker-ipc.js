import { spawn } from 'child_process'

export const forkDuckWorkerIpc = (file) => {
  const mainDuckWorkerProcess = spawn('node', ['-r', 'esm', file], {
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
  })

  mainDuckWorkerProcess.stdout.on('data', function (data) {
    console.log('worker: ' + data.toString());
  })

  return new Promise((resolve, reject) => {
    mainDuckWorkerProcess.on('message', (message) => {
      if (message === 'done') {
        resolve(mainDuckWorkerProcess)
      }
    })

    setTimeout(() => reject(new Error('timed-out')), 3000)
  })
}
