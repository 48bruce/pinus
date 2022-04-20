const { AesBlock } = require('kcpjs');

const host = '127.0.0.1';
const port = 22334;
const conv = 255;

// fec
// 两个参数的任意一个设置为0则不启用 fec
const dataShards = 4;
const parityShards = 1;

// 加密
// 设置为空 则不加密
const block = new AesBlock('aes-128-gcm', 'aabbccddeeffgghh', 'aabbccddeeff');

module.exports = {
    host,
    port,
    conv,
    // fec
    dataShards,
    parityShards,
    // 加密
    block,
};
