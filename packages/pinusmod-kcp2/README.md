pinus-kcp
============

[![Build Status][1]][2]

[1]: https://api.travis-ci.org/leenjewel/node-kcp.svg?branch=master
[2]: https://travis-ci.org/leenjewel/node-kcp


[KCP Protocol](https://github.com/skywind3000/kcp) for [Pinus](https://github.com/node-pinus/pinus)

说明
============

基于 [kcpjs](https://www.npmjs.com/package/kcpjs) 实现的 pinus kcp connector

相比于 pinusmod-kcp，这个版本额外提供了 fec前向纠错 和 加密 两个新特性

## 安装

```sh
npm install pinusmod-kcp2
```

## 使用

```typescript
import * as kcpconnector from 'pinusmod-kcp2';
import { AesBlock } from 'kcpjs';

app.configure('production|development', 'connector', function () {
    const algorithm = 'aes-128-gcm';
    const key = 'aabbccddeeffgghh';
    const iv = 'aabbccddeeff';

    app.set('connectorConfig', {
        connector: kcpconnector.Connector,
        // kcp options
        sndwnd: 64,
        rcvwnd: 64,
        nodelay: 1,
        interval: 10,
        resend: 2,
        nc: 1,
        // 1.0 新增参数
        // 每次处理 package 时都刷新心跳，避免收不到心跳包的情况下掉线的问题
        // 这个值默认是 false
        heartbeatOnData: true,  
        dataShards: 8,
        parityShards: 2,
        block: new AesBlock(algorithm, key, iv),
    });
});
```

## 运行测试
### server
```sh
lerna bootstrap
cd packages/pinusmod-kcp2/examples
# 启动
yarn runserver
# 查看
yarn listserver
# 停止
yarn stopserver
```
### client
```sh
yarn runclient
# ctrl + c 停止客户端
```
