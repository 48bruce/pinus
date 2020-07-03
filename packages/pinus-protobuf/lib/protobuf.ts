import { Root } from 'protobufjs';

const SERVER = 'server';
const CLIENT = 'client';

export interface ArgsProtobufComponent {
    serverProtos?: string;
    clientProtos?: string;
}

export interface ObjectProtos {
    server?: any;
    client?: any;
    version?: number;
}

export class Protobuf {

    watchers: { [type: string]: any };
    serverProtosPath: string;
    clientProtosPath: string;
    serverProtoRoot: Root;
    clientProtoRoot: Root;
    serverProtos: any;
    clientProtos: any;

    constructor(opts: {
        encoderProtos: any, decoderProtos: any,
        encoderCacheSize?: number, decodeCheckMsg?: boolean
    }) {
        const { encoderProtos, decoderProtos } = opts;
        this.setProtos(
            SERVER,
            encoderProtos,
        );
        this.setProtos(
            CLIENT,
            decoderProtos,
        );

        this.serverProtoRoot = Root.fromJSON(this.serverProtos);
        this.clientProtoRoot = Root.fromJSON(this.clientProtos)
    }

    setProtos(type: 'server' | 'client', protos: any): void {
        if (type === SERVER) {
            this.serverProtos = protos;
        }
        if (type === CLIENT) {
            this.clientProtos = protos;
        }
    }

    normalizeRoute(route: string): string {
        return route.split('.').join('');
    }

    encode(route: string, message: { [key: string]: any }): Uint8Array {
        route = this.normalizeRoute(route);
        const ProtoMessage = this.serverProtoRoot.lookupType(route);
        if (!ProtoMessage) {
            throw Error('not such route ' + route);
        }
        const errMsg = ProtoMessage.verify(message);
        if (errMsg) {
            throw Error(errMsg);
        }
        const msg = ProtoMessage.create(message);
        return ProtoMessage.encode(msg).finish();
    }

    encode2Bytes(key: string, msg: object) {
        let buffer = Buffer.from(this.encode(key, msg));
        if (!buffer || !buffer.length) {
            console.warn('encode msg failed! key : %j, msg : %j', key, msg);
            return null;
        }
        let bytes = new Uint8Array(buffer.length);
        for (let offset = 0; offset < buffer.length; offset++) {
            bytes[offset] = buffer.readUInt8(offset);
        }

        return bytes;
    }

    encodeStr(key: string, msg: object, code: string) {
        code = code || 'base64';
        let buffer = Buffer.from(this.encode(key, msg));
        return !!buffer ? buffer.toString(code) : buffer;
    }

    decode(route: string, message: Buffer): any {
        route = this.normalizeRoute(route);
        const ProtoMessage = this.clientProtoRoot.lookupType(route);
        if (!ProtoMessage) {
            throw Error('not such route ' + route);
        }
        const msg = ProtoMessage.decode(message);
        return ProtoMessage.toObject(msg);
    }

    decodeStr(key: string, str: string, code: string) {
        code = code || 'base64';
        let buffer = Buffer.from(str, code);
        return !!buffer ? this.decode(key, buffer) : buffer;
    }

    setEncoderProtos(protos: any) {
        this.serverProtos = protos;
    }

    setDecoderProtos(protos: any) {
        this.clientProtos = protos;
    }
}