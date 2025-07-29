# EnhancedMqttClient - 增强版MQTT客户端

## 概述

`EnhancedMqttClient` 是基于 `RobustMqttClient` 的增强版本，提供了更强大的重连机制和网络恢复能力。它专门设计用于解决网络长时间断开后无法恢复连接的问题，适用于需要高可用性的生产环境。

## 主要特性

### 1. 多次尝试重连机制
- **重连次数限制**: 可配置最大重连尝试次数（默认50次）
- **重连次数重置**: 连接成功后自动重置重连计数
- **定时重置**: 可配置时间间隔自动重置重连次数

### 2. 自适应重连策略
- **指数退避**: 前5次重连使用指数退避算法
- **线性增长**: 6-15次重连使用线性增长算法
- **固定延迟**: 超过15次后使用固定延迟策略
- **随机抖动**: 添加随机延迟避免多个客户端同时重连

### 3. 网络状态检测
- **DNS检测**: 通过DNS解析检测网络连通性
- **状态监控**: 实时监控网络状态变化
- **自动恢复**: 网络恢复后立即尝试重连

### 4. 智能重连决策
- **立即重连**: 1分钟内断开连接时立即重连
- **延迟重连**: 长时间断开后使用延迟重连策略
- **网络感知**: 网络不可用时暂停重连尝试

### 5. 详细监控和日志
- **重连统计**: 提供详细的重连统计信息
- **状态监控**: 实时监控连接状态和重连进度
- **事件通知**: 支持各种重连相关事件

## 配置参数

```typescript
interface EnhancedMqttClientOpts {
    id: string;                           // 客户端ID
    reconnectDelayMax?: number;           // 最大重连延迟（毫秒）
    timeout?: number;                     // 连接超时（毫秒）
    keepalive?: number;                   // 心跳间隔（毫秒）
    maxReconnectAttempts?: number;        // 最大重连尝试次数（默认50）
    reconnectAttemptResetTime?: number;   // 重连次数重置时间（默认5分钟）
    networkCheckInterval?: number;        // 网络状态检查间隔（默认30秒）
    enableNetworkDetection?: boolean;     // 是否启用网络状态检测（默认true）
}
```

## 使用方法

### 基础使用

```typescript
import { EnhancedMqttClient } from './enhancedMqttClient';

const client = new EnhancedMqttClient({
    id: 'my-client-001',
    maxReconnectAttempts: 30,
    networkCheckInterval: 20 * 1000
});

client.on('connect', () => {
    console.log('Connected successfully');
});

client.on('reconnect', () => {
    console.log('Reconnected successfully');
});

client.on('max_reconnect_attempts_reached', () => {
    console.log('Max reconnect attempts reached');
});

client.connect('localhost', 3010);
```

### 高级配置

```typescript
const client = new EnhancedMqttClient({
    id: 'advanced-client',
    maxReconnectAttempts: 100,
    reconnectAttemptResetTime: 10 * 60 * 1000, // 10分钟重置
    networkCheckInterval: 15 * 1000,           // 15秒检查网络
    enableNetworkDetection: true,
    reconnectDelayMax: 120 * 1000,             // 最大重连延迟2分钟
    timeout: 10 * 1000,                        // 连接超时10秒
    keepalive: 30 * 1000                       // 心跳间隔30秒
});
```

### 监控重连状态

```typescript
// 获取重连统计信息
const stats = client.getReconnectStats();
console.log('Reconnect stats:', stats);

// 实时监控
setInterval(() => {
    const stats = client.getReconnectStats();
    if (stats.reconnectAttempts > 0) {
        console.log(`Attempts: ${stats.reconnectAttempts}/${stats.maxReconnectAttempts}`);
        console.log(`Strategy: ${stats.currentStrategy}`);
        console.log(`Network: ${stats.isNetworkAvailable ? 'Available' : 'Unavailable'}`);
    }
}, 5000);
```

