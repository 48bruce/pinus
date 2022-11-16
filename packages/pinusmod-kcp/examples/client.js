const { PinusKcpClient } = require('./pinusKcpClient');

(async function () {
    console.log('client started');
    const client = new PinusKcpClient({
        host: '127.0.0.1',
        port: 22334,
        conv: 255,
        stream: 1,
        dataShards: 0,
        parityShards: 1,
    });
    console.log('connecting');
    await client.connect();
    for (let i = 0; i < 1000; i++) {
        console.log('send msg');
        const rand = Math.floor(Math.random() * 3000);
        const buff = Buffer.allocUnsafe(rand).fill(65 + i%26);
        const result = await client.request('connector.connHandler.echo', { hi: buff.toString() });
        console.log('response', result);
    }
    console.log('client finish');
})();