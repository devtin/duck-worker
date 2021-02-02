import path from 'path'
import Promise from 'bluebird'
import { jsDirIntoJson } from 'js-dir-into-json'
import { duckfficerMethod } from 'duckfficer-method'
import { duckWorkerIpc } from './duck-worker-ipc.js'

const getWorkersFromRaw = async (rawWorkers) => {
  const workers = {}

  await Promise.each(Object.entries(rawWorkers), async ([workerName, workerDuckfficerMethod]) => {
    if (workerDuckfficerMethod.handler) {
      workers[workerName] = await duckfficerMethod(workerDuckfficerMethod)
    } else {
      workers[workerName] = await getWorkersFromRaw(workerDuckfficerMethod)
    }
  })

  return workers
}

/**
 * @param {String} workerDir - the worker dir
 * @return {exports<void>}
 */
export async function duckWorker ({
  workerDir
}) {
  const workersRaw = await jsDirIntoJson(path.resolve(process.cwd(), workerDir), {
    fileLoader: require('esm')(module)
  })
  const workers = await getWorkersFromRaw(workersRaw)
  await duckWorkerIpc({
    workers
  })
}
