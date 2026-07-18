// ゲーム変数
let lastDrawnNumber = null; // 最後に引いた数字
let lock = false; // カード操作をロックするフラグ
let selectedLevel = 10; // デフォルトレベル
let drawnCards = []; // 引いたカードを記録
let xCardCounts = {}; // 各×カードの引いた回数を記録
let timerInterval = null; // タイマーインターバル
let timeRemaining = 60; // 残り時間（秒）
let bgmAudio = null; // BGMオーディオオブジェクト
let isGameOverSoundPlaying = false; // ゲームオーバー効果音の重複再生を防止するフラグ

// チャレンジモード変数
let challengeMode = false; // チャレンジモードかどうか
let challengeCurrentLevel = 4; // チャレンジモードの現在のレベル（レベル4から開始）
let challengeMaxLevel = 10; // チャレンジモードの最終レベル

// 音量設定
let bgmVolume = 0.1; // BGM音量 (10%)
let sfxVolume = 1.0; // 効果音音量 (100%)

// モバイル対応用の共有 AudioContext
let sharedAudioContext = null;

function getAudioContext() {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return sharedAudioContext;
}

function resumeAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(e => console.log('AudioContext resume 失敗:', e));
  }
}

// ユーザー操作時に AudioContext を確実に有効化（モバイル対応）
function setupAudioContextResume() {
  const events = ['touchstart', 'touchend', 'click', 'pointerdown'];
  events.forEach(evt => {
    document.addEventListener(evt, resumeAudioContext, { once: true });
  });
}

function setupMobileTouchHandling() {
  // タッチスクロール抑制は CSS 側で制御するため、ボタンクリックを妨げないよう処理を空にする
}

function checkOrientation() {
  // 横向きかどうかを判定（window 寸法と matchMedia の両方を考慮）
  const isLandscape = window.innerWidth > window.innerHeight ||
                       window.matchMedia('(orientation: landscape)').matches;
  const rotateScreen = document.getElementById('rotate-screen');
  
  if (rotateScreen) {
    rotateScreen.style.display = isLandscape ? 'none' : 'flex';
  }
}

// 回転促し画面の画像とテキストを指定キャラクターからランダムに選ぶ
function setRandomRotateImage() {
  const rotateCharacters = [
    { image: 'images/このみ笑.png', name: 'このみ' },
    { image: 'images/こま笑.png', name: 'こま' },
    { image: 'images/のの笑.png', name: 'のの' },
    { image: 'images/ゆらぎ笑.png', name: 'ゆらぎ' },
    { image: 'images/らこ笑.png', name: 'らこ' },
    { image: 'images/雨夜リズ笑.png', name: '雨夜リズ' },
    { image: 'images/眠雲ツクリ笑.png', name: '眠雲ツクリ' },
    { image: 'images/虹深゜ぬふ笑.png', name: '虹深゜ぬふ' },
    { image: 'images/夕霧レイ笑.png', name: '夕霧レイ' },
    { image: 'images/あくび笑.png', name: 'あくび' }
  ];
  const selected = rotateCharacters[Math.floor(Math.random() * rotateCharacters.length)];
  const rotateImage = document.getElementById('rotate-image');
  const rotateMessage = document.querySelector('.rotate-message');
  if (rotateImage) {
    rotateImage.src = selected.image;
    rotateImage.alt = selected.name;
  }
  if (rotateMessage) {
    rotateMessage.innerHTML = '<strong>『ミリちゃんの試練』へようこそ！<br>画面を横にして遊んでね！</strong>';
  }
}

// ページ読み込み時に背景画像を固定
window.onload = function() {
  const backgroundImage = document.getElementById('background-image');
  if (backgroundImage) {
    backgroundImage.src = 'images/ミリちゃん_CLOSE.png';
    backgroundImage.style.width = '35vw';
  }
  
  // AudioContext のモバイル対応を設定
  setupAudioContextResume();
  
  // モバイル/PWA でのタッチスクロールやダブルタップズームを抑制
  setupMobileTouchHandling();
  
  // 最初に開いた時の向きを確認し、縦画面なら回転を促す
  setRandomRotateImage();
  checkOrientation();
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', function() {
    // 向き変更後は window 寸法が更新されるまで少し遅らせて再判定
    setTimeout(checkOrientation, 50);
    setTimeout(checkOrientation, 250);
  });

  // matchMedia ベースの向き監視（orientationchange 非対応環境も含め確実に検出）
  const landscapeMQL = window.matchMedia('(orientation: landscape)');
  if (landscapeMQL.addEventListener) {
    landscapeMQL.addEventListener('change', checkOrientation);
    landscapeMQL.addEventListener('change', function(e) {
      if (e.matches) {
        location.reload();
      }
    });
  } else if (landscapeMQL.addListener) {
    landscapeMQL.addListener(checkOrientation);
    landscapeMQL.addListener(function(mql) {
      if (mql.matches) {
        location.reload();
      }
    });
  }
  
  // Service Worker 登録（PWA 対応）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.log('Service Worker 登録失敗:', err);
    });
  }
};

// チュートリアル画面を表示する関数
function showTutorial() {
  // 直接チュートリアルゲームを開始
  document.getElementById('level-selection-screen').style.display = 'none';
  selectedLevel = 'tutorial';
  document.getElementById('game-container').style.display = 'flex';
  
  // ゲームを初期化
  initializeGame();
}

// チュートリアル画面を非表示にする関数
function hideTutorial() {
  document.getElementById('tutorial-screen').style.display = 'none';
  document.getElementById('level-selection-screen').style.display = 'flex';
}

// チャレンジ画面を表示する関数
function showChallenge() {
  // チャレンジモードを有効化
  challengeMode = true;
  
  document.getElementById('level-selection-screen').style.display = 'none';
  selectedLevel = challengeCurrentLevel;
  document.getElementById('game-container').style.display = 'flex';
  
  // ゲームを初期化
  initializeGame();
}

// チュートリアルゲームを開始する関数
function startTutorial() {
  document.getElementById('tutorial-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
  
  // チュートリアル用のレベルを設定
  selectedLevel = 'tutorial';
  
  // ゲームを初期化
  initializeGame();
}

// レベル選択関数
function selectLevel(level) {
  selectedLevel = level;
  
  // 全てのレベルボタンからselectedクラスを削除
  const allButtons = document.querySelectorAll('.level-btn');
  allButtons.forEach(btn => btn.classList.remove('selected'));
  
  // 選択されたボタンにselectedクラスを追加（安全な方法）
  const clickedButton = Array.from(allButtons).find(btn => btn.textContent.includes(level));
  if (clickedButton) {
    clickedButton.classList.add('selected');
  }
}

// レベル選択関数（クリックイベント対応版）
function selectLevelWithEvent(level, element) {
  selectedLevel = level;
  
  // 全てのレベルボタンからselectedクラスを削除
  const allButtons = document.querySelectorAll('.level-btn');
  allButtons.forEach(btn => btn.classList.remove('selected'));
  
  // 選択されたボタンにselectedクラスを追加
  element.classList.add('selected');
  
  // レベル選択画面を非表示にしてゲーム画面を表示
  document.getElementById('level-selection-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
  
  // ゲームを初期化
  initializeGame();
}

// カード配置：選択されたレベルに応じて数字カード＋赤×＋青×
function getCardsForLevel(level) {
  const cards = [];
  
  // チュートリアル用：1〜4の数字カードと2枚の×カード
  if (level === 'tutorial' || level === 4) {
    for (let i = 1; i <= 4; i++) {
      cards.push(i); // 1〜4の数字カードを1枚ずつ
    }
    cards.push('red-x', 'blue-x'); // 2枚の×カード
  } else {
    // 通常のレベル設定
    for (let i = 1; i <= level; i++) {
      cards.push(i);
    }
    cards.push('red-x', 'blue-x');
  }
  
  cards.sort(() => Math.random() - 0.5);
  return cards;
}

// スタートゲーム関数
function startGame(event) {
  if (event) event.stopPropagation();
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
  initializeGame();
}

// タイマー開始関数
function startTimer() {
  // スタートボタンを非表示
  const startContainer = document.getElementById("game-start-container");
  if (startContainer) {
    startContainer.style.display = "none";
  }
  
  // タイマーをリセット
  timeRemaining = 60;
  updateTimerDisplay();
  
  // カード操作を有効化
  lock = false;
  
  // 巻き戻しボタンを表示（チャレンジモード以外）
  const rewindBtn = document.getElementById("rewind-btn");
  if (rewindBtn && !challengeMode) {
    rewindBtn.style.display = "flex";
  }
  
  // BGMを再生
  playBGM();
  
  // タイマーを開始
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      gameOver();
    }
  }, 1000);
}

