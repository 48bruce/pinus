/**
 * EnhancedMqttClient 在 MonitorAgent 中的使用示例
 * 展示如何将增强版MQTT客户端集成到现有的 MonitorAgent 中
 */
import { EnhancedMqttClient, EnhancedMqttClientOpts } from './enhancedMqttClient';
import { MonitorAgentOpts, IMonitorAgentClientFactory } from '../../monitor/monitorAgent';
import { getLogger } from 'pinusmod-logger';
import * as path from 'path';

let logger = getLogger('pinus-admin', path.basename(__filename));

/**
 * 创建增强版 MonitorAgent 客户端工厂函数
 */
export function createEnhancedMonitorAgentClient(opts: MonitorAgentOpts): EnhancedMqttClient {
    const enhancedOpts: EnhancedMqttClientOpts = {
        id: opts.id,
        maxReconnectAttempts: 100, // 生产环境建议设置较大值
        reconnectAttemptResetTime: 10 * 60 * 1000, // 10分钟重置
        networkCheckInterval: 30 * 1000, // 30秒检查网络
        enableNetworkDetection: true,
        reconnectDelayMax: 120 * 1000, // 最大重连延迟2分钟
        timeout: 10 * 1000, // 连接超时10秒
        keepalive: 60 * 1000 // 心跳间隔60秒
    };

    return new EnhancedMqttClient(enhancedOpts);
}

/**
 * 创建生产环境配置的增强客户端工厂
 */
export function createProductionEnhancedMonitorAgentClient(opts: MonitorAgentOpts): EnhancedMqttClient {
    const enhancedOpts: EnhancedMqttClientOpts = {
        id: opts.id,
        maxReconnectAttempts: 200, // 生产环境更多重连尝试
        reconnectAttemptResetTime: 15 * 60 * 1000, // 15分钟重置
        networkCheckInterval: 20 * 1000, // 20秒检查网络
        enableNetworkDetection: true,
        reconnectDelayMax: 300 * 1000, // 最大重连延迟5分钟
        timeout: 15 * 1000, // 连接超时15秒
        keepalive: 45 * 1000 // 心跳间隔45秒
    };

    return new EnhancedMqttClient(enhancedOpts);
}

/**
 * 创建开发环境配置的增强客户端工厂
 */
export function createDevelopmentEnhancedMonitorAgentClient(opts: MonitorAgentOpts): EnhancedMqttClient {
    const enhancedOpts: EnhancedMqttClientOpts = {
        id: opts.id,
        maxReconnectAttempts: 20, // 开发环境较少重连尝试
        reconnectAttemptResetTime: 2 * 60 * 1000, // 2分钟重置
        networkCheckInterval: 10 * 1000, // 10秒检查网络
        enableNetworkDetection: true,
        reconnectDelayMax: 60 * 1000, // 最大重连延迟1分钟
        timeout: 5 * 1000, // 连接超时5秒
        keepalive: 30 * 1000 // 心跳间隔30秒
    };

    return new EnhancedMqttClient(enhancedOpts);
}

/**
 * 创建自定义配置的增强客户端工厂
 */
export function createCustomEnhancedMonitorAgentClient(
    opts: MonitorAgentOpts,
    customConfig: Partial<EnhancedMqttClientOpts>
): EnhancedMqttClient {
    const enhancedOpts: EnhancedMqttClientOpts = {
        id: opts.id,
        maxReconnectAttempts: 50,
        reconnectAttemptResetTime: 5 * 60 * 1000,
        networkCheckInterval: 30 * 1000,
        enableNetworkDetection: true,
        ...customConfig // 允许自定义配置覆盖默认值
    };

    return new EnhancedMqttClient(enhancedOpts);
}

/**
 * 增强版 MonitorAgent 使用示例
 */
export function enhancedMonitorAgentExample() {
    // 模拟 MonitorAgent 配置
    const monitorAgentOpts: MonitorAgentOpts = {
        id: 'enhanced-monitor-001',
        type: 'connector',
        info: {
            id: 'connector-001',
            serverType: 'connector',
            host: '127.0.0.1',
            port: 3010
        },
        consoleService: null as any, // 实际使用时需要真实的 ConsoleService
        monitorAgentClientFactory: createEnhancedMonitorAgentClient
    };

    // 创建增强版客户端
    const client = createEnhancedMonitorAgentClient(monitorAgentOpts);

    // 监听连接事件
    client.on('connect', () => {
        logger.info('Enhanced monitor agent connected successfully');

        // 发送注册消息
        client.send('register', {
            id: monitorAgentOpts.id,
            type: 'monitor',
            serverType: monitorAgentOpts.type,
            pid: process.pid,
            info: monitorAgentOpts.info
        });
    });

    client.on('reconnect', () => {
        logger.info('Enhanced monitor agent reconnected');

        // 重新发送注册消息
        client.send('reconnect', {
            id: monitorAgentOpts.id,
            type: 'monitor',
            serverType: monitorAgentOpts.type,
            pid: process.pid,
            info: monitorAgentOpts.info
        });
    });

    client.on('disconnect', (id) => {
        logger.warn('Enhanced monitor agent disconnected: %s', id);
    });

    client.on('max_reconnect_attempts_reached', () => {
        logger.error('Enhanced monitor agent reached max reconnect attempts');
        // 可以在这里实现告警通知
        sendAlert('Monitor agent connection lost');
    });

    // 启动监控
    startMonitoring(client);

    // 连接服务器
    client.connect('localhost', 3010);

    return client;
}

