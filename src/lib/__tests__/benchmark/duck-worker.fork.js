import { duckWorker } from '../../duck-worker.js'
import path from 'path'

duckWorker({
  workerDir: path.join(__dirname, './worker-folder')
})
  .then(() => {
    process.send('done')
  })