// BGM再生関数
function playBGM() {
  try {
    bgmAudio = new Audio('bgm/chare.mp3');
    bgmAudio.loop = true; // ループ再生
    bgmAudio.volume = bgmVolume * 0.25; // 設定された音量の25%を使用（50%設定で12.5%になる）
    
    // ユーザーインタラクションで再生を試みる
    const playPromise = bgmAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log('BGM再生開始');
      }).catch(error => {
        console.log('BGMの再生に失敗しました:', error);
      });
    } else {
      // 古いブラウザ対応
      bgmAudio.play();
      console.log('BGM再生開始（古いブラウザ）');
    }
  } catch (error) {
    console.log('BGMの作成に失敗しました:', error);
  }
}

// BGM停止関数
function stopBGM() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    console.log('BGM停止');
  }
}

// タイマー表示更新関数
function updateTimerDisplay() {
  const timerText = document.getElementById("timer-text");
  if (timerText) {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    // 残り10秒になったら背景を黒く変化させる（チュートリアル以外）
    if (timeRemaining === 10 && selectedLevel !== 'tutorial') {
      // 背景色を10秒かけて黒に変化させる（CSSトランジションで滑らかに）
      document.body.style.backgroundColor = 'black';
      console.log('背景色の10秒間の黒への変化を開始');
    }
    
    // 残り13秒になったらBGMの音量を徐々に下げる（チュートリアル以外）
    if (timeRemaining === 13 && selectedLevel !== 'tutorial') {
      // BGM音量調整開始
      if (bgmAudio) {
        console.log('BGM音量調整を開始します（13秒から）');
      }
    }
    
    // 残り13秒〜1秒の間、BGM音量を毎秒調整（チュートリアル以外）
    if (timeRemaining <= 13 && timeRemaining > 0 && bgmAudio && selectedLevel !== 'tutorial') {
      const targetVolume = 0; // 0%
      const initialVolume = bgmVolume * 0.3; // 設定された音量の30%
      const volumeRange = initialVolume - targetVolume;
      const fadeProgress = (13 - timeRemaining) / 13; // 13秒間で0から1へ
      bgmAudio.volume = initialVolume - (volumeRange * fadeProgress);
      console.log('BGM音量を調整:', bgmAudio.volume);
    }
    
    // 0:00になったら止めて時間切れとして認識
    if (timeRemaining === 0 && minutes === 0 && seconds === 0) {
      timerText.textContent = "0:00";
      console.log('時間切れ：0:00 - 止めて時間切れ');
      
      // 背景は既に黒色になっているはず（チュートリアル以外）
      if (selectedLevel !== 'tutorial') {
        console.log('背景は完全に黒色です');
        
        // BGMを停止（チュートリアル以外）
        stopBGM();
        console.log('0:00 - chareを停止しました');
      }
      
      // ゲームオーバー処理
      setTimeout(() => {
        gameOver();
      }, 100); // 100ms後にゲームオーバー
    } else {
      timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // タイマーが10秒以下になったらBGMを停止
      if (timeRemaining === 0) {
        setTimeout(() => {
          stopBGM();
          console.log('時間切れ：0:00 - BGM停止');
        }, 0); // 即時実行
      }
    }
  }
}

// ゲームオーバー関数
function gameOver() {
  // チュートリアルの場合はゲームオーバー処理をしない
  if (selectedLevel === 'tutorial') {
    return;
  }
  
  // タイマーを停止
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  // カード操作をロック
  lock = true;
  
  // 全てのカードのクリックイベントを無効化
  const allCards = document.querySelectorAll('.card');
  allCards.forEach(card => {
    card.style.pointerEvents = 'none';
    card.style.cursor = 'default';
  });
  
  // 効果音を再生
  playGameOverSound();
  
  // ゲームオーバーメッセージを表示
  const messageDiv = document.createElement("div");
  messageDiv.className = "game-over-message";
  messageDiv.textContent = "ゲームオーバー";
  document.body.appendChild(messageDiv);
  
  // 「out」画像を永続表示
  showGameOverImage();
  
  // 自動で戻らない（コメントアウト）
  // setTimeout(() => {
  //   if (messageDiv.parentNode) {
  //     messageDiv.remove();
  //   }
  //   backToStart();
  // }, 3000);
}

// クリア効果音再生関数
function playClearSound() {
  try {
    console.log('クリア効果音の再生を試みます...');
    
    // 絶対パスで直接MP3ファイルを指定
    const audio = new Audio();
    
    // デスクトップの絶対パスを直接設定
    const desktopPath = 'file:///C:/Users/伊藤　楓/OneDrive/ドキュメント/デスクトップ/coingame.mp3';
    
    console.log('デスクトップの絶対パスを設定:', desktopPath);
    
    audio.src = desktopPath;
    audio.type = 'audio/mpeg';
    audio.volume = 0.8;
    
    // 音声ファイルの読み込みを待機
    audio.addEventListener('canplaythrough', function() {
      console.log('クリア効果音の読み込み完了、再生を開始します');
      console.log('音声タイプ:', audio.type);
      console.log('音声ソース:', audio.src);
      console.log('音声の現在時刻:', audio.currentTime);
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('クリア効果音再生成功');
        }).catch(error => {
          console.log('クリア効果音の再生に失敗しました:', error);
          console.log('失敗時の音声ソース:', audio.src);
          
          // 少し遅延して再試みる
          setTimeout(() => {
            audio.play();
          }, 200);
        });
      } else {
        // 古いブラウザ対応
        audio.play();
        console.log('クリア効果音再生成功（古いブラウザ）');
      }
    });
    
    // 読み込みエラーの場合
    audio.addEventListener('error', function(error) {
      console.log('クリア効果音の読み込みエラー:', error);
      console.log('エラーオブジェクト:', error.target.error);
      console.log('失敗時の音声ソース:', audio.src);
      
      // 少し遅延して再試みる
      setTimeout(() => {
        audio.play();
      }, 300);
    });
    
  } catch (error) {
    console.log('クリア効果音の作成に失敗しました:', error);
  }
}

// 代替再生方法
function tryAlternativePlay() {
  try {
    console.log('代替方法でクリア効果音を再生します...');
    const altAudio = new Audio('coingame.mp3');
    altAudio.volume = 0.8;
    altAudio.play().then(() => {
      console.log('代替方法でのクリア効果音再生成功');
    }).catch(error => {
      console.log('代替方法でも再生に失敗しました:', error);
    });
  } catch (error) {
    console.log('代替方法の作成に失敗しました:', error);
  }
}

// ゲームオーバー効果音再生関数
function playGameOverSound() {
  // 重複再生を防止
  if (isGameOverSoundPlaying) {
    console.log('ゲームオーバー効果音は既に再生中です');
    return;
  }
  
  isGameOverSoundPlaying = true;
  
  try {
    const audio = new Audio('sounds/batu.mp3');
    audio.volume = sfxVolume; // 設定された効果音音量を使用
    
    // 再生完了時にフラグをリセット
    audio.onended = () => {
      isGameOverSoundPlaying = false;
      console.log('ゲームオーバー効果音の再生完了');
    };
    
    audio.play().then(() => {
      console.log('ゲームオーバー効果音再生成功');
    }).catch(error => {
      console.log('ゲームオーバー効果音の再生に失敗しました:', error);
      // エラー時もフラグをリセット
      isGameOverSoundPlaying = false;
      
      // 少し遅延して再試みる
      setTimeout(() => {
        if (!isGameOverSoundPlaying) { // 再度チェック
          audio.play();
        }
      }, 200);
    });
  } catch (error) {
    console.log('ゲームオーバー効果音の作成に失敗しました:', error);
    isGameOverSoundPlaying = false;
  }
}

// レベル選択画面を表示
function showLevelSelection() {
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('level-selection-screen').style.display = 'flex';
}

