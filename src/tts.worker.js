// TTS Worker - 用于处理 TTS 相关任务
import { stored, download, predict, voices } from '/src/vits-web.js';

const taskQueue = [];
let isProcessing = false;

// 初始化TTS模型
let isModelLoaded = false;
let currentVoiceId = 'en_US-hfc_female-medium';

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
    // 将任务添加到队列
    taskQueue.push({ word, voiceId: voiceId || currentVoiceId });
    
    // 如果没有正在处理的任务，开始处理队列
    if (!isProcessing) {
      await processQueue();
    }
  } else if (type === 'cancel') {
    // 取消所有排队的任务
    taskQueue.length = 0;
    isProcessing = false;
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
    }
  }
  
  isProcessing = false;
}

// 初始化 Worker
self.postMessage({ type: 'worker-ready' });