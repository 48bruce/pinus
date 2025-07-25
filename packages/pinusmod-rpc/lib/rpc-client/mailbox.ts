/**
 * Default mailbox factory
 */
import {create as mqttCreateMailBox} from './mailboxes/mqtt-mailbox';
import {create as tcpMailBoxCreate} from './mailboxes/tcp-mailbox';
import {Tracer} from '../util/tracer';

export interface MailBoxTimeoutCallback {
    (tracer: Tracer , err: Error , resp ?: any): void;
}

export interface MailBoxOpts {
    bufferMsg?: boolean;
    keepalive?: number;
    interval?: number;
    timeout?: number;
    context?: any;
    pkgSize?: number;
    ping?: number;
    pong?: number;
    // 新增重连相关参数
    enableReconnect?: boolean;
    reconnectInterval?: number;
    maxReconnectAttempts?: number;
}

export interface MailBoxMessage {
    service: string;
    method: string;
    args: any[];
}

export interface IMailBox {
    close(): void;
    send(tracer: Tracer, msg: MailBoxMessage, opts: any, cb: MailBoxTimeoutCallback): void;
    on(event: 'close', listener: (serverid: string) => void): this;
    connect(tracer: Tracer, cb: (err?: Error) => void): void;
}

export interface IMailBoxFactory {
    (serverInfo: {id: string, host: string, port: number}, opts: MailBoxOpts): IMailBox;
}

export interface MailBoxPkg {
    id: string & number;
    resp: any;
    source: string;
    seq: number;
}

/**
 * default mailbox factory
 *
 * @param {Object} serverInfo single server instance info, {id, host, port, ...}
 * @param {Object} opts construct parameters
 * @return {Object} mailbox instancef
 */
export const createMqttMailBox = mqttCreateMailBox;
export const createTcpMailBox = tcpMailBoxCreate;
