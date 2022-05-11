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
import * as path from 'path';
import { getLogger } from 'pinusmod-logger';
let logger = getLogger('pinus', path.basename(__filename));
import { EventEmitter } from 'events';
import { UDPSession } from 'kcpjs';
import * as pinuscoder from './pinuscoder';
import * as protocol from 'pinusmod-protocol';
const Package = protocol.Package;
import { ISocket } from '../interfaces/ISocket';
import { NetState } from '../const/const';

export class KcpSocket extends EventEmitter implements ISocket {
    id: number;
    sess: UDPSession;
    host: string;
    port: number;
    remoteAddress: any;
    opts: any;
    state: number;
    _initTimer: NodeJS.Timer | null;
    heartbeatOnData: boolean;

    dataShards: number;
    parityShards: number;
    headerSize: number;

    constructor(id: number, sess: UDPSession, opts: any) {
        super();
        this.id = id;
        this.sess = sess;
        this.host = sess.host;
        this.port = sess.port;
        this.remoteAddress = {
            ip: this.host,
            port: this.port
        };
        this.opts = opts;
        const conv = opts.conv || 123;

        this.headerSize = 0;
        if (!!opts) {
            this.heartbeatOnData = !!opts.heartbeatOnData;
            const nodelay = opts.nodelay || 0;
            const interval = opts.interval || 100;
            const resend = opts.resend || 0;
            const nc = opts.nc || 0;
            this.sess.setNoDelay(nodelay, interval, resend, nc)

            const sndwnd = opts.sndwnd || 32;
            const rcvwnd = opts.rcvwnd || sndwnd;
            this.sess.setWindowSize(sndwnd, rcvwnd);

            const mtu = opts.mtu || 1400;
            this.sess.setMtu(mtu);
        }
        const thiz = this;
        this.sess.on('recv', (buff: Buffer) => {
            pinuscoder.handlePackage(thiz, buff);
        });

        this.state = NetState.INITED;

        // 超时还未握手就绪，就删除此 socket
        this._initTimer = setTimeout(() => {
            if (this.state !== NetState.WORKING) {
                this.disconnect();
            }
            this._initTimer = null;
        }, 5000);
    }

    send(msg: any) {
        if (this.state != NetState.WORKING) {
            return;
        }
        if (typeof msg === 'string') {
            msg = Buffer.from(msg);
        } else if (!(msg instanceof Buffer)) {
            msg = Buffer.from(JSON.stringify(msg));
        }
        this.sendRaw(Package.encode(Package.TYPE_DATA, msg));
    }

    sendRaw(msg: Buffer) {
        if (!this.sess) {
            return;
        }
        this.sess.write(msg);
    }

    sendForce(msg: Buffer) {
        if (this.state == NetState.CLOSED) {
            return;
        }
        this.sendRaw(msg);
    }

    sendBatch(msgs: Buffer[]) {
        if (this.state != NetState.WORKING) {
            return;
        }
        const rs = [];
        for (let i = 0; i < msgs.length; i++) {
            rs.push(Package.encode(Package.TYPE_DATA, msgs[i]));
        }
        this.sess.writeBuffers(rs);
    }

    handshakeResponse(resp: Buffer) {
        if (this.state !== NetState.INITED) {
            return;
        }
        this.sendRaw(resp);
        this.state = NetState.WAIT_ACK;
    }

    disconnect() {
        if (this.state == NetState.CLOSED) {
            return;
        }
        this.state = NetState.CLOSED;
        this.emit('disconnect', 'kcp connection disconnected');
        if (this.sess) {
            this.sess.close();
            this.sess = null;
        }
    }
}