// スタート画面に戻る
function backToStartScreen() {
  document.getElementById('level-selection-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
}

// スタート画面に戻る関数
function backToStart() {
  // 全ての画面要素を非表示にする
  document.getElementById('level-selection-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  
  // 全ての動的要素を一度に削除（効率化）
  const dynamicElements = document.querySelectorAll('div[style*="game-over-message"], div[style*="bottom: 5%"], #game-over-image, #x-message, #shuffle-image, .game-over-message, .stage5-image, .stage6-image, .stage7-image, .stage8-image, .stage9-image, .stage10-image, .stage11-image, .stage12-image, .stage13-image');
  dynamicElements.forEach(elem => elem.remove());
  
  // 背景を白に戻す
  document.body.style.backgroundColor = 'white';
  
  // BGMを停止
  stopBGM();
  
  // ゲーム状態をリセット
  resetGame();
  
  // タイマーが残っていれば停止
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // ロック状態を解除
  lock = false;
}

// ゲーム初期化関数
function initializeGame() {
  const board = document.getElementById("board");
  board.innerHTML = "";
  
  // グローバル変数をリセット
  lastDrawnNumber = null;
  drawnCards = [];
  xCardCounts = {};
  lock = true; // タイマー開始までカード操作をロック
  
  // タイマーをリセット
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  timeRemaining = 60;
  updateTimerDisplay();
  
  // チュートリアルの場合はタイマーを非表示
  if (selectedLevel === 'tutorial') {
    document.getElementById('timer-display').style.display = 'none';
    document.getElementById('game-header-image').style.display = 'block';
  } else {
    document.getElementById('timer-display').style.display = 'block';
    document.getElementById('game-header-image').style.display = 'none';
  }
  
  // レベルに応じてクラスを設定
  board.className = "";
  if (selectedLevel === 'tutorial') {
    board.classList.add("tutorial");
  } else {
    // 通常レベル時は画像を非表示
    document.querySelector('.game-side-images').classList.remove('show');
  }
  
  if (selectedLevel >= 4 && selectedLevel <= 10) {
    board.classList.add("level-" + selectedLevel);
  }
  
  const cards = getCardsForLevel(selectedLevel);
  let totalSlots;
  
  if (selectedLevel === 'tutorial') {
    totalSlots = 6; // 2×3
  } else if (selectedLevel === 4) {
    totalSlots = 6; // 2×3（チャレンジモードのレベル4）
  } else if (selectedLevel >= 5 && selectedLevel <= 6) {
    totalSlots = 8; // 2×4
  } else if (selectedLevel === 7) {
    totalSlots = 9; // 3×3
  } else if (selectedLevel >= 8 && selectedLevel <= 10) {
    totalSlots = 12; // 3×4
  } else {
    totalSlots = 12; // 4×3（デフォルト）
  }
  
  cards.forEach((cardValue, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.value = cardValue;
    card.dataset.position = index + 1;
    
    const cardFront = document.createElement("div");
    cardFront.className = "card-face card-front position-number";
    cardFront.textContent = String.fromCharCode(65 + index);
    
    const cardBack = document.createElement("div");
    cardBack.className = "card-face card-back";
    
    if (cardValue === 'red-x') {
      cardBack.style.backgroundColor = "pink";
      const redImg = document.createElement("img");
      redImg.src = "images/ミリちゃん_N.png";
      redImg.style.cssText = "width: 85%; height: 85%; object-fit: contain;";
      cardBack.appendChild(redImg);
    } else if (cardValue === 'blue-x') {
      cardBack.style.backgroundColor = "lightblue";
      const blueImg = document.createElement("img");
      blueImg.src = "images/ミリちゃん_N.png";
      blueImg.style.cssText = "width: 85%; height: 85%; object-fit: contain;";
      cardBack.appendChild(blueImg);
    } else {
      cardBack.setAttribute('data-number', cardValue);
      cardBack.textContent = cardValue;
    }
    
    card.appendChild(cardFront);
    card.appendChild(cardBack);

    // イベントリスナーを一度だけ登録
    card.addEventListener('click', function handleClick(e) {
      console.log('カードクリック:', cardValue, 'lock:', lock, 'open:', card.classList.contains("open"));
      if (lock || card.classList.contains("open")) {
        console.log('クリック無効: lock=' + lock + ', open=' + card.classList.contains("open"));
        return;
      }
      lock = true;
      card.classList.add("open");
      console.log('カードめくり実行:', cardValue);

      if (cardValue === 'red-x' || cardValue === 'blue-x') {
        // ×カードの引いた回数を記録
        xCardCounts[cardValue] = (xCardCounts[cardValue] || 0) + 1;
        
        // 数字の昇順をリセット
        lastDrawnNumber = null;
        drawnCards = [];
        
        if (selectedLevel === 'tutorial') {
          // チュートリアルの場合：常に「アクマにご注意！」のみ表示
          showXCardMessage("ミリちゃんに注意！");
          setTimeout(() => {
            flipAllCardsBack(); // 全てのカードを裏に戻す
            lock = false;
          }, 1000);
        } else {
          // 通常のレベル設定
          if (xCardCounts[cardValue] === 1) {
            // 1回目：警告メッセージ
            showXCardMessage("ミリちゃんに注意！");
            setTimeout(() => {
              flipAllCardsBack(); // 全てのカードを裏に戻す
              lock = false;
            }, 1000);
          } else if (xCardCounts[cardValue] === 2) {
            // 2回目：シャッフルメッセージと画像
            showXCardMessage(getShuffleMessage());
            showShuffleImage();
            setTimeout(() => {
              flipAllCardsBack(); // 全てのカードを裏に戻す
              shuffleCards();
              // 全ての×カードのカウントをリセット
              xCardCounts = {};
              lock = false;
            }, 1000);
          } else {
            // 3回目以降：通常のリセット
            setTimeout(() => {
              flipAllCardsBack(); // 全てのカードを裏に戻す
              resetGame();
              lock = false;
            }, 1000);
          }
        }
        return;
      }

      if (lastDrawnNumber === null) {
        // 最初のカード
        lastDrawnNumber = cardValue;
        drawnCards.push(cardValue); // 引いたカードを記録
        lock = false;
      } else {
        if (cardValue === lastDrawnNumber + 1) {
          // 昇順が続いている場合
          lastDrawnNumber = cardValue;
          drawnCards.push(cardValue); // 引いたカードを記録
          lock = false;
          
          // クリア条件のチェック：1から始まって全ての数字カードが表になっているか
          const allNumbersDrawn = drawnCards.filter(card => typeof card === 'number');
          
          let requiredNumbers;
          let isCompleteClear;
          
          if (selectedLevel === 'tutorial') {
            // チュートリアルの場合：1〜4の数字カードがすべて引かれたらクリア
            requiredNumbers = [1, 2, 3, 4];
            isCompleteClear = allNumbersDrawn.length === requiredNumbers.length &&
                            requiredNumbers.every(num => allNumbersDrawn.includes(num));
          } else {
            // 通常のレベル設定
            requiredNumbers = Array.from({length: selectedLevel}, (_, i) => i + 1);
            isCompleteClear = allNumbersDrawn.length === requiredNumbers.length &&
                            requiredNumbers.every(num => allNumbersDrawn.includes(num)) &&
                            allNumbersDrawn[0] === 1;
          }
          
          if (isCompleteClear) {
            showClearMessage();
            lock = false;
          } else {
            lock = false;
          }
        } else {
          // 昇順が途切れた場合
          setTimeout(() => {
            flipAllCardsBack(); // 全てのカードを裏に戻す
            lastDrawnNumber = null;
            drawnCards = [];
            // xCardCountsはリセットしない（×カードの進行状況を維持）
            lock = false;
          }, 1000);
        }
      }
    });

    board.appendChild(card);
  });
  
  // 空きスロットを追加
  for (let i = cards.length; i < totalSlots; i++) {
    const emptySlot = document.createElement("div");
    emptySlot.className = "empty-slot";
    board.appendChild(emptySlot);
  }
  
  // 巻き戻しボタンを非表示にする
  const rewindBtn = document.getElementById("rewind-btn");
  if (rewindBtn) {
    rewindBtn.style.display = "none";
  }
}

// ゲームをリセット
function resetGame() {
  lastDrawnNumber = null;
  drawnCards = []; // 引いたカード記録もリセット
  xCardCounts = {}; // ×カードの引いた回数もリセット
  const allCards = document.querySelectorAll(".card");
  allCards.forEach(card => {
    card.classList.remove("open");
  });
  // メッセージをクリア
  const messageDiv = document.getElementById("message");
  if (messageDiv) {
    messageDiv.textContent = "";
  }
}

// ×カードのメッセージ表示
function showXCardMessage(message) {
  // 既存のメッセージを削除
  const existingMessage = document.getElementById("x-message");
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // 新しいメッセージを作成
  const messageDiv = document.createElement("div");
  messageDiv.id = "x-message";
  messageDiv.style.cssText = `
    position: fixed;
    bottom: 5%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(138, 43, 226, 0.8);
    color: white;
    padding: 1.5vw 3vw;
    border-radius: 1vw;
    font-size: 2.5vw;
    z-index: 1000;
    font-family: 'JF-Dot-Kaname12', monospace;
  `;
  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);
  
  // 「シャッフルします♪」の場合は画像も表示
  if (message.includes("シャッフル")) {
    showShuffleImage();
  }
  
  // 1.0秒後にメッセージを削除
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 1000);
}

