/**
 * 增强版MQTT客户端，提供更强大的重连机制
 * 特性：
 * 1. 多次尝试重连机制，避免网络长时间断开后无法恢复
 * 2. 重连次数限制和重置机制
 * 3. 网络状态检测和自适应重连策略
 * 4. 重连成功后的状态恢复
 * 5. 详细的日志记录和监控
 */
import { getLogger } from 'pinusmod-logger';
import * as path from 'path';
import { RobustMqttClient } from './robustMqttClient';
import * as constants from '../../util/constants';

let logger = getLogger('pinus-admin', path.basename(__filename));

export interface EnhancedMqttClientOpts {
    id: string;
    reconnectDelayMax?: number;
    timeout?: number;
    keepalive?: number;
    maxReconnectAttempts?: number;      // 最大重连尝试次数
    reconnectAttemptResetTime?: number; // 重连次数重置时间（毫秒）
    dnsAddress?: string;
    networkCheckInterval?: number;      // 网络状态检查间隔
    enableNetworkDetection?: boolean;   // 是否启用网络状态检测
}

export class EnhancedMqttClient extends RobustMqttClient {
    // 重连相关配置
    maxReconnectAttempts: number;
    reconnectAttemptResetTime: number;
    networkCheckInterval: number;
    enableNetworkDetection: boolean;

    // 重连状态管理
    reconnectAttempts: number = 0;
    lastReconnectTime: number = 0;
    lastSuccessfulConnectTime: number = 0;
    networkCheckTimer: NodeJS.Timeout = null;
    reconnectResetTimer: NodeJS.Timeout = null;

    // 网络状态
    dnsAddress: string;
    isNetworkAvailable: boolean = true;
    consecutiveFailures: number = 0;
    maxConsecutiveFailures: number = 5;

    // 重连策略
    currentReconnectStrategy: 'exponential' | 'linear' | 'constant' = 'exponential';
    baseReconnectDelay: number;

    constructor(opts: EnhancedMqttClientOpts) {
        super(opts);

        this.maxReconnectAttempts = opts.maxReconnectAttempts || 50;
        this.reconnectAttemptResetTime = opts.reconnectAttemptResetTime || 5 * 60 * 1000; // 5分钟
        this.networkCheckInterval = opts.networkCheckInterval || 30 * 1000; // 30秒
        this.enableNetworkDetection = opts.enableNetworkDetection !== false;
        this.baseReconnectDelay = constants.DEFAULT_PARAM.RECONNECT_DELAY;
        this.dnsAddress = opts.dnsAddress || '223.5.5.5';
        logger.info('EnhancedMqttClient initialized with maxReconnectAttempts: %d, resetTime: %d ms',
                   this.maxReconnectAttempts, this.reconnectAttemptResetTime);
    }

    connect(host?: string, port?: number, cb?: Function) {
        // 重置重连计数（如果是首次连接）
        if (this.reconnectAttempts === 0) {
            this.resetReconnectAttempts();
        }

        // 启动网络状态检测
        if (this.enableNetworkDetection) {
            this.startNetworkDetection();
        }

        // 设置重连次数重置定时器
        this.setupReconnectResetTimer();

        // 调用父类的connect方法
        super.connect(host, port, cb);

        // 监听连接成功事件
        const self = this;
        this.once('connect', function() {
            self.onConnectSuccess();
        });

        this.once('reconnect', function() {
            self.onConnectSuccess();
        });
    }

    /**
     * 增强的重连方法
     */
    reconnect() {
        // 检查重连次数限制
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max reconnect attempts (%d) reached, stopping reconnection', this.maxReconnectAttempts);
            this.emit('max_reconnect_attempts_reached');
            return;
        }

        // 检查网络状态
        if (!this.isNetworkAvailable) {
            logger.warn('Network unavailable, delaying reconnect attempt');
            this.scheduleReconnectWithDelay(this.networkCheckInterval);
            return;
        }

        this.reconnectAttempts++;
        this.lastReconnectTime = Date.now();

        // 计算重连延迟
        const delay = this.calculateReconnectDelay();

        logger.info('Reconnect attempt %d/%d, delay: %d ms, strategy: %s',
                   this.reconnectAttempts, this.maxReconnectAttempts, delay, this.currentReconnectStrategy);

        // 更新重连策略
        this.updateReconnectStrategy();

