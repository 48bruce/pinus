const { PinusKcpClient } = require('./pinusKcpClient');

(async function () {
    console.log('client started');
    const client = new PinusKcpClient({
        host: '127.0.0.1',
        port: 22334,
        conv: 255,
        dataShards: 0,
        parityShards: 1,
    });
    console.log('connecting');
    await client.connect();
    for (let i = 0; i < 10; i++) {
        console.log('send msg');
        const result = await client.request('connector.connHandler.echo', { hi: i });
        console.log('response', result);
    }
    console.log('client finish');
})();