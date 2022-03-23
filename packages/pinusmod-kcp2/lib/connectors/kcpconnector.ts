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

import { EventEmitter } from 'events';
import { KcpSocket } from './kcpsocket';
import * as pinuscoder from './pinuscoder';
import { IConnector, DictionaryComponent, ProtobufComponent, IComponent, pinus } from 'pinusmod';
import * as coder from '../common/coder';
import { ListenWithOptions } from 'kcpjs';

let curId = 1;

export class Connector extends EventEmitter {
    opts: any;
    host: string;
    port: number;
    useDict: boolean;
    useProtobuf: boolean;
    dataShards: number;
    parityShards: number;
    clientsForKcp: { [conv: number]: KcpSocket };
    connector: IConnector;
    dictionary: DictionaryComponent;
    protobuf: ProtobufComponent;
    decodeIO_protobuf: IComponent;

    constructor(port: number, host: string, opts: any) {
        super();
        this.opts = opts || {};
        this.host = host;
        this.port = port;
        this.useDict = opts.useDict;
        this.useProtobuf = opts.useProtobuf;
        this.dataShards = opts.dataShards || 0;
        this.parityShards = opts.parityShards || 0;
        this.clientsForKcp = {};
    }

    start(cb: () => void) {
        const app = this.opts.app || pinus.app;
        this.connector = app.components.__connector__.connector;
        this.dictionary = app.components.__dictionary__;
        this.protobuf = app.components.__protobuf__;
        this.decodeIO_protobuf = app.components.__decodeIO__protobuf__;

        this.on('disconnect', (kcpsocket) => {
            const conv = kcpsocket.opts.conv;
            delete this.clientsForKcp[conv];
        });

        ListenWithOptions(this.port, undefined, this.opts.dataShards, this.opts.parityShards, (sess) => {
            const conv = sess.getConv();
            let kcpsocket = this.clientsForKcp[conv];
            if (!kcpsocket) {
                kcpsocket = new KcpSocket(curId++, sess, '', 0, {...this.opts,conv});
                pinuscoder.setupHandler(this, kcpsocket, this.opts);
                this.clientsForKcp[conv] = kcpsocket;
                this.emit('connection', kcpsocket);
            } 
        });
        process.nextTick(cb);
    }
/*
    bindSocket(socket: dgram.Socket, address: string, port: number, msg?: any) {
        let conv, kcpsocket: KcpSocket | undefined;
        const isFec = this.opts.dataShards && this.opts.parityShards;
        const reserved = isFec ? fecHeaderSizePlus2 : 0;
        if (msg) {
            const kcpHead = pinuscoder.kcpHeadDecode(msg, reserved);
            conv = kcpHead.conv;
            kcpsocket = this.clientsForKcp[conv];
        }
        if (!kcpsocket && conv) {
            kcpsocket = new KcpSocket(curId++, socket, address, port, Object.assign({ conv }, this.opts));
            pinuscoder.setupHandler(this, kcpsocket, this.opts);
            this.clientsForKcp[conv] = kcpsocket;
            this.emit('connection', kcpsocket);
        }
        if (!!msg && !!kcpsocket) {
            kcpsocket.emit('input', msg);
        }
    }
*/
    static decode(msg: Buffer | string) {
        return coder.decode.bind(this)(msg);
    }

    decode(msg: Buffer | string) {
        return Connector.decode(msg);
    }

    static encode(reqid: number, route: string, msg: any) {
        return coder.encode.bind(this)(reqid, route, msg);
    }

    encode(reqid: number, route: string, msg: any) {
        return Connector.encode(reqid, route, msg);
    }

    stop(force: any, cb: () => void) {
        // if (this.socket) {
        //     this.socket.close();
        // }
        process.nextTick(cb);
    }
}