// ステージ9専用画像を表示
function showStage9Images() {
  // ステージ9画像設定
  const stage9Config = {
    leftImage: {
      src: "images/ゆらぎ_N.png",
      top: "48.5%",
      left: "16%",
      maxWidth: "29vw",
      maxHeight: "39vw"
    },
    rightImage: {
      src: "images/ミリちゃん_N.png",
      top: "53%",
      right: "18%",
      maxWidth: "18vw",
      maxHeight: "27vw"
    }
  };
  
  // 既存の画像を削除
  const existingImages = document.querySelectorAll('.stage9-image');
  existingImages.forEach(img => img.remove());
  
  // 左側の画像
  const leftImage = document.createElement("div");
  leftImage.className = "stage9-image";
  leftImage.style.cssText = `
    position: fixed;
    top: ${stage9Config.leftImage.top};
    left: ${stage9Config.leftImage.left};
    transform: translate(-50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const leftImg = document.createElement("img");
  leftImg.src = stage9Config.leftImage.src;
  leftImg.style.cssText = `
    max-width: ${stage9Config.leftImage.maxWidth};
    max-height: ${stage9Config.leftImage.maxHeight};
    object-fit: contain;
  `;
  
  leftImage.appendChild(leftImg);
  document.body.appendChild(leftImage);
  
  // 右側の画像
  const rightImage = document.createElement("div");
  rightImage.className = "stage9-image";
  rightImage.style.cssText = `
    position: fixed;
    top: ${stage9Config.rightImage.top};
    right: ${stage9Config.rightImage.right};
    transform: translate(50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const rightImg = document.createElement("img");
  rightImg.src = stage9Config.rightImage.src;
  rightImg.style.cssText = `
    max-width: ${stage9Config.rightImage.maxWidth};
    max-height: ${stage9Config.rightImage.maxHeight};
    object-fit: contain;
  `;
  
  rightImage.appendChild(rightImg);
  document.body.appendChild(rightImage);
}

// ステージ10専用画像を表示
function showStage10Images() {
  // ステージ10画像設定
  const stage10Config = {
    leftImage: {
      src: "images/こま_N.png",
      top: "47.5%",
      left: "17%",
      maxWidth: "29vw",
      maxHeight: "39vw"
    },
    rightImage: {
      src: "images/ミリちゃん_N.png",
      top: "52%",
      right: "18%",
      maxWidth: "18vw",
      maxHeight: "27vw"
    }
  };
  
  // 既存の画像を削除
  const existingImages = document.querySelectorAll('.stage10-image');
  existingImages.forEach(img => img.remove());
  
  // 左側の画像
  const leftImage = document.createElement("div");
  leftImage.className = "stage10-image";
  leftImage.style.cssText = `
    position: fixed;
    top: ${stage10Config.leftImage.top};
    left: ${stage10Config.leftImage.left};
    transform: translate(-50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const leftImg = document.createElement("img");
  leftImg.src = stage10Config.leftImage.src;
  leftImg.style.cssText = `
    max-width: ${stage10Config.leftImage.maxWidth};
    max-height: ${stage10Config.leftImage.maxHeight};
    object-fit: contain;
  `;
  
  leftImage.appendChild(leftImg);
  document.body.appendChild(leftImage);
  
  // 右側の画像
  const rightImage = document.createElement("div");
  rightImage.className = "stage10-image";
  rightImage.style.cssText = `
    position: fixed;
    top: ${stage10Config.rightImage.top};
    right: ${stage10Config.rightImage.right};
    transform: translate(50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const rightImg = document.createElement("img");
  rightImg.src = stage10Config.rightImage.src;
  rightImg.style.cssText = `
    max-width: ${stage10Config.rightImage.maxWidth};
    max-height: ${stage10Config.rightImage.maxHeight};
    object-fit: contain;
  `;
  
  rightImage.appendChild(rightImg);
  document.body.appendChild(rightImage);
}

// ステージ11専用画像を表示
function showStage11Images() {
  // ステージ11画像設定
  const stage11Config = {
    leftImage: {
      src: "images/雨夜リズ_N.png",
      top: "46%",
      left: "15.5%",
      maxWidth: "29vw",
      maxHeight: "39vw"
    },
    rightImage: {
      src: "images/ミリちゃん_N.png",
      top: "52%",
      right: "18%",
      maxWidth: "18vw",
      maxHeight: "27vw"
    }
  };
  
  // 既存の画像を削除
  const existingImages = document.querySelectorAll('.stage11-image');
  existingImages.forEach(img => img.remove());
  
  // 左側の画像
  const leftImage = document.createElement("div");
  leftImage.className = "stage11-image";
  leftImage.style.cssText = `
    position: fixed;
    top: ${stage11Config.leftImage.top};
    left: ${stage11Config.leftImage.left};
    transform: translate(-50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const leftImg = document.createElement("img");
  leftImg.src = stage11Config.leftImage.src;
  leftImg.style.cssText = `
    max-width: ${stage11Config.leftImage.maxWidth};
    max-height: ${stage11Config.leftImage.maxHeight};
    object-fit: contain;
  `;
  
  leftImage.appendChild(leftImg);
  document.body.appendChild(leftImage);
  
  // 右側の画像
  const rightImage = document.createElement("div");
  rightImage.className = "stage11-image";
  rightImage.style.cssText = `
    position: fixed;
    top: ${stage11Config.rightImage.top};
    right: ${stage11Config.rightImage.right};
    transform: translate(50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const rightImg = document.createElement("img");
  rightImg.src = stage11Config.rightImage.src;
  rightImg.style.cssText = `
    max-width: ${stage11Config.rightImage.maxWidth};
    max-height: ${stage11Config.rightImage.maxHeight};
    object-fit: contain;
  `;
  
  rightImage.appendChild(rightImg);
  document.body.appendChild(rightImage);
}

// ステージ12専用画像を表示
function showStage12Images() {
  // ステージ12画像設定
  const stage12Config = {
    leftImage: {
      src: "images/眠雲ツクリ_N.png",
      top: "46%",
      left: "17%",
      maxWidth: "29vw",
      maxHeight: "39vw"
    },
    rightImage: {
      src: "images/ミリちゃん_N.png",
      top: "52%",
      right: "18%",
      maxWidth: "18vw",
      maxHeight: "27vw"
    }
  };
  
  // 既存の画像を削除
  const existingImages = document.querySelectorAll('.stage12-image');
  existingImages.forEach(img => img.remove());
  
  // 左側の画像
  const leftImage = document.createElement("div");
  leftImage.className = "stage12-image";
  leftImage.style.cssText = `
    position: fixed;
    top: ${stage12Config.leftImage.top};
    left: ${stage12Config.leftImage.left};
    transform: translate(-50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const leftImg = document.createElement("img");
  leftImg.src = stage12Config.leftImage.src;
  leftImg.style.cssText = `
    max-width: ${stage12Config.leftImage.maxWidth};
    max-height: ${stage12Config.leftImage.maxHeight};
    object-fit: contain;
  `;
  
  leftImage.appendChild(leftImg);
  document.body.appendChild(leftImage);
  
  // 右側の画像
  const rightImage = document.createElement("div");
  rightImage.className = "stage12-image";
  rightImage.style.cssText = `
    position: fixed;
    top: ${stage12Config.rightImage.top};
    right: ${stage12Config.rightImage.right};
    transform: translate(50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const rightImg = document.createElement("img");
  rightImg.src = stage12Config.rightImage.src;
  rightImg.style.cssText = `
    max-width: ${stage12Config.rightImage.maxWidth};
    max-height: ${stage12Config.rightImage.maxHeight};
    object-fit: contain;
  `;
  
  rightImage.appendChild(rightImg);
  document.body.appendChild(rightImage);
}

// ステージ13専用画像を表示
function showStage13Images() {
  // ステージ13画像設定
  const stage13Config = {
    leftImage: {
      src: "images/虹深゜ぬふ_N.png",
      top: "46%",
      left: "17%",
      maxWidth: "29vw",
      maxHeight: "39vw"
    },
    rightImage: {
      src: "images/ミリちゃん_N.png",
      top: "52%",
      right: "18%",
      maxWidth: "18vw",
      maxHeight: "27vw"
    }
  };
  
  // 既存の画像を削除
  const existingImages = document.querySelectorAll('.stage13-image');
  existingImages.forEach(img => img.remove());
  
  // 左側の画像
  const leftImage = document.createElement("div");
  leftImage.className = "stage13-image";
  leftImage.style.cssText = `
    position: fixed;
    top: ${stage13Config.leftImage.top};
    left: ${stage13Config.leftImage.left};
    transform: translate(-50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const leftImg = document.createElement("img");
  leftImg.src = stage13Config.leftImage.src;
  leftImg.style.cssText = `
    max-width: ${stage13Config.leftImage.maxWidth};
    max-height: ${stage13Config.leftImage.maxHeight};
    object-fit: contain;
  `;
  
  leftImage.appendChild(leftImg);
  document.body.appendChild(leftImage);
  
  // 右側の画像
  const rightImage = document.createElement("div");
  rightImage.className = "stage13-image";
  rightImage.style.cssText = `
    position: fixed;
    top: ${stage13Config.rightImage.top};
    right: ${stage13Config.rightImage.right};
    transform: translate(50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const rightImg = document.createElement("img");
  rightImg.src = stage13Config.rightImage.src;
  rightImg.style.cssText = `
    max-width: ${stage13Config.rightImage.maxWidth};
    max-height: ${stage13Config.rightImage.maxHeight};
    object-fit: contain;
  `;
  
  rightImage.appendChild(rightImg);
  document.body.appendChild(rightImage);
}

// ステージ8専用画像を表示
function showStage8Images() {
  // ステージ8画像設定
  const stage8Config = {
    leftImage: {
      src: "images/らこ_N.png",
      top: "46.5%",
      left: "18%",
      maxWidth: "29vw",
      maxHeight: "39vw"
    },
    rightImage: {
      src: "images/ミリちゃん_N.png",
      top: "52%",
      right: "18%",
      maxWidth: "18vw",
      maxHeight: "27vw"
    }
  };
  
  // 既存の画像を削除
  const existingImages = document.querySelectorAll('.stage8-image');
  existingImages.forEach(img => img.remove());
  
  // 左側の画像
  const leftImage = document.createElement("div");
  leftImage.className = "stage8-image";
  leftImage.style.cssText = `
    position: fixed;
    top: ${stage8Config.leftImage.top};
    left: ${stage8Config.leftImage.left};
    transform: translate(-50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const leftImg = document.createElement("img");
  leftImg.src = stage8Config.leftImage.src;
  leftImg.style.cssText = `
    max-width: ${stage8Config.leftImage.maxWidth};
    max-height: ${stage8Config.leftImage.maxHeight};
    object-fit: contain;
  `;
  
  leftImage.appendChild(leftImg);
  document.body.appendChild(leftImage);
  
  // 右側の画像
  const rightImage = document.createElement("div");
  rightImage.className = "stage8-image";
  rightImage.style.cssText = `
    position: fixed;
    top: ${stage8Config.rightImage.top};
    right: ${stage8Config.rightImage.right};
    transform: translate(50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const rightImg = document.createElement("img");
  rightImg.src = stage8Config.rightImage.src;
  rightImg.style.cssText = `
    max-width: ${stage8Config.rightImage.maxWidth};
    max-height: ${stage8Config.rightImage.maxHeight};
    object-fit: contain;
  `;
  
  rightImage.appendChild(rightImg);
  document.body.appendChild(rightImage);
}

// ステージ7専用画像を表示
function showStage7Images() {
  // ステージ7画像設定
  const stage7Config = {
    leftImage: {
      src: "images/あくび_N.png",
      top: "47.5%",
      left: "18.4%",
      maxWidth: "29vw",
      maxHeight: "39vw"
    },
    rightImage: {
      src: "images/ミリちゃん_N.png",
      top: "52%",
      right: "20.5%",
      maxWidth: "18vw",
      maxHeight: "27vw"
    }
  };
  
  // 既存の画像を削除
  const existingImages = document.querySelectorAll('.stage7-image');
  existingImages.forEach(img => img.remove());
  
  // 左側の画像
  const leftImage = document.createElement("div");
  leftImage.className = "stage7-image";
  leftImage.style.cssText = `
    position: fixed;
    top: ${stage7Config.leftImage.top};
    left: ${stage7Config.leftImage.left};
    transform: translate(-50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const leftImg = document.createElement("img");
  leftImg.src = stage7Config.leftImage.src;
  leftImg.style.cssText = `
    max-width: ${stage7Config.leftImage.maxWidth};
    max-height: ${stage7Config.leftImage.maxHeight};
    object-fit: contain;
  `;
  
  leftImage.appendChild(leftImg);
  document.body.appendChild(leftImage);
  
  // 右側の画像
  const rightImage = document.createElement("div");
  rightImage.className = "stage7-image";
  rightImage.style.cssText = `
    position: fixed;
    top: ${stage7Config.rightImage.top};
    right: ${stage7Config.rightImage.right};
    transform: translate(50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const rightImg = document.createElement("img");
  rightImg.src = stage7Config.rightImage.src;
  rightImg.style.cssText = `
    max-width: ${stage7Config.rightImage.maxWidth};
    max-height: ${stage7Config.rightImage.maxHeight};
    object-fit: contain;
  `;
  
  rightImage.appendChild(rightImg);
  document.body.appendChild(rightImage);
}

// ステージ6専用画像を表示
function showStage6Images() {
  // ステージ6画像設定
  const stage6Config = {
    leftImage: {
      src: "images/のの_N.png",
      top: "45%",
      left: "16%",
      maxWidth: "29vw",
      maxHeight: "39vw"
    },
    rightImage: {
      src: "images/ミリちゃん_N.png",
      top: "52%",
      right: "18%",
      maxWidth: "18vw",
      maxHeight: "27vw"
    }
  };
  
  // 既存の画像を削除
  const existingImages = document.querySelectorAll('.stage6-image');
  existingImages.forEach(img => img.remove());
  
  // 左側の画像
  const leftImage = document.createElement("div");
  leftImage.className = "stage6-image";
  leftImage.style.cssText = `
    position: fixed;
    top: ${stage6Config.leftImage.top};
    left: ${stage6Config.leftImage.left};
    transform: translate(-50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const leftImg = document.createElement("img");
  leftImg.src = stage6Config.leftImage.src;
  leftImg.style.cssText = `
    max-width: ${stage6Config.leftImage.maxWidth};
    max-height: ${stage6Config.leftImage.maxHeight};
    object-fit: contain;
  `;
  
  leftImage.appendChild(leftImg);
  document.body.appendChild(leftImage);
  
  // 右側の画像
  const rightImage = document.createElement("div");
  rightImage.className = "stage6-image";
  rightImage.style.cssText = `
    position: fixed;
    top: ${stage6Config.rightImage.top};
    right: ${stage6Config.rightImage.right};
    transform: translate(50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const rightImg = document.createElement("img");
  rightImg.src = stage6Config.rightImage.src;
  rightImg.style.cssText = `
    max-width: ${stage6Config.rightImage.maxWidth};
    max-height: ${stage6Config.rightImage.maxHeight};
    object-fit: contain;
  `;
  
  rightImage.appendChild(rightImg);
  document.body.appendChild(rightImage);
}

// ステージ5専用画像を表示
function showStage5Images() {
  // ステージ5画像設定
  const stage5Config = {
    leftImage: {
      src: "images/このみ_N.png",
      top: "46%",
      left: "15.5%",
      maxWidth: "29vw",
      maxHeight: "39vw"
    },
    rightImage: {
      src: "images/ミリちゃん_N.png",
      top: "52%",
      right: "18%",
      maxWidth: "18vw",
      maxHeight: "27vw"
    }
  };
  
  // 既存の画像を削除
  const existingImages = document.querySelectorAll('.stage5-image');
  existingImages.forEach(img => img.remove());
  
  // 左側の画像
  const leftImage = document.createElement("div");
  leftImage.className = "stage5-image";
  leftImage.style.cssText = `
    position: fixed;
    top: ${stage5Config.leftImage.top};
    left: ${stage5Config.leftImage.left};
    transform: translate(-50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const leftImg = document.createElement("img");
  leftImg.src = stage5Config.leftImage.src;
  leftImg.style.cssText = `
    max-width: ${stage5Config.leftImage.maxWidth};
    max-height: ${stage5Config.leftImage.maxHeight};
    object-fit: contain;
  `;
  
  leftImage.appendChild(leftImg);
  document.body.appendChild(leftImage);
  
  // 右側の画像
  const rightImage = document.createElement("div");
  rightImage.className = "stage5-image";
  rightImage.style.cssText = `
    position: fixed;
    top: ${stage5Config.rightImage.top};
    right: ${stage5Config.rightImage.right};
    transform: translate(50%, -50%);
    z-index: 998;
    pointer-events: none;
  `;
  
  const rightImg = document.createElement("img");
  rightImg.src = stage5Config.rightImage.src;
  rightImg.style.cssText = `
    max-width: ${stage5Config.rightImage.maxWidth};
    max-height: ${stage5Config.rightImage.maxHeight};
    object-fit: contain;
  `;
  
  rightImage.appendChild(rightImg);
  document.body.appendChild(rightImage);
}

// ゲームオーバー画像を表示
function showGameOverImage() {
  // 既存のゲームオーバー画像を削除
  const existingImage = document.getElementById("game-over-image");
  if (existingImage) {
    existingImage.remove();
  }
  
  // 新しい画像を作成
  const imageContainer = document.createElement("div");
  imageContainer.id = "game-over-image";
  imageContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1002;
    pointer-events: none;
  `;
  
  const img = document.createElement("img");
  img.src = "images/ミリちゃん_Y1.png";
  img.style.cssText = "width: 35vw; height: auto; opacity: 1;";
  
  imageContainer.appendChild(img);
  document.body.appendChild(imageContainer);
}

// シャッフルメッセージの候補をランダムに選択
function getShuffleMessage() {
  const messages = [
    "シャッフルします",
    "カードをまぜますね",
    "あきらめないでくださいね",
    "シャッフルタイム♪",
    "引いちゃいましたね",
    "ふふふ．．．",
    "間に合いますか？",
    "進捗はどうですか？"
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// 全てのカードを裏に戻す
function flipAllCardsBack() {
  const allCards = document.querySelectorAll(".card");
  allCards.forEach(card => {
    card.classList.remove("open");
  });
}

// シャッフル画像を表示
function showShuffleImage() {
  // 既存のミリちゃん画像を削除
  const existingMirichanImage = document.getElementById("mirichan-image");
  if (existingMirichanImage) {
    existingMirichanImage.remove();
  }
  
  // ミリちゃん画像を表示
  const mirichanImageContainer = document.createElement("div");
  mirichanImageContainer.id = "mirichan-image";
  mirichanImageContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1002;
    pointer-events: none;
  `;
  
  const mirichanImg = document.createElement("img");
  mirichanImg.src = "images/ミリちゃん_A.png";
  mirichanImg.style.cssText = "width: 37vw; height: auto; opacity: 1;";
  
  mirichanImageContainer.appendChild(mirichanImg);
  document.body.appendChild(mirichanImageContainer);
  
  // 1.0秒後に画像を削除
  setTimeout(() => {
    const mirichanImage = document.getElementById("mirichan-image");
    if (mirichanImage) {
      mirichanImage.remove();
    }
  }, 1000);
}

// カードをシャッフル
function shuffleCards() {
  const board = document.getElementById("board");
  const allChildren = Array.from(board.children);
  
  // 空きスロットの位置を記録
  const emptySlots = [];
  const cardElements = [];
  
  allChildren.forEach((child, index) => {
    if (child.classList.contains("empty-slot")) {
      emptySlots.push({element: child, index: index});
    } else {
      cardElements.push(child);
    }
  });
  
  // カードのみをシャッフル
  cardElements.sort(() => Math.random() - 0.5);
  
  // ボードをクリア
  board.innerHTML = "";
  
  // 元の位置に空きスロットを配置
  const totalElements = emptySlots.length + cardElements.length;
  for (let i = 0; i < totalElements; i++) {
    const isEmptySlot = emptySlots.some(slot => slot.index === i);
    if (isEmptySlot) {
      const emptySlot = emptySlots.find(slot => slot.index === i);
      board.appendChild(emptySlot.element);
    } else {
      const card = cardElements.shift();
      if (card) {
        board.appendChild(card);
        // イベントリスナーを再設定
        setupCardEventListeners(card);
      }
    }
  }
}

// カードのイベントリスナーを設定する関数
function setupCardEventListeners(card) {
  const cardValue = card.dataset.value;
  
  // 既存のイベントリスナーを削除して再設定
  card.removeEventListener('click', card.handleClick);
  
  card.handleClick = function(e) {
    console.log('カードクリック:', cardValue, 'lock:', lock, 'open:', card.classList.contains("open"));
    if (lock || card.classList.contains("open")) {
      console.log('クリック無効: lock=' + lock + ', open=' + card.classList.contains("open"));
      return;
    }
    lock = true;
    card.classList.add("open");
    console.log('カードめくり実行:', cardValue);

    if (cardValue === 'red-x' || cardValue === 'blue-x') {
      // ×カードの引いた回数を記録
      xCardCounts[cardValue] = (xCardCounts[cardValue] || 0) + 1;
      
      // 数字の昇順をリセット
      lastDrawnNumber = null;
      drawnCards = [];
      
      if (xCardCounts[cardValue] === 1) {
        // 1回目：警告メッセージ
        showXCardMessage("アクマにご注意！");
        setTimeout(() => {
          flipAllCardsBack(); // 全てのカードを裏に戻す
          lock = false;
        }, 1000);
      } else if (xCardCounts[cardValue] === 2) {
        // 2回目：シャッフルメッセージと画像
        showXCardMessage(getShuffleMessage());
        showShuffleImage();
        setTimeout(() => {
          flipAllCardsBack(); // 全てのカードを裏に戻す
          shuffleCards();
          // 全ての×カードのカウントをリセット
          xCardCounts = {};
          lock = false;
        }, 1000);
      } else {
        // 3回目以降：通常のリセット
        setTimeout(() => {
          flipAllCardsBack(); // 全てのカードを裏に戻す
          resetGame();
          lock = false;
        }, 1000);
      }
      return;
    }

    if (lastDrawnNumber === null) {
      // 最初のカード
      lastDrawnNumber = cardValue;
      drawnCards.push(cardValue); // 引いたカードを記録
      lock = false;
    } else {
      // 2枚目以降のカード
      if (cardValue > lastDrawnNumber) {
        // 昇順の場合
        lastDrawnNumber = cardValue;
        drawnCards.push(cardValue); // 引いたカードを記録
        
        // クリア条件のチェック：1から始まって全ての数字カードが表になっているか
        const allNumbersDrawn = drawnCards.filter(card => typeof card === 'number');
        const requiredNumbers = Array.from({length: selectedLevel}, (_, i) => i + 1);
        
        const isCompleteClear = allNumbersDrawn.length === requiredNumbers.length &&
                                requiredNumbers.every(num => allNumbersDrawn.includes(num)) &&
                                allNumbersDrawn[0] === 1;
        
        if (isCompleteClear) {
          showClearMessage();
          lock = false;
        } else {
          lock = false;
        }
      } else {
        // 昇順が途切れた場合
        setTimeout(() => {
          flipAllCardsBack(); // 全てのカードを裏に戻す
          lastDrawnNumber = null;
          drawnCards = [];
          // xCardCountsはリセットしない（×カードの進行状況を維持）
          lock = false;
        }, 1000);
      }
    }
  };
  
  card.addEventListener('click', card.handleClick);
}

function showClearMessage() {
  console.log('=== ゲームクリア処理開始 ===');
  console.log('現在時刻:', new Date().toLocaleTimeString());
  
  // カード操作をロック（チュートリアルも含む）
  lock = true;
  
  const messageDiv = document.createElement("div");
  messageDiv.id = "clear-message";

  // チャレンジモードの場合はシンプルなボタンのみ
  if (challengeMode) {
    messageDiv.style.cssText = `
      position: fixed;
      bottom: 5%;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1002;
    `;
  } else {
    // 通常モードの場合は装飾付き
    messageDiv.style.cssText = `
      position: fixed;
      bottom: 5%;
      left: 50%;
      transform: translateX(-50%);
      background: black;
      padding: 1.5vw 3vw;
      border-radius: 1vw;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 1002;
      font-size: 2.8vw;
      font-weight: bold;
      font-family: 'ArmedLemon', 'JF-Dot-Kaname12', monospace;
      color: yellow;
      text-align: center;
      border: 3px solid yellow;
      white-space: pre-line;
    `;
  }
  
  // チャレンジモードの場合はボタンを表示
  if (challengeMode) {
    // レベル10の場合はすばらしい！、それ以外は次のステージへ
    const buttonText = (challengeCurrentLevel === 10) ? 'すばらしい！' : '次のステージへ';
    const buttonAction = (challengeCurrentLevel === 10) ? 'playTousenAndChangeText()' : 'challengeNextStage()';
    
    messageDiv.innerHTML = `<button class="next-stage-btn" onclick="${buttonAction}">${buttonText}</button>`;
  } else {
    messageDiv.textContent = `ゲームクリア！`;
  }
  
  console.log('クリアメッセージを作成しました');
  document.body.appendChild(messageDiv);
  console.log('クリアメッセージを画面に追加しました');
  
  // 全てのカードの裏面にclearedクラスを追加してHバージョン画像を表示
  const allCardBacks = document.querySelectorAll('.card-back');
  allCardBacks.forEach(cardBack => {
    cardBack.classList.add('cleared');
  });
  console.log('全てのカードをHバージョンに変更しました');
  
  // 「ゲームクリア！」のテキストが表示されたら各処理を実行
  setTimeout(() => {
    
    // 全てのカードのクリックイベントを無効化
    const allCards = document.querySelectorAll('.card');
    allCards.forEach(card => {
      card.style.pointerEvents = 'none';
      card.style.cursor = 'default';
    });
    
    // タイマーを停止
    if (timerInterval) {
      clearInterval(timerInterval);
      console.log('タイマーを停止しました');
    }
    
    // BGMを停止
    console.log('BGM停止を開始します...');
    stopBGM();
    console.log('BGM停止完了');
    
    // 背景を白に戻し、トランジションを即時適用
    document.body.style.transition = 'none';
    document.body.style.backgroundColor = 'white';
    console.log('背景を白色に戻しました');
    
    // 少し遅延してトランジションを元に戻す
    setTimeout(() => {
      document.body.style.transition = 'background-color 13s ease-in-out';
    }, 100);
    
    // 効果音を再生（chare、batuと同じ実装方法）
    console.log('クリア効果音再生を開始します...');
    playClearSound();
  }, 100); // メッセージ表示から100ms後に実行
  
  // 永久表示のため、削除処理をコメントアウト
  // setTimeout(() => {
  //   document.body.removeChild(messageDiv);
  // }, 5000);
}

// tousen効果音再生関数
function playTousenSound() {
  try {
    console.log('tousen効果音の再生を試みます...');
    
    const audio = new Audio();
    audio.src = 'sounds/tousen.mp3';
    audio.type = 'audio/mpeg';
    
    // Web Audio API の GainNode を使って音量を大きくする
    try {
      const audioContext = getAudioContext();
      const source = audioContext.createMediaElementSource(audio);
      const gainNode = audioContext.createGain();
      
      // 効果音音量を4倍に設定（HTMLAudioElement の 1.0 上限を超えて大きくできる）
      const gainValue = Math.min(sfxVolume * 4.0, 4.0);
      gainNode.gain.value = gainValue;
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      console.log('tousen効果音ゲイン設定:', gainValue);
    } catch (webAudioError) {
      // Web Audio API が使えない場合は従来の方法で最大音量に
      console.log('Web Audio API が使えないため通常の音量調整を使用:', webAudioError);
      audio.volume = Math.min(sfxVolume * 2.0, 1.0);
    }
    
    // 音声ファイルの読み込みを待機
    audio.addEventListener('canplaythrough', function() {
      console.log('tousen効果音の読み込み完了、再生を開始します');
      console.log('音声タイプ:', audio.type);
      console.log('音声ソース:', audio.src);
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('tousen効果音再生成功');
        }).catch(error => {
          console.log('tousen効果音の再生に失敗しました:', error);
          // 少し遅延して再試みる
          setTimeout(() => {
            audio.play();
          }, 200);
        });
      } else {
        // 古いブラウザ対応
        audio.play();
        console.log('tousen効果音再生開始（古いブラウザ）');
      }
    });
    
    // エラーハンドリング
    audio.addEventListener('error', function(e) {
      console.log('tousen効果音の読み込みエラー:', e);
      console.log('音声ファイルのパスを確認してください: sounds/tousen.mp3');
    });
    
  } catch (error) {
    console.log('tousen効果音の作成に失敗しました:', error);
  }
}

// レベル13用のすばらしいボタン関数
function playTousenAndChangeText() {
  // すばらしい！ボタンを無効化（1回のみ）
  event.target.disabled = true;
  
  // テキストを変更
  event.target.textContent = '全ステージクリア！おめでとう！';
  
  // 黒と黄色の装飾を追加
  event.target.style.cssText = `
    background: black;
    color: yellow;
    border: 3px solid yellow;
    padding: 1.5vw 3vw;
    border-radius: 1vw;
    font-size: 2.5vw;
    font-weight: bold;
    font-family: 'ArmedLemon', 'JF-Dot-Kaname12', monospace;
    cursor: pointer;
    margin-top: 1vw;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    text-align: center;
  `;
  
  // 効果音を再生
  playTousenSound();
}

function playTousenSoundAndFinish() {
  // ボタンを無効化（1回のみ）
  event.target.disabled = true;
  
  // 効果音を再生
  playTousenSound();
  
  // BGMを変更（クリア用BGMを再生）
  stopBGM();
  bgmAudio = new Audio('sounds/clear_bgm.mp3');
  bgmAudio.volume = bgmVolume * 0.3;
  bgmAudio.loop = true;
  bgmAudio.play().catch(e => console.log('BGM再生エラー:', e));
}

// クリア効果音再生関数
function playClearSound() {
  try {
    console.log('クリア効果音の再生を試みます...');
    
    const audio = new Audio();
    audio.src = 'sounds/coingame.mp3';
    audio.type = 'audio/mpeg';
    
    // Web Audio API の GainNode を使って音量を大きくする
    try {
      const audioContext = getAudioContext();
      const source = audioContext.createMediaElementSource(audio);
      const gainNode = audioContext.createGain();
      
      // 効果音音量を4倍に設定（HTMLAudioElement の 1.0 上限を超えて大きくできる）
      const gainValue = Math.min(sfxVolume * 4.0, 4.0);
      gainNode.gain.value = gainValue;
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      console.log('クリア効果音ゲイン設定:', gainValue);
    } catch (webAudioError) {
      // Web Audio API が使えない場合は従来の方法で最大音量に
      console.log('Web Audio API が使えないため通常の音量調整を使用:', webAudioError);
      audio.volume = Math.min(sfxVolume * 2.0, 1.0);
    }
    
    // 音声ファイルの読み込みを待機
    audio.addEventListener('canplaythrough', function() {
      console.log('クリア効果音の読み込み完了、再生を開始します');
      console.log('音声タイプ:', audio.type);
      console.log('音声ソース:', audio.src);
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('クリア効果音再生成功');
        }).catch(error => {
          console.log('クリア効果音の再生に失敗しました:', error);
          // 少し遅延して再試みる
          setTimeout(() => {
            audio.play();
          }, 200);
        });
      } else {
        // 古いブラウザ対応
        audio.play();
        console.log('クリア効果音再生成功（古いブラウザ）');
      }
    });
    
    // 読み込みエラーの場合
    audio.addEventListener('error', function(error) {
      console.log('クリア効果音の読み込みエラー:', error);
      console.log('エラーオブジェクト:', error.target.error);
      
      // 少し遅延して再試みる
      setTimeout(() => {
        audio.play();
      }, 300);
    });
    
  } catch (error) {
    console.log('クリア効果音の作成に失敗しました:', error);
  }
}

// チャレンジモードで次のステージへ進む関数
function challengeNextStage() {
  // クリアメッセージを削除
  const clearMessage = document.getElementById("clear-message");
  if (clearMessage) {
    document.body.removeChild(clearMessage);
  }
  
  // 次のレベルへ
  challengeCurrentLevel++;
  
  // 最終レベル（13）をクリアした場合
  if (challengeCurrentLevel > challengeMaxLevel) {
    // チャレンジモードを終了
    challengeMode = false;
    
    // いきなり装飾されたテキストを表示
    const completeMessage = document.createElement('div');
    completeMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: black;
      color: yellow;
      padding: 1.5vw 3vw;
      border-radius: 1vw;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      z-index: 1002;
      font-size: 2.5vw;
      font-weight: bold;
      font-family: 'JF-Dot-Kaname12', monospace;
      text-align: center;
      border: 3px solid yellow;
      white-space: pre-line;
    `;
    completeMessage.textContent = `全ステージクリア！\nおめでとう！`;
    document.body.appendChild(completeMessage);
    
    // tousen効果音を再生
    playTousenSound();
    
    return;
  }
  
  // 次のレベルをセットしてカード配置を準備
  selectedLevel = challengeCurrentLevel;
  
  // ゲームボードを準備（カード配置のみ、タイマーは開始しない）
  initializeGame();
  
  // スタートボタンを表示
  const startContainer = document.getElementById("game-start-container");
  if (startContainer) {
    startContainer.style.display = "block";
  }
}

// チャレンジモードのレベルを開始する関数
function startChallengeLevel() {
  // 準備メッセージを削除
  const messageDiv = document.querySelector('div[style*="position: fixed"]');
  if (messageDiv) {
    document.body.removeChild(messageDiv);
  }
  
  // 次のレベルをセットしてゲームを再初期化
  selectedLevel = challengeCurrentLevel;
  
  // ゲームを再初期化
  initializeGame();
  
  // タイマーを開始
  startTimer();
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', function() {
  // ホームボタン
  const homeBtn = document.getElementById('home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', function() {
      document.getElementById('home-confirm-dialog').style.display = 'block';
    });
  }
  
  // ホーム確認ダイアログのボタン
  const confirmHome = document.getElementById('confirm-home');
  if (confirmHome) {
    confirmHome.addEventListener('click', function() {
      // 全てのリセットと初期画面に戻る
      backToStart();
      document.getElementById('home-confirm-dialog').style.display = 'none';
      
      // ページを更新して完全に初期状態に戻す
      setTimeout(() => {
        location.reload();
      }, 100);
    });
  }
  
  const cancelHome = document.getElementById('cancel-home');
  if (cancelHome) {
    cancelHome.addEventListener('click', function() {
      document.getElementById('home-confirm-dialog').style.display = 'none';
    });
  }
  
  // 音量ボタン
  const volumeBtn = document.getElementById('volume-btn');
  if (volumeBtn) {
    volumeBtn.addEventListener('click', function() {
      document.getElementById('volume-panel').style.display = 'block';
    });
  }
  
  // 音量パネルの閉じるボタン
  const closeVolumePanel = document.getElementById('close-volume-panel');
  if (closeVolumePanel) {
    closeVolumePanel.addEventListener('click', function() {
      document.getElementById('volume-panel').style.display = 'none';
    });
  }
  
  // BGM音量スライダー
  const bgmVolumeSlider = document.getElementById('bgm-volume');
  const bgmVolumeValue = document.getElementById('bgm-volume-value');
  if (bgmVolumeSlider && bgmVolumeValue) {
    bgmVolumeSlider.addEventListener('input', function() {
      bgmVolume = this.value / 100;
      bgmVolumeValue.textContent = this.value + '%';
      
      // 再生中のBGM音量を更新
      if (bgmAudio) {
        bgmAudio.volume = bgmVolume * 0.3; // 設定された音量の30%を適用
      }
    });
  }
  
  // 効果音音量スライダー
  const sfxVolumeSlider = document.getElementById('sfx-volume');
  const sfxVolumeValue = document.getElementById('sfx-volume-value');
  if (sfxVolumeSlider && sfxVolumeValue) {
    sfxVolumeSlider.addEventListener('input', function() {
      sfxVolume = this.value / 100;
      sfxVolumeValue.textContent = this.value + '%';
    });
  }
  
  // 巻き戻しボタン
  const rewindBtn = document.getElementById('rewind-btn');
  if (rewindBtn) {
    rewindBtn.addEventListener('click', function() {
      // リセット確認ダイアログを表示
      document.getElementById('reset-confirm-dialog').style.display = 'flex';
    });
  }
  
  // リセット確認ダイアログのOKボタン
  const confirmResetBtn = document.getElementById('confirm-reset');
  if (confirmResetBtn) {
    confirmResetBtn.addEventListener('click', function() {
      // ダイアログを非表示
      document.getElementById('reset-confirm-dialog').style.display = 'none';
      
      // タイマーを停止
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      // ゲームをリセット
      const gameOverMessages = document.querySelectorAll('.game-over-message');
      gameOverMessages.forEach(msg => msg.remove());
      const gameOverImage = document.getElementById('game-over-image');
      if (gameOverImage) gameOverImage.remove();
      const clearMessage = document.getElementById('clear-message');
      if (clearMessage) clearMessage.remove();
      initializeGame();
      document.body.style.transition = 'none';
      document.body.style.backgroundColor = 'white';
      setTimeout(() => {
        document.body.style.transition = 'background-color 13s ease-in-out';
      }, 100);
      
      // スタートボタンを再表示
      const startContainer = document.getElementById("game-start-container");
      if (startContainer) {
        startContainer.style.display = "flex";
      }
      
      // 巻き戻しボタンを非表示
      rewindBtn.style.display = "none";
      
      // カード操作をロック
      lock = true;
      
      // タイマーをリセット
      timeRemaining = 60;
      updateTimerDisplay();
      
      // BGMを停止
      stopBGM();
    });
  }
  
  // リセット確認ダイアログのキャンセルボタン
  const cancelResetBtn = document.getElementById('cancel-reset');
  if (cancelResetBtn) {
    cancelResetBtn.addEventListener('click', function() {
      // ダイアログを非表示
      document.getElementById('reset-confirm-dialog').style.display = 'none';
    });
  }
  
  // 遊び方ボタン
  const howToPlayBtn = document.getElementById('how-to-play-btn');
  if (howToPlayBtn) {
    howToPlayBtn.addEventListener('click', function() {
      // 遊び方ダイアログを表示
      document.getElementById('how-to-play-dialog').style.display = 'flex';
      // 1ページ目を表示
      showHowToPlayPage(1);
    });
  }
  
  // 遊び方ダイアログの閉じるボタン
  const closeHowToPlayBtn = document.getElementById('close-how-to-play');
  if (closeHowToPlayBtn) {
    closeHowToPlayBtn.addEventListener('click', function() {
      document.getElementById('how-to-play-dialog').style.display = 'none';
    });
  }
  
  // 遊び方ダイアログのページ切り替え
  let currentPage = 1;
  const totalPages = 3;
  
  function showHowToPlayPage(page) {
    currentPage = page;
    document.getElementById('how-to-play-page-1').style.display = page === 1 ? 'block' : 'none';
    document.getElementById('how-to-play-page-2').style.display = page === 2 ? 'block' : 'none';
    document.getElementById('how-to-play-page-3').style.display = page === 3 ? 'block' : 'none';
    document.getElementById('page-indicator').textContent = `${page} / ${totalPages}`;
    document.getElementById('prev-page').disabled = page === 1;
    document.getElementById('next-page').disabled = page === totalPages;
  }
  
  const prevPageBtn = document.getElementById('prev-page');
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', function() {
      if (currentPage > 1) {
        showHowToPlayPage(currentPage - 1);
      }
    });
  }
  
  const nextPageBtn = document.getElementById('next-page');
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', function() {
      if (currentPage < totalPages) {
        showHowToPlayPage(currentPage + 1);
      }
    });
  }
  
  // クレジットボタン
  const creditBtn = document.getElementById('credit-btn');
  if (creditBtn) {
    creditBtn.addEventListener('click', function() {
      // クレジットダイアログを表示
      document.getElementById('credit-dialog').style.display = 'flex';
    });
  }
  
  // クレジットダイアログの閉じるボタン
  const closeCreditBtn = document.getElementById('close-credit');
  if (closeCreditBtn) {
    closeCreditBtn.addEventListener('click', function() {
      document.getElementById('credit-dialog').style.display = 'none';
    });
  }
  
});
