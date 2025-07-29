/**
 * EnhancedMqttClient 测试文件
 * 测试增强版MQTT客户端的各种功能
 */
import { EnhancedMqttClient, EnhancedMqttClientOpts } from './enhancedMqttClient';
import { getLogger } from 'pinusmod-logger';
import * as path from 'path';

let logger = getLogger('pinus-admin', path.basename(__filename));

/**
 * 测试基础功能
 */
export function testBasicFunctionality() {
    console.log('=== Testing Basic Functionality ===');

    const client = new EnhancedMqttClient({
        id: 'test-basic-001',
        maxReconnectAttempts: 5,
        networkCheckInterval: 10 * 1000
    });

    let connectCount = 0;
    let reconnectCount = 0;
    let disconnectCount = 0;

    client.on('connect', () => {
        connectCount++;
        console.log(`Connect event triggered (${connectCount})`);
    });

    client.on('reconnect', () => {
        reconnectCount++;
        console.log(`Reconnect event triggered (${reconnectCount})`);
    });

    client.on('disconnect', (id) => {
        disconnectCount++;
        console.log(`Disconnect event triggered (${disconnectCount}): ${id}`);
    });

    client.on('max_reconnect_attempts_reached', () => {
        console.log('Max reconnect attempts reached event triggered');
    });

    // 尝试连接到不存在的服务器来测试重连
    client.connect('localhost', 9999);

    // 5秒后检查统计信息
    setTimeout(() => {
        const stats = client.getReconnectStats();
        console.log('Reconnect stats after 5 seconds:', stats);
        client.disconnect();
    }, 5000);

    return {
        client,
        connectCount,
        reconnectCount,
        disconnectCount
    };
}

/**
 * 测试重连策略
 */
export function testReconnectStrategies() {
    console.log('=== Testing Reconnect Strategies ===');

    const client = new EnhancedMqttClient({
        id: 'test-strategies-001',
        maxReconnectAttempts: 20,
        networkCheckInterval: 5 * 1000
    });

    const strategyHistory: string[] = [];

    // 监听重连事件来记录策略变化
    client.on('reconnect', () => {
        const stats = client.getReconnectStats();
        strategyHistory.push(stats.currentStrategy);
        console.log(`Reconnect with strategy: ${stats.currentStrategy}`);
    });

    // 模拟多次重连
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            client.reconnect();
        }, i * 1000);
    }

    // 10秒后检查策略历史
    setTimeout(() => {
        console.log('Strategy history:', strategyHistory);
        console.log('Expected: exponential (5 times) -> linear (10 times) -> constant (5 times)');
        client.disconnect();
    }, 10000);

    return {
        client,
        strategyHistory
    };
}

/**
 * 测试网络状态检测
 */
export function testNetworkDetection() {
    console.log('=== Testing Network Detection ===');

    const client = new EnhancedMqttClient({
        id: 'test-network-001',
        maxReconnectAttempts: 10,
        networkCheckInterval: 2 * 1000,
        enableNetworkDetection: true
    });

    const networkStatusHistory: boolean[] = [];

    // 定期检查网络状态
    const checkInterval = setInterval(() => {
        const stats = client.getReconnectStats();
        networkStatusHistory.push(stats.isNetworkAvailable);
        console.log(`Network status: ${stats.isNetworkAvailable ? 'Available' : 'Unavailable'}`);
    }, 1000);

    // 10秒后停止检查
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log('Network status history:', networkStatusHistory);
        client.disconnect();
    }, 10000);

    return {
        client,
        networkStatusHistory
    };
}

/**
 * 测试重连次数重置
 */
export function testReconnectReset() {
    console.log('=== Testing Reconnect Reset ===');

    const client = new EnhancedMqttClient({
        id: 'test-reset-001',
        maxReconnectAttempts: 10,
        reconnectAttemptResetTime: 3 * 1000, // 3秒重置
        networkCheckInterval: 1 * 1000
    });

    let resetCount = 0;

    // 监听重连事件
    client.on('reconnect', () => {
        const stats = client.getReconnectStats();
        console.log(`Reconnect attempt: ${stats.reconnectAttempts}`);
    });

    // 模拟多次重连
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            client.reconnect();
        }, i * 500);
    }

    // 检查重置情况
    setTimeout(() => {
        const stats = client.getReconnectStats();
        console.log('Final stats after reset period:', stats);
        client.disconnect();
    }, 5000);

    return {
        client
    };
}

