import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import './App.css';
import vocabDB from './idb';
import vocabData from './assets/vocab_gre.json';
import * as tts from '@diffusionstudio/vits-web';

function App() {
  const [words, setWords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rememberedWords, setRememberedWords] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});
  const [isModelDownloading, setIsModelDownloading] = useState(false);
  const [modelDownloaded, setModelDownloaded] = useState(false);
  const [wordsPerPage, setWordsPerPage] = useState(5);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gridColumnStart, setGridColumnStart] = useState(3);
  const [ttsVoice, setTtsVoice] = useState('en_US-hfc_female-medium');
  const [availableVoices, setAvailableVoices] = useState([]);
  
  // TTS Worker相关状态
  const [ttsWorker, setTtsWorker] = useState(null);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const workerMessageQueue = useRef([]);

  // 加载grid-column-start设置
  useEffect(() => {
    const savedGridColumnStart = localStorage.getItem('gridColumnStart');
    if (savedGridColumnStart) {
      setGridColumnStart(parseInt(savedGridColumnStart, 10));
    }
  }, []);

  // 保存grid-column-start设置
  useEffect(() => {
    localStorage.setItem('gridColumnStart', gridColumnStart.toString());
  }, [gridColumnStart]);

  // 初始化TTS Worker
  useEffect(() => {
    // 创建Worker
    const worker = new Worker(new URL('./tts.worker.js', import.meta.url), { type: 'module' });
    
    // 设置Worker消息处理
    worker.onmessage = (event) => {
      const { type, word, audioData, error, voiceId, voices } = event.data;
      
      if (type === 'worker-ready') {
        setIsWorkerReady(true);
        // 发送当前选择的语音模型给Worker
        worker.postMessage({ type: 'set-voice', voiceId: ttsVoice });
        // 处理队列中的消息
        while (workerMessageQueue.current.length > 0) {
          const message = workerMessageQueue.current.shift();
          worker.postMessage(message);
        }
      } else if (type === 'model-loaded') {
        console.log('TTS模型在Worker中加载完成:', voiceId);
      } else if (type === 'voice-set') {
        console.log('TTS语音模型已设置:', voiceId);
      } else if (type === 'voices-list') {
        // 处理获取到的语音模型列表
        console.log('获取到语音模型列表:', voices);
        // 转换语音模型列表格式
        const formattedVoices = voices.map(voice => ({
          id: voice.key,
          name: `${voice.name} (${voice.language})`
        }));
        setAvailableVoices(formattedVoices);
      } else if (type === 'success') {
        // 处理成功的TTS结果
        const audioUrl = URL.createObjectURL(audioData);
        // 将音频URL存入缓存
        audioCache.current[word] = audioUrl;
        console.log('Worker TTS生成成功:', word);
      } else if (type === 'error') {
        console.error('Worker TTS处理失败:', word, error);
      }
    };
    
    // 发送初始化消息
    worker.postMessage({ type: 'init' });
    
    setTtsWorker(worker);
    
    // 清理函数
    return () => {
      worker.terminate();
    };
  }, []);

  // 当TTS语音模型改变时，通知Worker
  useEffect(() => {
    if (ttsWorker && isWorkerReady) {
      ttsWorker.postMessage({ type: 'set-voice', voiceId: ttsVoice });
    }
  }, [ttsVoice, ttsWorker, isWorkerReady]);

  // 加载单词数据
  useEffect(() => {
    const loadWords = async () => {
      try {
        // 检查数据库是否有数据
        const hasData = await vocabDB.hasData();

        if (!hasData) {
          // 如果没有数据，导入JSON数据
          console.log('导入单词数据到IndexedDB...');
          await vocabDB.bulkAddData(vocabData);
          console.log('数据导入成功');
        }

        // 从数据库加载数据
        const data = await vocabDB.getAllData();
        // 转换数据格式以匹配现有代码
        const formattedData = data.map((item, index) => ({
          id: index + 1,
          word: item.name,
          definition: item.definition
        }));
        setWords(formattedData);
      } catch (err) {
        console.error('加载单词数据失败:', err);
        setError('加载单词数据失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }

      // 加载已记住的单词和用户设置
      const savedRemembered = localStorage.getItem('rememberedWords');
      if (savedRemembered) {
        setRememberedWords(JSON.parse(savedRemembered));
      }

      const savedWordsPerPage = localStorage.getItem('wordsPerPage');
      if (savedWordsPerPage) {
        setWordsPerPage(parseInt(savedWordsPerPage));
      }

      const savedShowDefinitions = localStorage.getItem('showDefinitions');
      if (savedShowDefinitions) {
        setShowDefinitions(JSON.parse(savedShowDefinitions));
      }
    };

    loadWords();
  }, []);

  // 保存已记住的单词
  useEffect(() => {
    localStorage.setItem('rememberedWords', JSON.stringify(rememberedWords));
  }, [rememberedWords]);

  // 保存用户设置
  useEffect(() => {
    localStorage.setItem('wordsPerPage', wordsPerPage);
    // 当每页单词数改变时，重置到第一页
    setCurrentPage(1);
  }, [wordsPerPage]);

  useEffect(() => {
    localStorage.setItem('showDefinitions', JSON.stringify(showDefinitions));
  }, [showDefinitions]);

  // 组件卸载时清除所有定时器
  useEffect(() => {
    return () => {
      Object.values(hoverTimers).forEach(timers => {
        if (timers) {
          clearTimeout(timers.delayTimer);
          clearInterval(timers.intervalTimer);
        }
      });
    };
  }, [hoverTimers]);

  // 计算总页数，确保至少为1
  const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage));

  // 获取当前页的单词
  const indexOfLastWord = currentPage * wordsPerPage;
  const indexOfFirstWord = indexOfLastWord - wordsPerPage;
  const currentWords = words.slice(indexOfFirstWord, indexOfLastWord);

  // 切换页面
  const handlePageChange = useCallback((page) => {
    // 取消所有进行中的语音
    window.speechSynthesis.cancel();
    
    // 向Worker发送取消消息
    if (ttsWorker && isWorkerReady) {
      ttsWorker.postMessage({ type: 'cancel' });
    }
    
    setCurrentPage(page);
    setHoverTimers(currentTimers => {
      // 清除所有定时器和超时
      Object.values(currentTimers).forEach(timers => {
        if (timers) {
          clearTimeout(timers.delayTimer);
          clearInterval(timers.intervalTimer);
        }
      });
      return {};
    });
  }, [ttsWorker, isWorkerReady]);

  // 添加J/K快捷键控制分页
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 仅当没有输入框被聚焦时才触发快捷键
      if (document.activeElement.tagName !== 'INPUT') {
        if (e.key === 'j') {
          e.preventDefault();
          if (currentPage < totalPages) {
            handlePageChange(currentPage + 1);
          }
        } else if (e.key === 'k') {
          e.preventDefault();
          if (currentPage > 1) {
            handlePageChange(currentPage - 1);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPage, totalPages, handlePageChange]);

  // 切换单词记忆状态
  const toggleRemember = (id) => {
    setRememberedWords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 播放单词发音
  const audioCache = useRef({});
  const debounceTimer = useRef(null);
  const HOVER_DELAY = 100;      // 悬停延迟播放时间
  const HOVER_INTERVAL = 1500;  // 悬停间隔播放时间(大于防抖时间)
  const DEBOUNCE_DELAY = 500;  // 防抖延迟时间

  // 向Worker发送消息的辅助函数
  const sendToWorker = useCallback((message) => {
    if (isWorkerReady && ttsWorker) {
      // 如果是预测消息，添加当前选择的语音模型
      if (message.type === 'predict') {
        ttsWorker.postMessage({ ...message, voiceId: ttsVoice });
      } else {
        ttsWorker.postMessage(message);
      }
    } else {
      // 如果Worker未准备好，将消息加入队列
      workerMessageQueue.current.push(message);
    }
  }, [isWorkerReady, ttsWorker, ttsVoice]);

  const playPronunciation = useCallback(async (word, skipDebounce = false) => {
    // 清除之前的定时器
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // 根据skipDebounce参数决定是否跳过防抖
    const delay = skipDebounce ? 0 : DEBOUNCE_DELAY;

    debounceTimer.current = setTimeout(async () => {
      try {
        // 检查缓存中是否存在该单词的音频
        if (audioCache.current[word]) {
          const audio = new Audio();
          audio.src = audioCache.current[word];
          await audio.play();
          console.log('使用缓存的音频播放:', word);
          return;
        } else {
          // 声音未缓存的时候使用Worker TTS
          sendToWorker({ type: 'predict', word });
          // 使用浏览器默认TTS作为最终降级方案
          const utterance = new SpeechSynthesisUtterance(word);
          window.speechSynthesis.speak(utterance);
        }
      } catch (ttsError) {
        console.error('TTS播放失败:', ttsError);
        // 使用浏览器默认TTS作为最终降级方案
        const utterance = new SpeechSynthesisUtterance(word);
        window.speechSynthesis.speak(utterance);
      }
    }, delay);
  }, [sendToWorker]);

  // 开始悬停发音定时器
  const startHoverTimer = (id, word) => {
    // 清除可能存在的旧定时器
    clearHoverTimer(id);

    const delayTimerId = setTimeout(() => {
      // 立即播放一次
      playPronunciation(word, true);
      // 然后设置间隔播放
      const intervalTimerId = setInterval(() => {
        playPronunciation(word, true);
      }, HOVER_INTERVAL);
      setHoverTimers(prev => ({
        ...prev,
        [id]: { delayTimer: null, intervalTimer: intervalTimerId }
      }));
    }, HOVER_DELAY);

    setHoverTimers(prev => ({
      ...prev,
      [id]: { delayTimer: delayTimerId, intervalTimer: null }
    }));
  };

  // 清除悬停发音定时器
  const clearHoverTimer = (id) => {
    if (hoverTimers[id]) {
      clearTimeout(hoverTimers[id].delayTimer);
      clearInterval(hoverTimers[id].intervalTimer);
      setHoverTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[id];
        return newTimers;
      });
    }
  };

  // 组件卸载时清理缓存的音频URL
  useEffect(() => {
    return () => {
      Object.values(audioCache.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
      audioCache.current = {};
      // 清除防抖定时器
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // 获取可用的语音模型
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        // 通过Worker获取可用的语音模型
        if (ttsWorker && isWorkerReady) {
          // 发送获取语音模型列表的消息
          ttsWorker.postMessage({ type: 'get-voices' });
        }
      } catch (error) {
        console.error('获取语音模型列表失败:', error);
      }
    };

    // 等待Worker准备好后再获取语音模型列表
    if (isWorkerReady && ttsWorker) {
      fetchVoices();
    }
  }, [isWorkerReady, ttsWorker]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Vocab Grid</h1>
        <p>点击单词卡片标记已记住的单词, 悬停卡片播放发音</p>

        <div className="settings-panel">
          <div className="settings-item">
            <label htmlFor="wordsPerPage">每页显示单词数 (1-100):</label>
            <input
              type="number"
              id="wordsPerPage"
              value={wordsPerPage}
              min="1"
              max="100"
              onChange={(e) => {
                let value = parseInt(e.target.value);
                if (isNaN(value) || value < 1) {
                  value = 1;
                } else if (value > 100) {
                  value = 100;
                }
                setWordsPerPage(value);
              }}
              className="settings-input"
            />
          </div>

          <div className="settings-item">
            <label htmlFor="gridColumnStart">设置grid-column-start: </label>
            <input
              type="number"
              id="gridColumnStart"
              value={gridColumnStart}
              min="1"
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1) {
                  setGridColumnStart(value);
                }
              }}
              className="settings-input"
            />
          </div>

          <div className="settings-item">
            <label htmlFor="showDefinitions">
              <input
                type="checkbox"
                id="showDefinitions"
                checked={showDefinitions}
                onChange={(e) => setShowDefinitions(e.target.checked)}
              />
              总是显示单词释义
            </label>
          </div>

          <div className="settings-item">
            <label htmlFor="ttsVoice">TTS语音模型:</label>
            <select
              id="ttsVoice"
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value)}
              className="settings-input"
            >
              {availableVoices.map(voice => (
                <option key={voice.id} value={voice.id}>
                  {voice.id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="loading">加载单词数据中...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <main className="words-grid">
            {currentWords.map(word => (
              <div
                key={word.id}
                className={`word-card ${rememberedWords[word.id] ? 'remembered' : ''}`}
                style={currentWords.length === 1 ? { gridColumnStart } : {}}
                onClick={() => toggleRemember(word.id)}
                title={showDefinitions ? undefined : `${word.definition} 悬停播放发音`}
                onMouseLeave={() => {
                  window.speechSynthesis.cancel();
                  clearHoverTimer(word.id);
                }}
                onMouseOver={() => {
                  startHoverTimer(word.id, word.word);
                }}
              >
                <span className="word-text">{word.word}</span>
                {rememberedWords[word.id] && (
                  <span className="remembered-badge">✓</span>
                )}
                {showDefinitions && (
                  <span className="word-definition">{word.definition}</span>
                )}
              </div>
            ))}
          </main>

          <footer className="pagination-controls">
            <button
              className="page-nav-button"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <div className="page-input-container">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= totalPages && !isNaN(page)) {
                    setCurrentPage(page);
                  }
                }}
                className="page-input"
              />
              <span className="page-total">/ {totalPages}</span>
            </div>
            <button
              className="page-nav-button"
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
