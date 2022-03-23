const { pinus } = require('pinusmod');
const kcpconnector = require('pinusmod-kcp2');
const path = require('path');
const { getLogger } = require('pinusmod-logger');
let logger = getLogger('pinus', path.basename(__filename));
require('reflect-metadata');

// 捕获普通异常
process.on('uncaughtException', function (err) {
    console.error('Caught exception: ' + err.stack);
});

// 捕获async异常
process.on('unhandledRejection', function (reason, p) {
    console.error('Caught Unhandled Rejection at:' + p + 'reason:' + reason.stack);
});

/**
 * Init app for client.
 */
const app = pinus.createApp();

app.set('name', 'pinusmod-kcp-example');

app.configure('all', 'connector', function () {
    // app.use(protobufPlugin, {protobuf:{}});
    app.set('connectorConfig', {
        connector: kcpconnector.Connector,
        app,
        // kcp options
        sndwnd: 64,
        rcvwnd: 64,
        nodelay: 1,
        interval: 10,
        resend: 2,
        nc: 1,
        heartbeat: 8,
        timeout: 20, // 心跳超时 20s 断线
        useDict: false,
        useProtobuf: false,
        heartbeatOnData: false,
        // fec
        dataShards: 4,
        parityShards: 1,
    });
});

// start app
app.start();
