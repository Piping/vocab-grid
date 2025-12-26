// TTS Worker - 用于处理 TTS 相关任务
import { stored, download, predict, voices } from '/src/vits-web.js';

const taskQueue = [];
let isProcessing = false;

// 初始化TTS模型
let isModelLoaded = false;
let currentVoiceId = 'en_US-hfc_female-medium';

// 去重与节流
const inFlight = new Set(); // 正在处理或排队中的 key 集合
const lastRequestAt = new Map(); // key -> 时间戳
const THROTTLE_MS = 1200; // 节流窗口，避免短时间重复生成

function makeKey(word, voiceId) {
  return `${(voiceId || currentVoiceId) || ''}::${(word || '').toLowerCase()}`;
}

self.onmessage = async (event) => {
  const { type, word, voiceId } = event.data;
  
  if (type === 'init') {
    // Worker 初始化完成
    self.postMessage({ type: 'worker-ready' });
  } else if (type === 'set-voice') {
    // 设置语音模型
    currentVoiceId = voiceId;
    isModelLoaded = false; // 重置模型加载状态
    self.postMessage({ type: 'voice-set', voiceId });
  } else if (type === 'get-voices') {
    // 获取语音模型列表
    try {
      const voiceList = await voices();
      // 过滤只保留en_US开头的语音模型
      const filteredVoiceList = voiceList.filter(voice => voice.key.startsWith('en_US'));
      self.postMessage({ type: 'voices-list', voices: filteredVoiceList });
    } catch (error) {
      console.error('获取语音模型列表失败:', error);
      self.postMessage({ type: 'error', error: `获取语音模型列表失败: ${error.message}` });
    }
  } else if (type === 'predict') {
    const key = makeKey(word, voiceId);
    const now = Date.now();

    // 节流：在窗口内忽略重复请求
    const lastAt = lastRequestAt.get(key) || 0;
    if (now - lastAt < THROTTLE_MS) {
      return; // 丢弃被节流的请求
    }

    // 去重：若已在队列或处理中，忽略
    if (inFlight.has(key)) {
      return;
    }

    // 记录并入队
    inFlight.add(key);
    taskQueue.push({ word, voiceId: voiceId || currentVoiceId, key });

    // 如果没有正在处理的任务，开始处理队列
    if (!isProcessing) {
      await processQueue();
    }
  } else if (type === 'cancel') {
    // 取消所有排队的任务
    taskQueue.length = 0;
    isProcessing = false;
    inFlight.clear();
  }
};

async function loadModel(voiceId) {
  if (isModelLoaded && currentVoiceId === voiceId) return;
  
  try {
    // 检查模型是否已存在
    const storedModels = await stored();
    
    if (!storedModels.includes(voiceId)) {
      // 下载模型
      await download(voiceId);
    }
    
    currentVoiceId = voiceId;
    isModelLoaded = true;
    self.postMessage({ type: 'model-loaded', voiceId });
  } catch (error) {
    console.error('模型加载失败:', error);
      self.postMessage({ 
        type: 'error', 
        error: `TTS生成失败: ${error.message}`
      });
  }
}

async function processQueue() {
  if (taskQueue.length === 0) {
    isProcessing = false;
    return;
  }
  
  // 获取队列中第一个任务的语音模型ID
  const firstTask = taskQueue[0];
  const voiceId = firstTask.voiceId || currentVoiceId;
  
  // 确保模型已加载
  await loadModel(voiceId);
  
  isProcessing = true;
  
  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    
    try {
      // 生成TTS音频
      const wav = await predict({
        text: task.word,
        voiceId: task.voiceId || currentVoiceId,
      });
      
      // 将音频数据发送回主线程
      self.postMessage({ 
        type: 'success', 
        word: task.word, 
        audioData: wav
      });
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        word: task.word, 
        error: error.message
      });
    } finally {
      // 任务完成或失败后，移除去重标记并记录时间
      if (task && task.key) {
        inFlight.delete(task.key);
        lastRequestAt.set(task.key, Date.now());
      }
    }
  }
  
  isProcessing = false;
}

// 初始化 Worker
self.postMessage({ type: 'worker-ready' });
