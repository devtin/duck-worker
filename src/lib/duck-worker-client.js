import DeepProxy from 'proxy-deep'
import ipc from 'node-ipc'
import { getAppName } from './get-app-name.js'
import { uuid } from './uuid.js'

const ipcConnect = async ({ appSpace, clientId, workerId }) => {
  Object.assign(ipc.config, {
    appspace: appSpace || await getAppName(),
    id: clientId,
    silent: true
  })

  return new Promise((resolve) => {
    ipc.connectTo(workerId, () => {
      resolve(ipc.of[workerId])
    })
  })
}

const ipcDisconnect = async ({ workerId}) => {
  return new Promise((resolve, reject) => {
    ipc.of[workerId].on('disconnect', resolve)
    setTimeout(() => reject(new Error('ipc disconnec time-out')), 3000)
    ipc.disconnect(workerId)
  })
}

export class DuckWorkerClient {
  /**
   *
   * @param {String} appSpace - default to local package.json->name
   * @param {String} [clientId=client]
   * @param {String} [workerId=worker]
   * @return {Promise<{Object}>} the proxy to communicate with the worker
   */
  constructor ({
    appSpace,
    clientId = 'client',
    workerId = 'worker',
  } = {}) {
    return (async () => {
      this.clientId = clientId
      this.workerId = workerId
      this.ipc = await ipcConnect({ appSpace, clientId, workerId })
      return this.proxy()
    })()
  }

  process ({ args, path }) {
    return new Promise((resolve, reject) => {
      const id = uuid()
      this.ipc.on(id, ({ error, result }) => {
        if (error) {
          return reject(new Error(error))
        }

        resolve(result)
      })
      this.ipc.emit('execute', {
        id,
        path,
        args
      })
    })
  }

  proxy () {
    const $this = this
    const disconnect = () => {
      return ipcDisconnect({ workerId: this.workerId })
    }
    return new DeepProxy({}, {
      get (target, path) {
        if (path === 'then') {
          return
        }
        if (path === 'disconnect') {
          return disconnect
        }
        return this.nest(function () {})
      },
      apply (target, thisArg, args) {
        return $this.process({ args, path: this.path })
      }
    })
  }
}
