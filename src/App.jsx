import { useState, useEffect } from 'react';
import './App.css';
import vocabDB from './idb';
import vocabData from './assets/vocab_gre.json';

function App() {
  const [words, setWords] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rememberedWords, setRememberedWords] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});
  const wordsPerPage = 6;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      // 加载已记住的单词
      const saved = localStorage.getItem('rememberedWords');
      if (saved) {
        setRememberedWords(JSON.parse(saved));
      }
    };

    loadWords();
  }, []);

  // 保存已记住的单词
  useEffect(() => {
    localStorage.setItem('rememberedWords', JSON.stringify(rememberedWords));
  }, [rememberedWords]);

  // 组件卸载时清除所有定时器
  useEffect(() => {
    return () => {
      Object.values(hoverTimers).forEach(timerId => {
        clearInterval(timerId);
      });
    };
  }, [hoverTimers]);

  // 计算总页数
  const totalPages = Math.ceil(words.length / wordsPerPage);

  // 获取当前页的单词
  const indexOfLastWord = currentPage * wordsPerPage;
  const indexOfFirstWord = indexOfLastWord - wordsPerPage;
  const currentWords = words.slice(indexOfFirstWord, indexOfLastWord);

  // 切换页面
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // 切换单词记忆状态
  const toggleRemember = (id) => {
    setRememberedWords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // 播放单词发音
  const playPronunciation = (word) => {
    const utterance = new SpeechSynthesisUtterance(word);
    window.speechSynthesis.speak(utterance);
  };

  // 开始悬停发音定时器
  const startHoverTimer = (id, word) => {
    // 清除可能存在的旧定时器
    if (hoverTimers[id]) {
      clearInterval(hoverTimers[id]);
    }
    // 立即播放一次
    playPronunciation(word);
    // 设置每隔2秒播放一次的定时器
    const timerId = setInterval(() => {
      playPronunciation(word);
    }, 2000);
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
        <p>点击单词卡片标记已记住的单词，悬停查看释义</p>
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
                onClick={() => toggleRemember(word.id)}
                title={`${word.definition}
点击播放发音`}
                onMouseEnter={() => startHoverTimer(word.id, word.word)}
                onMouseLeave={() => clearHoverTimer(word.id)}
              >
                <span className="word-text">{word.word}</span>
                {rememberedWords[word.id] && (
                  <span className="remembered-badge">✓</span>
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

export default App
