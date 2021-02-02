import { duckWorkerIpc } from '../../duck-worker-ipc.js'

duckWorkerIpc({
  workers: {
    workerA (payload) {
      return `received: ${payload}`
    },
    workerB (message) {
      throw new Error(message)
    }
  }
})
  .then((server) => {
    server.on('ping', (data, socket) => {
      server.emit(socket, 'pong')
    })
    process.send('done')
  })
