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
  const [hoveredWordId, setHoveredWordId] = useState(null);
  const [isModelDownloading, setIsModelDownloading] = useState(false);
  const [modelDownloaded, setModelDownloaded] = useState(false);
  const lastSpokenWordRef = useRef('');
  const [shouldPlayPronunciation, setShouldPlayPronunciation] = useState(false);
  const [wordsPerPage, setWordsPerPage] = useState(5);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gridColumnStart, setGridColumnStart] = useState(3);

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

  // 下载TTS模型
  useEffect(() => {
    const downloadTTSModel = async () => {
        // 避免重复下载
        if (isModelDownloading || modelDownloaded) return;
        
        try {
          setIsModelDownloading(true);
          const storedModels = await tts.stored();
          
          if (!storedModels.includes('en_US-hfc_female-medium')) {
            console.log('开始下载TTS模型...');
            await tts.download('en_US-hfc_female-medium', (progress) => {
              console.log(`TTS模型下载进度: ${Math.round(progress.loaded * 100 / progress.total)}%`);
            });
            console.log('TTS模型下载完成');
            setModelDownloaded(true);
          } else {
            setModelDownloaded(true);
          }
        } catch (error) {
          console.error('TTS模型下载失败:', error);
        } finally {
          setIsModelDownloading(false);
        }
      };

    downloadTTSModel();
  }, []);

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
      Object.values(hoverTimers).forEach(timerId => {
        clearInterval(timerId);
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
    setCurrentPage(page);
    setHoverTimers(currentTimers => {
      // 清除所有定时器和超时
      Object.values(currentTimers).forEach(timerId => {
        clearInterval(timerId);
        clearTimeout(timerId);
      });
      return {};
    });
    setHoveredWordId(null); // 翻页时显式重置hover状态
    setShouldPlayPronunciation(true); // 请求播放发音
  }, []);

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
  const playPronunciation = useCallback(async (word) => {
  try {
    // 使用已下载的模型生成语音
    console.log(modelDownloaded)
    console.log(await tts.stored());
    if (modelDownloaded) {
      try {
        // 生成语音
        const wav = await tts.predict({
          text: word,
          voiceId: 'en_US-hfc_female-medium',
        }, console.log);
        
        // 播放语音
        const audio = new Audio();
        audio.src = URL.createObjectURL(wav);
        await audio.play();
        console.log('Piper TTS播放成功:', word);
        return;
      } catch (ttsError) {
        console.error('Piper TTS播放失败:', ttsError);
      }
    }
    
    // 模型未下载或播放失败时使用浏览器默认TTS
    const utterance = new SpeechSynthesisUtterance(word);
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('TTS播放失败:', error);
    // 回退到浏览器默认TTS
    const utterance = new SpeechSynthesisUtterance(word);
    window.speechSynthesis.speak(utterance);
  }
}, []);

    // 翻页后自动发音逻辑 - 确保currentWords更新后执行
    useEffect(() => {
      if (shouldPlayPronunciation && currentWords.length > 0) {
        console.log('页面切换完成，准备播放发音:', { timestamp: new Date().toISOString() });
        try {
          console.log('开始播放发音:', currentWords[0].word);
          playPronunciation(currentWords[0].word);
        } catch (error) {
          console.error('发音播放失败:', error);
        } finally {
          setShouldPlayPronunciation(false);
        }
      }
    }, [shouldPlayPronunciation, currentWords, playPronunciation]);

    // 悬停触发的发音逻辑
  useLayoutEffect(() => {
      // 仅在有悬停单词时触发发音
      if (currentWords.length > 0 && hoveredWordId) {
        const targetWord = currentWords.find(word => word.id === hoveredWordId);
        if (!targetWord) {
          console.error('目标单词不存在:', { hoveredWordId, currentWords });
          return;
        }
        // 使用setTimeout确保异步执行，避免浏览器语音API限制
        console.log('准备播放悬停发音:', { targetWord: targetWord.word });
        const timer = setTimeout(() => {
          try {
            console.log('开始播放悬停发音:', targetWord.word);
            playPronunciation(targetWord.word);
            // 仅在单词变化时取消之前的发音
            if ((window.speechSynthesis.pending || window.speechSynthesis.speaking) &&
                lastSpokenWordRef.current !== targetWord.word) {
              console.log(`单词变化，取消之前的发音: ${lastSpokenWordRef.current}`);
              window.speechSynthesis.cancel();
            }
          } catch (error) {
            console.error('悬停发音播放失败:', error);
          }
        }, 50);
        return () => {
          clearTimeout(timer);
          console.log('悬停定时器已清除');
        };
      }
    }, [currentWords, playPronunciation, hoveredWordId]);

  // 开始悬停发音定时器
  const startHoverTimer = (id, word) => {
    // 清除可能存在的旧定时器
    if (hoverTimers[id]) {
      clearInterval(hoverTimers[id]);
    }
    // 立即播放一次
    playPronunciation(word);
    // 设置每隔500ms播放一次的定时器
    const timerId = setInterval(() => {
      playPronunciation(word);
    }, 500);
    // 保存定时器ID
    setHoverTimers(prev => ({...prev, [id]: timerId}));
  };

  // 清除悬停发音定时器
  const clearHoverTimer = (id) => {
    if (hoverTimers[id]) {
      clearInterval(hoverTimers[id]);
      setHoverTimers(prev => {
        const newTimers = {...prev};
        delete newTimers[id];
        return newTimers;
      });
    }
  };

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
                style={ currentWords.length === 1 ? { gridColumnStart } : {} }
                onClick={() => toggleRemember(word.id)}
                title={showDefinitions ? undefined : `${word.definition} 悬停播放发音`}
                onMouseLeave={() => {
                  window.speechSynthesis.cancel();
                  clearHoverTimer(word.id);
                  setHoveredWordId(null);
                }}
                onMouseOver={() => {
                  startHoverTimer(word.id, word.word);
                  setHoveredWordId(word.id);
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