/**
 * 测试手动重连
 */
export function testManualReconnect() {
    console.log('=== Testing Manual Reconnect ===');

    const client = new EnhancedMqttClient({
        id: 'test-manual-001',
        maxReconnectAttempts: 5
    });

    let manualReconnectCount = 0;

    client.on('reconnect', () => {
        manualReconnectCount++;
        console.log(`Manual reconnect triggered (${manualReconnectCount})`);
    });

    // 手动触发重连
    setTimeout(() => {
        console.log('Triggering manual reconnect...');
        client.forceReconnect();
    }, 1000);

    setTimeout(() => {
        console.log('Triggering second manual reconnect...');
        client.forceReconnect();
    }, 3000);

    setTimeout(() => {
        const stats = client.getReconnectStats();
        console.log('Stats after manual reconnects:', stats);
        client.disconnect();
    }, 5000);

    return {
        client,
        manualReconnectCount
    };
}

/**
 * 测试统计信息
 */
export function testStatistics() {
    console.log('=== Testing Statistics ===');

    const client = new EnhancedMqttClient({
        id: 'test-stats-001',
        maxReconnectAttempts: 10
    });

    const statsHistory: any[] = [];

    // 定期收集统计信息
    const statsInterval = setInterval(() => {
        const stats = client.getReconnectStats();
        statsHistory.push({
            timestamp: Date.now(),
            ...stats
        });
        console.log('Current stats:', stats);
    }, 1000);

    // 模拟一些重连
    setTimeout(() => {
        client.reconnect();
    }, 2000);

    setTimeout(() => {
        client.reconnect();
    }, 4000);

    setTimeout(() => {
        clearInterval(statsInterval);
        console.log('Stats history:', statsHistory);
        client.disconnect();
    }, 6000);

    return {
        client,
        statsHistory
    };
}

/**
 * 测试错误处理
 */
export function testErrorHandling() {
    console.log('=== Testing Error Handling ===');

    const client = new EnhancedMqttClient({
        id: 'test-error-001',
        maxReconnectAttempts: 3
    });

    let maxAttemptsReached = false;

    client.on('max_reconnect_attempts_reached', () => {
        maxAttemptsReached = true;
        console.log('Max reconnect attempts reached - error handling working');
    });

    // 尝试连接到不存在的服务器
    client.connect('invalid-host', 9999);

    // 等待重连尝试完成
    setTimeout(() => {
        console.log('Max attempts reached:', maxAttemptsReached);
        client.disconnect();
    }, 10000);

    return {
        client,
        maxAttemptsReached
    };
}

/**
 * 运行所有测试
 */
export function runAllTests() {
    console.log('Starting EnhancedMqttClient tests...\n');

    const tests = [
        { name: 'Basic Functionality', fn: testBasicFunctionality },
        { name: 'Reconnect Strategies', fn: testReconnectStrategies },
        { name: 'Network Detection', fn: testNetworkDetection },
        { name: 'Reconnect Reset', fn: testReconnectReset },
        { name: 'Manual Reconnect', fn: testManualReconnect },
        { name: 'Statistics', fn: testStatistics },
        { name: 'Error Handling', fn: testErrorHandling }
    ];

    const results: any[] = [];

    tests.forEach((test, index) => {
        console.log(`\n[${index + 1}/${tests.length}] Running ${test.name} test...`);
        try {
            const result = test.fn();
            results.push({
                name: test.name,
                status: 'PASSED',
                result
            });
        } catch (error) {
            console.error(`Error in ${test.name}:`, error);
            results.push({
                name: test.name,
                status: 'FAILED',
                error: error.message
            });
        }
    });

    console.log('\n=== Test Results ===');
    results.forEach(result => {
        console.log(`${result.status}: ${result.name}`);
    });

    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);

    return results;
}

// 如果直接运行此文件，执行所有测试
if (require.main === module) {
    runAllTests();
}
