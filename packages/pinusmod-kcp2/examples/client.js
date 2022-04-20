const { PinusKcpClient } = require('./pinusKcpClient');
const { host, port, conv, dataShards, parityShards, block } = require('./common');

(async function () {
    console.log('client started');
    const client = new PinusKcpClient({
        host,
        port,
        conv,
        dataShards,
        parityShards,
        block,
    });
    console.log('connecting');
    await client.connect();
    for (let i = 0; i < 10; i++) {
        const msg = { hi: i };
        console.log('send:', msg);
        const result = await client.request('connector.connHandler.echo', msg);
        console.log('resp:', result);
    }
    console.log('client finish');
})();