### 手动触发重连

```typescript
// 手动触发重连（用于测试或特殊情况）
client.forceReconnect();
```

## 重连策略详解

### 1. 指数退避策略（前5次重连）
```
延迟时间 = 基础延迟 × 2^(重连次数-1)
示例：基础延迟1秒
- 第1次重连：1秒
- 第2次重连：2秒
- 第3次重连：4秒
- 第4次重连：8秒
- 第5次重连：16秒
```

### 2. 线性增长策略（6-15次重连）
```
延迟时间 = 基础延迟 × 重连次数
示例：基础延迟1秒
- 第6次重连：6秒
- 第7次重连：7秒
- ...
- 第15次重连：15秒
```

### 3. 固定延迟策略（超过15次）
```
延迟时间 = 基础延迟（固定值）
示例：基础延迟1秒，所有重连都是1秒延迟
```

## 事件说明

| 事件名 | 说明 | 参数 |
|--------|------|------|
| `connect` | 首次连接成功 | 无 |
| `reconnect` | 重连成功 | 无 |
| `disconnect` | 连接断开 | `id: string` |
| `max_reconnect_attempts_reached` | 达到最大重连次数 | 无 |

## 统计信息

`getReconnectStats()` 方法返回以下统计信息：

```typescript
{
    reconnectAttempts: number,           // 当前重连尝试次数
    maxReconnectAttempts: number,        // 最大重连尝试次数
    lastReconnectTime: number,           // 最后一次重连时间戳
    lastSuccessfulConnectTime: number,   // 最后一次成功连接时间戳
    consecutiveFailures: number,         // 连续失败次数
    isNetworkAvailable: boolean,         // 网络是否可用
    currentStrategy: string,             // 当前重连策略
    timeSinceLastConnect: number         // 距离上次连接的时间
}
```

## 最佳实践

### 1. 配置建议
- **生产环境**: 设置较大的 `maxReconnectAttempts`（如100次）
- **开发环境**: 使用较小的值便于调试
- **网络不稳定环境**: 启用网络状态检测
- **高并发环境**: 适当增加网络检查间隔

### 2. 监控建议
- 定期检查重连统计信息
- 监控 `max_reconnect_attempts_reached` 事件
- 记录网络状态变化
- 设置告警机制

### 3. 错误处理
```typescript
client.on('max_reconnect_attempts_reached', () => {
    // 发送告警通知
    sendAlert('Client reached max reconnect attempts');
    
    // 可以选择重启客户端
    setTimeout(() => {
        client.forceReconnect();
    }, 60000);
});
```

## 与现有客户端的对比

| 特性 | MqttClient | RobustMqttClient | EnhancedMqttClient |
|------|------------|------------------|-------------------|
| 基础重连 | ✅ | ✅ | ✅ |
| 重连次数限制 | ❌ | ❌ | ✅ |
| 网络状态检测 | ❌ | ❌ | ✅ |
| 自适应策略 | ❌ | ❌ | ✅ |
| 详细统计 | ❌ | ❌ | ✅ |
| 立即重连 | ❌ | ❌ | ✅ |
| 手动重连 | ❌ | ❌ | ✅ |

## 注意事项

1. **资源管理**: 确保在不需要时调用 `disconnect()` 或 `close()` 方法
2. **内存泄漏**: 长时间运行时注意清理定时器
3. **网络检测**: DNS检测可能在某些网络环境下不准确
4. **并发重连**: 多个客户端同时重连时会有随机抖动避免冲突

## 故障排除

### 常见问题

1. **重连次数过多**
   - 检查网络连接
   - 调整重连策略参数
   - 检查服务器状态

2. **网络检测不准确**
   - 调整检测间隔
   - 使用自定义网络检测方法
   - 禁用网络检测功能

3. **内存使用过高**
   - 检查定时器清理
   - 确保正确调用断开方法
   - 监控事件监听器数量