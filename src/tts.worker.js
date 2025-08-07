// TTS Worker - 用于处理 TTS 相关任务
import { stored, download, predict } from '/src/vits-web.js';

const taskQueue = [];
let isProcessing = false;

// 初始化TTS模型
let isModelLoaded = false;
const voiceId = 'en_US-hfc_female-medium';

self.onmessage = async (event) => {
  const { type, word } = event.data;
  
  if (type === 'init') {
    // Worker 初始化完成
    self.postMessage({ type: 'worker-ready' });
  } else if (type === 'predict') {
    // 将任务添加到队列
    taskQueue.push({ word });
    
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

async function loadModel() {
  if (isModelLoaded) return;
  
  try {
    // 检查模型是否已存在
    const storedModels = await stored();
    
    if (!storedModels.includes(voiceId)) {
      // 下载模型
      await download(voiceId);
    }
    
    isModelLoaded = true;
    self.postMessage({ type: 'model-loaded' });
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
  
  // 确保模型已加载
  await loadModel();
  
  isProcessing = true;
  
  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    
    try {
      // 生成TTS音频
      const wav = await predict({
        text: task.word,
        voiceId: voiceId,
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