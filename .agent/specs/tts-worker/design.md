# TTS Worker 设计文档

## 概述
本设计文档旨在详细说明如何将TTS（Text-to-Speech）处理从主线程迁移到Web Worker中执行，以避免阻塞UI线程，提升用户界面的响应性和流畅性。

## 架构

### 整体架构
1. **主线程**：负责UI渲染、用户交互和音频播放
2. **TTS Worker**：独立的Web Worker，专门负责TTS音频生成任务
3. **通信机制**：通过postMessage在主线程和Worker之间传递消息

### 数据流
1. 用户交互触发发音请求
2. 主线程将请求发送到TTS Worker
3. TTS Worker处理请求并生成音频数据
4. Worker将音频数据返回给主线程
5. 主线程播放音频或缓存数据

## 组件和接口

### 主线程组件
1. **TTS Manager**：负责与Worker通信和管理音频缓存
   - 初始化Worker
   - 发送TTS请求
   - 接收处理结果
   - 管理音频缓存

2. **Audio Player**：负责播放音频
   - 播放缓存的音频
   - 播放从Worker返回的音频

### Worker组件
1. **TTS Processor**：负责TTS音频生成
   - 接收TTS请求
   - 调用@diffusionstudio/vits-web库生成音频
   - 返回音频数据给主线程
   - 过滤语音模型列表，只保留en_US开头的模型

2. **Task Queue**：负责管理并发请求
   - 排队处理并发的TTS请求
   - 按顺序处理任务
   - 支持任务取消

## 数据模型

### 消息格式

#### 主线程到Worker的消息
```javascript
{
  type: 'predict',
  word: string,
  voiceId: string
}
```

#### Worker到主线程的消息
```javascript
// 成功响应
{
  type: 'success',
  word: string,
  audioData: ArrayBuffer
}

// 错误响应
{
  type: 'error',
  word: string,
  error: string
}
```

### 缓存结构
```javascript
{
  [word]: {
    audioUrl: string,  // 通过URL.createObjectURL创建的音频URL
    timestamp: number  // 缓存时间戳，用于过期处理
  }
}
```

## 错误处理

### Worker内部错误
1. 捕获TTS生成过程中的异常
2. 将错误信息通过postMessage发送回主线程
3. 主线程记录错误并提供降级方案

### 通信错误
1. 处理Worker初始化失败的情况
2. 提供回退机制，直接在主线程中处理TTS

### 降级方案
1. 当Worker不可用或处理失败时，使用浏览器原生SpeechSynthesis API
2. 记录降级事件以便后续分析

## 测试策略

### 单元测试
1. 测试Worker的消息处理逻辑
2. 测试任务队列的正确性
3. 测试主线程与Worker的通信

### 集成测试
1. 测试完整的TTS处理流程
2. 验证音频播放功能
3. 测试缓存机制的有效性

### 性能测试
1. 测试UI线程的响应性是否得到改善
2. 测试Worker处理TTS任务的性能
3. 验证并发请求处理的正确性

## 实现细节

### Worker实现
1. 使用Blob URL创建Worker，避免跨域问题
2. 在Worker中导入必要的TTS库
3. 实现任务队列以处理并发请求
4. 添加适当的错误处理和日志记录
5. 实现语音模型过滤功能，通过`voice.key.startsWith('en_US')`确保只返回英语(美国)语音模型

### 主线程实现
1. 创建Worker实例并处理其生命周期
2. 实现与Worker的通信机制
3. 维护音频缓存并处理缓存过期
4. 实现降级机制以应对Worker不可用的情况

### 安全考虑
1. 确保Worker中不处理敏感数据
2. 验证从Worker接收到的数据
3. 限制Worker的权限，仅允许必要的操作