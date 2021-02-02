import ipc from 'node-ipc'
import { getAppName } from './get-app-name.js'
import { DuckStorageClass, DuckRack, Duck, Duckfficer } from 'duck-storage'
import mongodb from 'duck-storage-mongodb'

const { Utils } = Duckfficer

const resolveValue = async (value) => {
  if (typeof value === 'function') {
    return value()
  }

  return value
}

const loggerSetup = async () => {
  const storage = await new DuckStorageClass({ setupIpc: false, plugins: [mongodb()] })
  const eventsDuck = new Duck({
    schema: {
      date: {
        type: Date,
        index: true,
        autoCast: true,
        default: Date.now
      },
      requestId: {
        type: String,
        index: true
      },
      flow: {
        type: String,
        enum: ['request', 'response'],
        index: true
      },
      space: {
        type: String,
        index: true
      },
      data: {
        type: Object,
        required: false
      }
    }
  })
  const eventsRack = await new DuckRack('worker_event', { duckModel: eventsDuck })
  await storage.registerRack(eventsRack)

  return async function log ({ space, requestId, data, flow }) {
    try {
      return await eventsRack.create({
        space,
        requestId,
        flow,
        data
      })
    } catch (err) {
      // shh: log in disk
      console.log('error logging event', { space, requestId, data }, err)
    }
  }
}

const setupIpc = async ({ appName, id }) => {
  const appspace = await resolveValue(appName)

  Object.assign(ipc.config, {
    appspace,
    id,
    silent: true
  })

  return new Promise((resolve, reject) => {
    ipc.serve(() => {
      resolve(ipc.server)
    })

    setTimeout(() => reject(new Error('ipc time out')), 5000)

    ipc.server.start()
  })
}

const execute = async ({ data, socket, workers }) => {
  const answer = ({ error, result }) => {
    ipc.server.emit(
      socket,
      data.id,
      {
        error,
        result
      }
    )

    return { error, result }
  }

  const executeAndAnswer = (executer) => {
    const getPayload = async () => {
      return executer()
    }
    return getPayload()
      .then(result => {
        return answer({
          result
        })
      })
      .catch((error) => {
        return answer({
          error: error.message
        })
      })
  }

  const worker = data.path.join('.')

  if (!worker) {
    return answer({ error: 'worker name is required' })
  }

  const workerHandler = Utils.find(workers, worker)

  if (typeof workerHandler !== 'function') {
    return answer({ error: `worker "${worker}" not found` })
  }

  return executeAndAnswer(() => workerHandler(...data.args))
}

/**
 * @param {String} [appName=<package.json->name>] - the appName (defaults to project's package.json name)
 * @param {Object} workers - workers object mapping to functions
 * @param {String} [id=worker] - worker id
 * @return {Promise<ipc.server>}
 */
export async function duckWorkerIpc ({ appName = getAppName, workers, id = 'worker' } = {}) {
  await setupIpc({ appName, id })
  const log = await loggerSetup()

  // handler
  ipc.server.on('execute', (data, socket) => {
    const space = 'execute'
    const requestId = data.id

    const logRequest = () => log({
      space,
      flow: 'request',
      requestId,
      data
    })

    logRequest()
      .then(() => execute({ data, socket, workers }))
      .then((response) => {
        return log({
          space,
          flow: 'response',
          requestId,
          data: response
        })
      })
  })

  return ipc.server
}
