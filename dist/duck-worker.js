/*!
 * duck-worker v1.0.1
 * (c) 2020-2021 Martin Rafael Gonzalez <tin@devtin.io>
 * MIT
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var Promise$1 = require('bluebird');
var jsDirIntoJson = require('js-dir-into-json');
var duckfficerMethod = require('duckfficer-method');
var ipc = require('node-ipc');
var pkgUp = require('pkg-up');
var duckStorage = require('duck-storage');
var mongodb = require('duck-storage-mongodb');
var DeepProxy = require('proxy-deep');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var Promise__default = /*#__PURE__*/_interopDefaultLegacy(Promise$1);
var ipc__default = /*#__PURE__*/_interopDefaultLegacy(ipc);
var pkgUp__default = /*#__PURE__*/_interopDefaultLegacy(pkgUp);
var mongodb__default = /*#__PURE__*/_interopDefaultLegacy(mongodb);
var DeepProxy__default = /*#__PURE__*/_interopDefaultLegacy(DeepProxy);

const getAppName = async () => {
  const nearestPackageJson = await pkgUp__default['default']();
  const packageName = nearestPackageJson ? require(nearestPackageJson).name : 'unknown';
  return `duck-worker_${packageName}.`
};

const { Utils } = duckStorage.Duckfficer;

const resolveValue = async (value) => {
  if (typeof value === 'function') {
    return value()
  }

  return value
};

const loggerSetup = async () => {
  const storage = await new duckStorage.DuckStorageClass({ setupIpc: false, plugins: [mongodb__default['default']()] });
  const eventsDuck = new duckStorage.Duck({
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
  });
  const eventsRack = await new duckStorage.DuckRack('worker_event', { duckModel: eventsDuck });
  await storage.registerRack(eventsRack);

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
      console.log('error logging event', { space, requestId, data }, err);
    }
  }
};

const setupIpc = async ({ appName, id }) => {
  const appspace = await resolveValue(appName);

  Object.assign(ipc__default['default'].config, {
    appspace,
    id,
    silent: true
  });

  return new Promise((resolve, reject) => {
    ipc__default['default'].serve(() => {
      resolve(ipc__default['default'].server);
    });

    setTimeout(() => reject(new Error('ipc time out')), 5000);

    ipc__default['default'].server.start();
  })
};

const execute = async ({ data, socket, workers }) => {
  const answer = ({ error, result }) => {
    ipc__default['default'].server.emit(
      socket,
      data.id,
      {
        error,
        result
      }
    );

    return { error, result }
  };

  const executeAndAnswer = (executer) => {
    const getPayload = async () => {
      return executer()
    };
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
  };

  const worker = data.path.join('.');

  if (!worker) {
    return answer({ error: 'worker name is required' })
  }

  const workerHandler = Utils.find(workers, worker);

  if (typeof workerHandler !== 'function') {
    return answer({ error: `worker "${worker}" not found` })
  }

  return executeAndAnswer(() => workerHandler(...data.args))
};

/**
 * @param {String} [appName=<package.json->name>] - the appName (defaults to project's package.json name)
 * @param {Object} workers - workers object mapping to functions
 * @param {String} [id=worker] - worker id
 * @return {Promise<ipc.server>}
 */
async function duckWorkerIpc ({ appName = getAppName, workers, id = 'worker' } = {}) {
  await setupIpc({ appName, id });
  const log = await loggerSetup();

  // handler
  ipc__default['default'].server.on('execute', (data, socket) => {
    const space = 'execute';
    const requestId = data.id;

    const logRequest = () => log({
      space,
      flow: 'request',
      requestId,
      data
    });

    logRequest()
      .then(() => execute({ data, socket, workers }))
      .then((response) => {
        return log({
          space,
          flow: 'response',
          requestId,
          data: response
        })
      });
  });

  return ipc__default['default'].server
}

const getWorkersFromRaw = async (rawWorkers) => {
  const workers = {};

  await Promise__default['default'].each(Object.entries(rawWorkers), async ([workerName, workerDuckfficerMethod]) => {
    if (workerDuckfficerMethod.handler) {
      workers[workerName] = await duckfficerMethod.duckfficerMethod(workerDuckfficerMethod);
    } else {
      workers[workerName] = await getWorkersFromRaw(workerDuckfficerMethod);
    }
  });

  return workers
};

/**
 * @param {String} workerDir - the worker dir
 * @return {exports<void>}
 */
async function duckWorker ({
  workerDir
}) {
  const workersRaw = await jsDirIntoJson.jsDirIntoJson(path__default['default'].resolve(process.cwd(), workerDir), {
    fileLoader: require('esm')(module)
  });
  const workers = await getWorkersFromRaw(workersRaw);
  await duckWorkerIpc({
    workers
  });
}

function uuid () {
  // GUID / UUID RFC4122 version 4 taken from: https://stackoverflow.com/a/2117523/1064165
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);

    return v.toString(16)
  })
}

const ipcConnect = async ({ appSpace, clientId, workerId }) => {
  Object.assign(ipc__default['default'].config, {
    appspace: appSpace || await getAppName(),
    id: clientId,
    silent: true
  });

  return new Promise((resolve) => {
    ipc__default['default'].connectTo(workerId, () => {
      resolve(ipc__default['default'].of[workerId]);
    });
  })
};

const ipcDisconnect = async ({ workerId}) => {
  return new Promise((resolve, reject) => {
    ipc__default['default'].of[workerId].on('disconnect', resolve);
    setTimeout(() => reject(new Error('ipc disconnec time-out')), 3000);
    ipc__default['default'].disconnect(workerId);
  })
};

class DuckWorkerClient {
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
      this.clientId = clientId;
      this.workerId = workerId;
      this.ipc = await ipcConnect({ appSpace, clientId, workerId });
      return this.proxy()
    })()
  }

  process ({ args, path }) {
    return new Promise((resolve, reject) => {
      const id = uuid();
      this.ipc.on(id, ({ error, result }) => {
        if (error) {
          return reject(new Error(error))
        }

        resolve(result);
      });
      this.ipc.emit('execute', {
        id,
        path,
        args
      });
    })
  }

  proxy () {
    const $this = this;
    const disconnect = () => {
      return ipcDisconnect({ workerId: this.workerId })
    };
    return new DeepProxy__default['default']({}, {
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

exports.DuckWorkerClient = DuckWorkerClient;
exports.duckWorker = duckWorker;
exports.duckWorkerIpc = duckWorkerIpc;
