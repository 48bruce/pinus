/**
 * Copyright 2016 leenjewel
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import handler from '../common/handler';
import * as Kick from '../commands/kick';
import { HandshakeCommand } from '../commands/handshake';
import { HeartbeatCommand } from '../commands/heartbeat';
import { Protocol, Package, Message } from 'pinusmod-protocol';
import { Protobuf } from 'pinusmod-protobuf';
import { ISocket } from '../interfaces/ISocket';

const RES_OK = 200;
let protobuf: any;

export const setupHandler = function (connector: any, socket: any, opts: any) {
    connector.handshake = connector.handshake || new HandshakeCommand(opts);
    if (!connector.heartbeat) {
        if (!opts.heartbeat) {
            opts.heartbeat = opts.interval / 1000;
            opts.timeout = opts.heartbeat * 2;
        }
        if (opts.heartbeat * 1000 < opts.interval) {
            console.warn('heartbeat interval must longer than kcp interval');
            opts.heartbeat = opts.interval / 1000;
        }
        if (opts.timeout * 1000 < 2 * opts.interval) {
            console.warn('timeout must longer than kcp interval * 2');
            opts.timeout = opts.heartbeat * 2;
        }
        connector.heartbeat = new HeartbeatCommand(Object.assign(opts, { disconnectOnTimeout: true }));
    }
    socket.on('handshake', connector.handshake.handle.bind(connector.handshake, socket));
    socket.on('heartbeat', connector.heartbeat.handle.bind(connector.heartbeat, socket));
    socket.on('heartbeatreset', connector.heartbeat.reset.bind(connector.heartbeat, socket));
    socket.on('disconnect', connector.heartbeat.clear.bind(connector.heartbeat, socket.id));
    socket.on('disconnect', connector.emit.bind(connector, 'disconnect', socket));
    socket.on('closing', Kick.handle.bind(null, socket));
};

export const handlePackage = function (socket: ISocket, buff: Buffer) {
    if (!buff) {
        return;
    }
    const pkg = Package.decode(buff);
    if (Array.isArray(pkg)) {
        for (let p in pkg) {
            if (pkg[p].type == 6) {
                return;
            }
            handler(socket, pkg[p]);
        }
    } else {
        if (pkg.type == 6) {
            return;
        }
        handler(socket, pkg);
    }
};

let heartbeatInterval = 0;
export const getHeartbeatInterval = function () { return heartbeatInterval; };
let heartbeatTimeout = 0;
export const getHeartbeatTimeout = function () { return heartbeatTimeout; };
let pomeloCoderData: { dict: any, abbrs: any, protos: any } = { dict: null, abbrs: null, protos: null };
export const initProtocol = function (data: any) {
    if (!!data) {
        if (data.code !== RES_OK) {
            console.warn('Handshake response code : ' + data.code);
            return;
        }
        if (!data || !data.sys) {
            console.warn('Handshake response sys is undefained');
            return;
        }
        if (!!data.sys && !!data.sys.heartbeat) {
            heartbeatInterval = data.sys.heartbeat * 1000;
            heartbeatTimeout = heartbeatInterval * 2;
        }
        let dict = data.sys.dict;
        let protos = data.sys.protos;
        if (!!dict) {
            pomeloCoderData.dict = dict;
            pomeloCoderData.abbrs = {};

            for (let route in dict) {
                pomeloCoderData.abbrs[dict[route]] = route;
            }
        }
        if (!!protos) {
            pomeloCoderData.protos = {
                server: protos.server || {},
                client: protos.client || {}
            };
            if (!!Protobuf) {
                protobuf = new Protobuf({
                    encoderProtos: protos.client,
                    decoderProtos: protos.server
                });
            }
        }
    }
};

export const handshakePackage = function (userdata: object) {
    userdata = userdata || {};
    return (Package.encode(
        Package.TYPE_HANDSHAKE,
        Protocol.strencode(JSON.stringify({
            sys: {
                version: '1.1.1',
                type: 'socket'
            },
            user: userdata
        }))
    ));
};

let pomeloHandshakeAckPkg = Package.encode(Package.TYPE_HANDSHAKE_ACK);
export const handshakeAckPackage = function () {
    return pomeloHandshakeAckPkg;
};

let pomeloHeartbeatPkg = Package.encode(Package.TYPE_HEARTBEAT);
export const heartbeatPackage = function () {
    return pomeloHeartbeatPkg;
};

export const messagePackage = function (reqid: number, route: string, msg: any) {
    let type = reqid ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;
    let protos = !!pomeloCoderData.protos ? pomeloCoderData.protos.client : {};
    if (!!protos[route]) {
        msg = protobuf.encode(route, msg);
    } else {
        msg = Protocol.strencode(JSON.stringify(msg));
    }
    let compressRoute = 0;
    if (!!pomeloCoderData.dict && !!pomeloCoderData.dict[route]) {
        route = pomeloCoderData.dict[route];
        compressRoute = 1;
    }
    msg = Message.encode(reqid, type, !!compressRoute, route, msg);
    return Package.encode(Package.TYPE_DATA, msg);
};

export const isHandshakePackage = function (type: number) {
    return type == Package.TYPE_HANDSHAKE;
}

export const isHandshakeACKPackage = function (type: number) {
    return type == Package.TYPE_HANDSHAKE_ACK;
}

export const isHeartbeatPackage = function (type: number) {
    return type == Package.TYPE_HEARTBEAT;
}

export const isDataPackage = function (type: number) {
    return type == Package.TYPE_DATA;
}

export const isKickPackage = function (type: number) {
    return type == Package.TYPE_KICK;
}

export const kcpHeadDecode = function (bytes: Buffer, reserved = 0) {
    //小端
    const conv = bytes.readUInt32LE(reserved);
    const cmd = bytes.readUInt8(reserved + 4);
    const frg = bytes.readUInt8(reserved + 5);
    const wnd = bytes.readUInt16LE(reserved + 6);
    const ts = bytes.readUInt32LE(reserved + 8);
    const sn = bytes.readUInt32LE(reserved + 12);
    const una = bytes.readUInt32LE(reserved + 16);
    const len = bytes.readUInt32LE(reserved + 20);

    return {
        conv: conv,
        cmd: cmd,
        frg: frg,
        wnd: wnd,
        ts: ts,
        sn: sn,
        una: una,
        len: len
    };
};

export const coders = {
    decodePackage: Package.decode,
    decodeMessage: Message.decode,
};

