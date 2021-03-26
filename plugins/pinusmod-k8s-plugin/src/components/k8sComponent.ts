import { IComponent, Application } from 'pinusmod';
import * as dns from 'dns';

export class K8sComponent implements IComponent {
    name = 'K8sComponent';
    timer: NodeJS.Timer;

    constructor(private readonly app: Application, opts: any) {}

    start() {
        this.timer = setInterval(
            this.updateServersConfig.bind(this),
            30 * 1000,
        );
    }

    stop() {
        clearInterval(this.timer);
    }

    private updateServersConfig() {
        const servers = this.app.get('servers');
        for (const serverType in servers) {
            for (const server of servers[serverType]) {
                if (server.svc) {
                    this.doUpdateConfig(serverType, server);
                }
            }
        }
    }

    private doUpdateConfig(serverType: string, serverConfig: any) {
        const { svc } = serverConfig;
        dns.lookup(svc, { all: true }, (err, addresses) => {
            if (err) {
                return;
            }
            const servers = this.app.getServers();
            const aliveServers: string[] = [];
            for (const { address } of addresses) {
                // 用 ip 作为 server id
                const id = address;
                const server = servers[id];
                if (server) {
                    server.host = address;
                } else {
                    servers[id] = {
                        ...serverConfig,
                        id,
                        host: address,
                    };
                }
                aliveServers.push(address);
                // todo 是否要 emit 一个事件？
            }
            // 删掉死亡的进程
            for (const id in servers) {
                if (
                    servers[id].serverType == serverType &&
                    !aliveServers.includes(id)
                ) {
                    delete servers[id];
                }
            }
        });
    }
}