/**
 * 启动重连监控
 */
function startMonitoring(client: EnhancedMqttClient) {
    // 定期输出重连统计信息
    const monitorInterval = setInterval(() => {
        const stats = client.getReconnectStats();

        if (stats.reconnectAttempts > 0) {
            logger.info('=== Enhanced Monitor Agent Stats ===');
            logger.info('Reconnect attempts: %d/%d', stats.reconnectAttempts, stats.maxReconnectAttempts);
            logger.info('Current strategy: %s', stats.currentStrategy);
            logger.info('Network available: %s', stats.isNetworkAvailable ? 'Yes' : 'No');
            logger.info('Consecutive failures: %d', stats.consecutiveFailures);
            logger.info('Time since last connect: %d ms', stats.timeSinceLastConnect);
            logger.info('=====================================');
        }
    }, 30000); // 每30秒检查一次

    // 返回清理函数
    return () => {
        clearInterval(monitorInterval);
    };
}

/**
 * 模拟告警发送
 */
function sendAlert(message: string) {
    logger.error('ALERT: %s', message);
    // 实际实现中可以发送邮件、短信或其他通知
}

/**
 * 生产环境使用示例
 */
export function productionUsageExample() {
    const monitorAgentOpts: MonitorAgentOpts = {
        id: 'prod-monitor-001',
        type: 'connector',
        info: {
            id: 'connector-prod-001',
            serverType: 'connector',
            host: '192.168.1.100',
            port: 3010
        },
        consoleService: null as any,
        monitorAgentClientFactory: createProductionEnhancedMonitorAgentClient
    };

    const client = createProductionEnhancedMonitorAgentClient(monitorAgentOpts);

    // 生产环境的事件处理
    client.on('connect', () => {
        logger.info('Production monitor agent connected');
    });

    client.on('reconnect', () => {
        logger.info('Production monitor agent reconnected');
    });

    client.on('max_reconnect_attempts_reached', () => {
        logger.error('Production monitor agent connection lost - immediate attention required');
        // 生产环境告警
        sendProductionAlert('Monitor agent connection lost');
    });

    // 启动生产环境监控
    const cleanup = startProductionMonitoring(client);

    client.connect('192.168.1.100', 3010);

    return {
        client,
        cleanup
    };
}

/**
 * 生产环境监控
 */
function startProductionMonitoring(client: EnhancedMqttClient) {
    const monitorInterval = setInterval(() => {
        const stats = client.getReconnectStats();

        // 生产环境告警阈值
        if (stats.reconnectAttempts > 10) {
            logger.warn('High reconnect attempts detected: %d', stats.reconnectAttempts);
        }

        if (stats.consecutiveFailures > 3) {
            logger.error('High consecutive failures detected: %d', stats.consecutiveFailures);
        }

        if (!stats.isNetworkAvailable) {
            logger.error('Network unavailable for extended period');
        }
    }, 60000); // 每分钟检查一次

    return () => {
        clearInterval(monitorInterval);
    };
}

/**
 * 模拟生产环境告警
 */
function sendProductionAlert(message: string) {
    logger.error('PRODUCTION ALERT: %s', message);
    // 实际实现中可以集成监控系统
}

/**
 * 自定义配置示例
 */
export function customConfigExample() {
    const customConfig: Partial<EnhancedMqttClientOpts> = {
        maxReconnectAttempts: 75,
        networkCheckInterval: 25 * 1000,
        reconnectDelayMax: 180 * 1000,
        enableNetworkDetection: true
    };

    const monitorAgentOpts: MonitorAgentOpts = {
        id: 'custom-monitor-001',
        type: 'connector',
        info: {
            id: 'connector-custom-001',
            serverType: 'connector',
            host: '127.0.0.1',
            port: 3010
        },
        consoleService: null as any,
        monitorAgentClientFactory: (opts) => createCustomEnhancedMonitorAgentClient(opts, customConfig)
    };

    const client = createCustomEnhancedMonitorAgentClient(monitorAgentOpts, customConfig);

    client.on('connect', () => {
        logger.info('Custom configured monitor agent connected');
    });

    client.connect('localhost', 3010);

    return client;
}
