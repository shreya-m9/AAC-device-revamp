const words = [
  { label: "apple",   emoji: "🍎" },
  { label: "water",   emoji: "💧" },
  { label: "help",    emoji: "🙋" },
  { label: "yes",     emoji: "✅" },
  { label: "no",      emoji: "❌" },
  { label: "happy",   emoji: "😊" },
  { label: "tired",   emoji: "😴" },
  { label: "more",    emoji: "➕" },
  { label: "home",    emoji: "🏠" },
  { label: "play",    emoji: "🎮" },
  { label: "eat",     emoji: "🍽️" },
  { label: "music",   emoji: "🎵" },
];

// Load any custom words saved previously
const savedWords = JSON.parse(localStorage.getItem('custom_words') || '[]');
words.push(...savedWords);

let sentence = [];
const board = document.getElementById('board');

// ── Build board ──
words.forEach(w => addCard(w));

// ── Add card to board ──
async function addCard(w) {
  const res = await fetch(`/has-recording/${w.label}`);
  const { exists } = await res.json();

  const card = document.createElement('div');
  card.className = 'card' + (exists ? ' has-custom' : '');
  card.id = `card-${w.label}`;
  card.innerHTML = `
    <div class="emoji">${w.emoji}</div>
    <div class="label">${w.label}</div>
    <button class="record-btn" id="rbtn-${w.label}" onclick="event.stopPropagation(); toggleRecord('${w.label}')">
      ${exists ? '🎤 re-record' : '🎤 record'}
    </button>
  `;
  card.addEventListener('click', () => tapCard(w.label));
  board.appendChild(card);
}

// ── Tap card ──
function tapCard(word) {
  playWord(word);
  addToSentence(word);
}

// ── Play word ──
async function playWord(word) {
  const res = await fetch(`/has-recording/${word}`);
  const { exists } = await res.json();
  if (exists) {
    const audio = new Audio(`/recordings/${word}`);
    audio.play();
  } else {
    const utt = new SpeechSynthesisUtterance(word);
    utt.rate = 0.9;
    window.speechSynthesis.speak(utt);
  }
}

// ── Sentence bar ──
function addToSentence(word) {
  sentence.push(word);
  renderSentence();
}

function renderSentence() {
  const container = document.getElementById('sentence-words');
  container.innerHTML = '';
  if (sentence.length === 0) {
    container.appendChild(Object.assign(document.createElement('span'), {
      className: 'placeholder', textContent: 'Tap a card to start...'
    }));
    return;
  }
  sentence.forEach((w, i) => {
    const chip = document.createElement('span');
    chip.className = 'sentence-word';
    chip.textContent = w;
    chip.title = 'Click to remove';
    chip.onclick = () => { sentence.splice(i, 1); renderSentence(); };
    container.appendChild(chip);
  });
}

function speakSentence() {
  if (sentence.length === 0) return;
  const utt = new SpeechSynthesisUtterance(sentence.join(' '));
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

function clearSentence() {
  sentence = [];
  renderSentence();
}

// ── Record via browser mic, upload to backend ──
async function toggleRecord(word) {
  const btn = document.getElementById(`rbtn-${word}`);
  const card = document.getElementById(`card-${word}`);

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const chunks = [];

    btn.textContent = '⏹ stop';
    btn.classList.add('recording');

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', blob);
      formData.append('word', word);
      await fetch('/upload-voice', { method: 'POST', body: formData });

      card.classList.add('has-custom');
      btn.textContent = '🎤 re-record';
      btn.classList.remove('recording');
      btn.disabled = false;
      stream.getTracks().forEach(t => t.stop());
    };

    recorder.start();
    setTimeout(() => recorder.stop(), 4000);

  } catch (err) {
    alert('Microphone access denied. Please allow mic permissions.');
  }
}

// ── Add word modal ──
function openModal() {
  document.getElementById('modal-overlay').style.display = 'flex';
  document.getElementById('new-label').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('new-label').value = '';
  document.getElementById('new-emoji').value = '';
}

function saveNewWord() {
  const label = document.getElementById('new-label').value.trim().toLowerCase();
  const emoji = document.getElementById('new-emoji').value.trim() || '💬';
  if (!label) return;

  const newWord = { label, emoji };

  const saved = JSON.parse(localStorage.getItem('custom_words') || '[]');
  saved.push(newWord);
  localStorage.setItem('custom_words', JSON.stringify(saved));

  addCard(newWord);
  closeModal();
}