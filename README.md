<div><h1>duck-worker</h1></div>

<p>
    <a href="https://www.npmjs.com/package/duck-worker" target="_blank"><img src="https://img.shields.io/npm/v/duck-worker.svg" alt="Version"></a>
<a href="http://opensource.org/licenses" target="_blank"><img src="http://img.shields.io/badge/License-MIT-brightgreen.svg"></a>
</p>

<p>
    duckfficer service worker that serves an ipc bridge for communication
</p>

## Installation

```sh
$ npm i duck-worker --save
# or
$ yarn add duck-worker
```

## Features

- [duck worker client success](#duck-worker-client-success)
- [duck worker client fail](#duck-worker-client-fail)
- [duck worker provides ipc interface](#duck-worker-provides-ipc-interface)
- [loads workers from folder](#loads-workers-from-folder)


<a name="duck-worker-client-success"></a>

## duck worker client success


```js
const client = await new DuckWorkerClient()
t.is(await client.workerA('some payload'), 'received: some payload')
```

<a name="duck-worker-client-fail"></a>

## duck worker client fail


```js
const client = await new DuckWorkerClient()
await t.throwsAsync(() => client.workerB('some error'), {
  instanceOf: Error,
  message: 'some error'
})
```

<a name="duck-worker-provides-ipc-interface"></a>

## duck worker provides ipc interface


```js
ipc.connectTo('worker')
return new Promise((resolve) => {
  ipc.of['worker'].on('pong', () => {
    t.pass()
    resolve()
  })
  ipc.of['worker'].emit('ping')
})
```

<a name="loads-workers-from-folder"></a>

## loads workers from folder


```js
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
```


<br><a name="DuckWorkerClient"></a>

### DuckWorkerClient

<br><a name="new_DuckWorkerClient_new"></a>

#### new DuckWorkerClient(appSpace, [clientId], [workerId])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| appSpace | <code>String</code> |  | default to local package.json->name |
| [clientId] | <code>String</code> | <code>client</code> |  |
| [workerId] | <code>String</code> | <code>worker</code> |  |

**Returns**: <code>Promise.&lt;{Object}&gt;</code> - the proxy to communicate with the worker  

<br><a name="duckWorkerIpc"></a>

### duckWorkerIpc([appName], workers, [id]) ⇒ <code>Promise.&lt;ipc.server&gt;</code>

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [appName] | <code>String</code> | <code>&lt;package.json-&gt;name&gt;</code> | the appName (defaults to project's package.json name) |
| workers | <code>Object</code> |  | workers object mapping to functions |
| [id] | <code>String</code> | <code>worker</code> | worker id |


<br><a name="duckWorker"></a>

### duckWorker(workerDir) ⇒ <code>exports.&lt;void&gt;</code>

| Param | Type | Description |
| --- | --- | --- |
| workerDir | <code>String</code> | the worker dir |


* * *

### License

[MIT](https://opensource.org/licenses/MIT)

&copy; 2020-present Martin Rafael Gonzalez <tin@devtin.io>
