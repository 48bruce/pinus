# 关于 pinusmod

pinusmod 是 [pinus](https://github.com/node-pinus/pinus) 的修改自用版

与 pinus 的区别在于

* 内置 protobuf.js，不再使用原本的 pinus-protobuf，支持 bool 和 64 位整型。
* 出于性能考虑，编译选项关掉了 sourcemap，在生产环境不需要。
* pinusmod-kcp 提供 kcp 支持，用于注重实时性的游戏开发。

需要 nodejs 版本 >= v14