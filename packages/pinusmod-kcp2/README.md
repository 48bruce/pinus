pinus-kcp
============

[![Build Status][1]][2]

[1]: https://api.travis-ci.org/leenjewel/node-kcp.svg?branch=master
[2]: https://travis-ci.org/leenjewel/node-kcp


[KCP Protocol](https://github.com/skywind3000/kcp) for [Pinus](https://github.com/node-pinus/pinus)

说明
============

[pomelo-kcp](https://www.npmjs.com/package/pomelo-kcp) 的 TypeScript 版本

结合 [Pinus](https://github.com/node-pinus/pinus) 使用

====

修改自 [pomelo-kcp](https://www.npmjs.com/package/pomelo-kcp)

原本是所有连接共用一个 conv

改为根据客户端发来的消息的 conv 创建对应的 kcpsocket 对象

方便跟 tcp 连接相互配合着使用，参见 [kcp 的 wiki](https://github.com/skywind3000/kcp/wiki/Cooperate-With-Tcp-Server)

## 安装

```sh
npm install pinus-kcp
```

## 使用

```typescript
import * as kcpconnector from 'pinus-kcp';

app.configure('production|development', 'connector', function () {
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
    });
});
```

## 运行测试
### server
```sh
lerna bootstrap
cd packages/pinusmod-kcp/examples
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
