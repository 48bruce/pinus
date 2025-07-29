/**
 * EnhancedMqttClient 使用示例
 * 展示如何使用增强版MQTT客户端的各种功能
 */
import { EnhancedMqttClient, EnhancedMqttClientOpts } from './enhancedMqttClient';
import { getLogger } from 'pinusmod-logger';
import * as path from 'path';

let logger = getLogger('pinus-admin', path.basename(__filename));

/**
 * 基础使用示例
 */
export function basicUsageExample() {
    const opts: EnhancedMqttClientOpts = {
        id: 'test-client-001',
        maxReconnectAttempts: 30,
        reconnectAttemptResetTime: 3 * 60 * 1000, // 3分钟
        networkCheckInterval: 20 * 1000, // 20秒
        enableNetworkDetection: true
    };

    const client = new EnhancedMqttClient(opts);

    // 监听连接事件
    client.on('connect', () => {
        logger.info('Client connected successfully');
    });

    client.on('reconnect', () => {
        logger.info('Client reconnected successfully');
    });

    client.on('disconnect', (id) => {
        logger.warn('Client disconnected: %s', id);
    });

    client.on('max_reconnect_attempts_reached', () => {
        logger.error('Max reconnect attempts reached, client stopped trying');
    });

    // 连接服务器
    client.connect('localhost', 3010);

    return client;
}

/**
 * 高级配置示例
 */
export function advancedUsageExample() {
    const opts: EnhancedMqttClientOpts = {
        id: 'advanced-client-001',
        maxReconnectAttempts: 100, // 更多重连尝试
        reconnectAttemptResetTime: 10 * 60 * 1000, // 10分钟重置
        networkCheckInterval: 15 * 1000, // 15秒检查网络
        enableNetworkDetection: true,
        reconnectDelayMax: 120 * 1000, // 最大重连延迟2分钟
        timeout: 10 * 1000, // 连接超时10秒
        keepalive: 30 * 1000 // 心跳间隔30秒
    };

    const client = new EnhancedMqttClient(opts);

    // 监听重连统计信息
    setInterval(() => {
        const stats = client.getReconnectStats();
        logger.info('Reconnect stats: %j', stats);
    }, 60000); // 每分钟输出一次统计信息

    // 监听连接事件
    client.on('connect', () => {
        logger.info('Advanced client connected');

        // 发送测试消息
        client.send('test/topic', {
            message: 'Hello from enhanced client',
            timestamp: Date.now()
        });
    });

    client.on('reconnect', () => {
        logger.info('Advanced client reconnected');
    });

    client.on('max_reconnect_attempts_reached', () => {
        logger.error('Advanced client reached max reconnect attempts');
        // 可以在这里实现告警通知
    });

    // 连接服务器
    client.connect('localhost', 3010);

    return client;
}

/**
 * 监控和调试示例
 */
export function monitoringExample() {
    const client = new EnhancedMqttClient({
        id: 'monitor-client-001',
        maxReconnectAttempts: 50,
        enableNetworkDetection: true
    });

    // 实时监控重连状态
    const monitorInterval = setInterval(() => {
        const stats = client.getReconnectStats();

        if (stats.reconnectAttempts > 0) {
            logger.info('=== Reconnect Monitoring ===');
            logger.info('Attempts: %d/%d', stats.reconnectAttempts, stats.maxReconnectAttempts);
            logger.info('Strategy: %s', stats.currentStrategy);
            logger.info('Network: %s', stats.isNetworkAvailable ? 'Available' : 'Unavailable');
            logger.info('Consecutive Failures: %d', stats.consecutiveFailures);
            logger.info('Time since last connect: %d ms', stats.timeSinceLastConnect);
            logger.info('===========================');
        }
    }, 5000); // 每5秒检查一次

    // 监听事件
    client.on('connect', () => {
        logger.info('Monitor client connected');
    });

    client.on('reconnect', () => {
        logger.info('Monitor client reconnected');
    });

    client.on('disconnect', (id) => {
        logger.warn('Monitor client disconnected: %s', id);
    });

    // 连接服务器
    client.connect('localhost', 3010);

    // 返回清理函数
    return {
        client,
        cleanup: () => {
            clearInterval(monitorInterval);
            client.disconnect();
        }
    };
}

/**
 * 网络恢复测试示例
 */
export function networkRecoveryTest() {
    const client = new EnhancedMqttClient({
        id: 'recovery-test-client',
        maxReconnectAttempts: 20,
        networkCheckInterval: 10 * 1000, // 10秒检查网络
        enableNetworkDetection: true
    });

    client.on('connect', () => {
        logger.info('Recovery test client connected');
    });

    client.on('reconnect', () => {
        logger.info('Recovery test client reconnected');
    });

    // 模拟网络中断和恢复
    setTimeout(() => {
        logger.info('Simulating network interruption...');
        // 这里可以模拟网络中断
    }, 30000); // 30秒后模拟网络中断

    client.connect('localhost', 3010);

    return client;
}

/**
 * 批量客户端测试
 */
export function batchClientTest() {
    const clients: EnhancedMqttClient[] = [];
    const clientCount = 5;

    for (let i = 0; i < clientCount; i++) {
        const client = new EnhancedMqttClient({
            id: `batch-client-${i + 1}`,
            maxReconnectAttempts: 25,
            networkCheckInterval: 25 * 1000, // 错开网络检查时间
            enableNetworkDetection: true
        });

        client.on('connect', () => {
            logger.info('Batch client %d connected', i + 1);
        });

        client.on('reconnect', () => {
            logger.info('Batch client %d reconnected', i + 1);
        });

        client.connect('localhost', 3010);
        clients.push(client);
    }

    // 返回批量清理函数
    return {
        clients,
        cleanup: () => {
            clients.forEach(client => client.disconnect());
        }
    };
}