        const self = this;
        this.reconnectId = setTimeout(function () {
            logger.info('Executing reconnect attempt %d/%d', self.reconnectAttempts, self.maxReconnectAttempts);
            self.addTimeout(true);
            self.connect();
        }, delay);
    }

    /**
     * 计算重连延迟时间
     */
    private calculateReconnectDelay(): number {
        let delay: number;

        switch (this.currentReconnectStrategy) {
            case 'exponential':
                // 指数退避：基础延迟 * 2^(重连次数-1)
                delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                break;
            case 'linear':
                // 线性增长：基础延迟 * 重连次数
                delay = this.baseReconnectDelay * this.reconnectAttempts;
                break;
            case 'constant':
                // 固定延迟
                delay = this.baseReconnectDelay;
                break;
            default:
                delay = this.baseReconnectDelay;
        }

        // 限制最大延迟
        if (delay > this.reconnectDelayMax) {
            delay = this.reconnectDelayMax;
        }

        // 添加随机抖动，避免多个客户端同时重连
        const jitter = Math.random() * 1000;
        delay += jitter;

        return Math.floor(delay);
    }

    /**
     * 更新重连策略
     */
    private updateReconnectStrategy() {
        if (this.reconnectAttempts <= 5) {
            this.currentReconnectStrategy = 'exponential';
        } else if (this.reconnectAttempts <= 15) {
            this.currentReconnectStrategy = 'linear';
        } else {
            this.currentReconnectStrategy = 'constant';
        }
    }

    /**
     * 启动网络状态检测
     */
    private startNetworkDetection() {
        if (this.networkCheckTimer) {
            clearInterval(this.networkCheckTimer);
        }

        this.networkCheckTimer = setInterval(() => {
            this.checkNetworkStatus();
        }, this.networkCheckInterval);
    }

    /**
     * 检查网络状态
     */
    private checkNetworkStatus() {
        const previousStatus = this.isNetworkAvailable;

        // 简单的网络状态检测：检查DNS解析
        const dns = require('dns');
        dns.lookup(this.dnsAddress, (err: any) => {
            this.isNetworkAvailable = !err;

            if (previousStatus !== this.isNetworkAvailable) {
                logger.info('Network status changed: %s -> %s',
                           previousStatus ? 'available' : 'unavailable',
                           this.isNetworkAvailable ? 'available' : 'unavailable');

                if (this.isNetworkAvailable && !this.connected && !this.closed) {
                    logger.info('Network restored, attempting immediate reconnect');
                    this.scheduleReconnectWithDelay(1000); // 1秒后重连
                }
            }
        });
    }

    /**
     * 设置重连次数重置定时器
     */
    private setupReconnectResetTimer() {
        if (this.reconnectResetTimer) {
            clearTimeout(this.reconnectResetTimer);
        }

        this.reconnectResetTimer = setTimeout(() => {
            this.resetReconnectAttempts();
        }, this.reconnectAttemptResetTime);
    }

    /**
     * 重置重连尝试次数
     */
    private resetReconnectAttempts() {
        const previousAttempts = this.reconnectAttempts;
        this.reconnectAttempts = 0;
        this.consecutiveFailures = 0;
        this.currentReconnectStrategy = 'exponential';

        if (previousAttempts > 0) {
            logger.info('Reconnect attempts reset from %d to 0', previousAttempts);
        }
    }

    /**
     * 延迟重连调度
     */
    private scheduleReconnectWithDelay(delay: number) {
        if (this.reconnectId) {
            clearTimeout(this.reconnectId);
        }

        this.reconnectId = setTimeout(() => {
            this.reconnect();
        }, delay);
    }

    /**
     * 连接成功处理
     */
    private onConnectSuccess() {
        this.lastSuccessfulConnectTime = Date.now();
        this.consecutiveFailures = 0;

        // 重置重连次数（连接成功后）
        this.resetReconnectAttempts();

        logger.info('Connection established successfully, resetting reconnect attempts');
    }

    /**
     * 连接失败处理
     */
    private onConnectFailure() {
        this.consecutiveFailures++;

        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            logger.warn('Consecutive failures reached %d, switching to constant reconnect strategy',
                       this.maxConsecutiveFailures);
            this.currentReconnectStrategy = 'constant';
        }
    }

    /**
     * 重写连接关闭处理
     */
    onSocketClose() {
        if (this.closed) {
            return;
        }

        // 记录连接失败
        this.onConnectFailure();

        // 检查是否需要立即重连
        const timeSinceLastConnect = Date.now() - this.lastSuccessfulConnectTime;
        const shouldImmediateReconnect = timeSinceLastConnect < 60000; // 1分钟内断开，立即重连

        if (shouldImmediateReconnect) {
            logger.info('Connection lost recently, attempting immediate reconnect');
            this.disconnect();
            this.scheduleReconnectWithDelay(1000);
        } else {
            super.onSocketClose();
        }
    }

    /**
     * 获取重连统计信息
     */
    getReconnectStats() {
        return {
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            lastReconnectTime: this.lastReconnectTime,
            lastSuccessfulConnectTime: this.lastSuccessfulConnectTime,
            consecutiveFailures: this.consecutiveFailures,
            isNetworkAvailable: this.isNetworkAvailable,
            currentStrategy: this.currentReconnectStrategy,
            timeSinceLastConnect: Date.now() - this.lastSuccessfulConnectTime
        };
    }

    /**
     * 手动触发重连（用于测试或特殊情况）
     */
    forceReconnect() {
        logger.info('Force reconnect triggered');
        this.resetReconnectAttempts();
        this.disconnect();
        this.scheduleReconnectWithDelay(1000);
    }

    /**
     * 重写断开连接方法
     */
    disconnect() {
        // 清理定时器
        if (this.networkCheckTimer) {
            clearInterval(this.networkCheckTimer);
            this.networkCheckTimer = null;
        }

        if (this.reconnectResetTimer) {
            clearTimeout(this.reconnectResetTimer);
            this.reconnectResetTimer = null;
        }

        super.disconnect();
    }

    /**
     * 重写关闭方法
     */
    close() {
        // 清理定时器
        if (this.networkCheckTimer) {
            clearInterval(this.networkCheckTimer);
            this.networkCheckTimer = null;
        }

        if (this.reconnectResetTimer) {
            clearTimeout(this.reconnectResetTimer);
            this.reconnectResetTimer = null;
        }

        super.close();
    }
}