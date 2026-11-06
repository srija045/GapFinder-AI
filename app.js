/* GapFinder AI — source-grounded demo app. All student data stays in this browser. */
(() => {
  'use strict';

  const STORE_KEY = 'gapfinder-ai-v1';
  const AUTH_KEY = 'gapfinder-auth-v1';
  const SEED_SYLLABUS = `Cell structure\nMembrane transport\nPhotosynthesis\nCellular respiration\nGenetics\nEcology`;
  const SEED_NOTES = `# Cell structure\nPlant and animal cells are eukaryotic cells, so their DNA is enclosed in a nucleus. The cell membrane surrounds the cytoplasm and controls the movement of substances into and out of the cell. Mitochondria release usable energy during cellular respiration, while ribosomes build proteins.\n\n# Membrane transport\nDiffusion is the net movement of particles from a region of higher concentration to a region of lower concentration. Osmosis is the movement of water through a selectively permeable membrane, from a dilute solution toward a more concentrated solution. Active transport moves particles against a concentration gradient and requires energy from respiration.\n\n# Photosynthesis\nPhotosynthesis converts light energy into chemical energy stored in glucose. The light-dependent reactions take place in the thylakoid membranes, where chlorophyll absorbs light and water is split, releasing oxygen. The Calvin cycle takes place in the stroma, where carbon dioxide is used to build sugar molecules.\n\n# Cellular respiration\nAerobic respiration breaks down glucose in the presence of oxygen to release energy. Glycolysis happens in the cytoplasm, and later stages take place in the mitochondria. The electron transport chain uses energy from electrons to help produce most of the cell's ATP.\n\n# Genetics\nDNA carries the instructions used to build proteins, and a gene is a section of DNA that codes for a product. Alleles are different versions of the same gene. A dominant allele can affect a trait when one copy is present, while a recessive trait usually appears when two recessive copies are inherited.\n\n# Ecology\nA food chain shows how energy passes from one organism to another. Producers make their own food and form the base of most food chains. Only a fraction of energy is transferred to the next trophic level because organisms use energy for life processes and lose some as heat.`;
  const SEED_PAPER = `# Practice paper · short questions\nExplain why active transport needs energy.\nDescribe where the light-dependent reactions happen.\nState one difference between a dominant and a recessive allele.\nWhy does less energy reach organisms at higher trophic levels?\nName the cell structure that controls movement into and out of the cell.`;

  const initialMastery = {
    'Cell structure': 82,
    'Membrane transport': 48,
    Photosynthesis: 42,
    'Cellular respiration': 68,
    Genetics: 76,
    Ecology: 57
  };
  const seedDocuments = () => [
    { id: 'seed-syllabus', name: 'Biology syllabus.txt', kind: 'syllabus', text: SEED_SYLLABUS, seeded: true },
    { id: 'seed-notes', name: 'Biology revision notes.md', kind: 'notes', text: SEED_NOTES, seeded: true },
    { id: 'seed-paper', name: 'June practice paper.txt', kind: 'paper', text: SEED_PAPER, seeded: true }
  ];
  const freshState = () => ({
    documents: seedDocuments(), mastery: { ...initialMastery }, paperMap: [], paperMapSignature: '', attempts: [
      { id: 'demo-a1', date: '2026-10-26', label: 'Diagnostic 1', percent: 48, topicScores: { 'Cell structure': 72, 'Membrane transport': 36, Photosynthesis: 32, 'Cellular respiration': 52, Genetics: 68, Ecology: 44 } },
      { id: 'demo-a2', date: '2026-11-02', label: 'Diagnostic 2', percent: 62, topicScores: { 'Cell structure': 82, 'Membrane transport': 48, Photosynthesis: 42, 'Cellular respiration': 68, Genetics: 76, Ecology: 57 } }
    ], planDays: 5, hoursPerDay: 2, completedTasks: [], lastReview: null
  });
  let state = readState();
  let loggedIn = localStorage.getItem(AUTH_KEY) === 'yes';
  let currentView = 'overview';
  let quizSession = null;
  let aiBusy = false;
  let mappingBusy = false;
  let aiStatus = { configured: false, provider: 'Local retrieval', model: null };
  let toastTimer = 0;
  let activeUploadKind = 'notes';
  let mobileNavOpen = false;
  let chatHistory = [{ role: 'assistant', text: 'Hi Maya — ask me about a topic from your notes. I’ll search your uploaded material first and show the section I used.' }];

  function readState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (stored && Array.isArray(stored.documents) && stored.mastery) return { ...freshState(), ...stored };
    } catch (_) { /* Recover with the demo workspace if local data is unreadable. */ }
    return freshState();
  }
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  function esc(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
  function icon(name) {
    const paths = {
      overview: '<rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="4" rx="1.2"/><rect x="14" y="10" width="7" height="11" rx="1.2"/><rect x="3" y="13" width="7" height="8" rx="1.2"/>',
      materials: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 5.5v15A2.5 2.5 0 0 1 6.5 18H20M8 7h8M8 11h7"/>',
      diagnosis: '<path d="M8 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m8 13 2.2 2.2L15.5 10"/>',
      plan: '<path d="M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1z"/><path d="m8 14 2 2 5-5"/>',
      ask: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
      progress: '<path d="M3 3v18h18"/><path d="m7 14 4-4 4 3 6-7"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.overview}</svg>`;
  }
  const nav = [
    ['overview', 'Overview'], ['materials', 'Study material'], ['diagnosis', 'Diagnostic quiz'], ['report', 'Gap report'], ['plan', 'Revision plan'], ['ask', 'Explain a topic'], ['progress', 'Progress']
  ];
  function titleForView(view) { return (nav.find(item => item[0] === view) || nav[0])[1]; }
  function route(view) { currentView = view; mobileNavOpen = false; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function notify(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }
  function fmtDate(iso) { return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

  function docsOf(kind) { return state.documents.filter(doc => !kind || doc.kind === kind); }
  function currentTopics() {
    const syllabus = docsOf('syllabus').map(doc => doc.text).join('\n');
    let items = syllabus.split(/\r?\n/).map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).filter(line => line.length > 2 && line.length < 80 && !/^syllabus$/i.test(line));
    items = [...new Set(items)];
    if (!items.length) items = Object.keys(state.mastery);
    return items;
  }
  function apiPost(path, payload) {
    return fetch(`/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `The study service returned ${response.status}.`);
        return body;
      });
  }
  function extractPaperQuestions() {
    const questions = [];
    for (const doc of docsOf('paper')) {
      let section = 'Questions';
      const lines = doc.text.replace(/\r/g, '').split('\n');
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        const heading = line.match(/^#{1,6}\s*(.+)$/) || line.match(/^(?:unit|chapter|section)\s+[^:—-]+[:—-]\s*(.+)$/i);
        if (heading) { section = heading[1].replace(/\s+/g, ' ').trim(); continue; }
        const candidates = line.match(/(?:explain|describe|state|why|name|what|how|compare|define|list|give|calculate|identify|which|outline|discuss)\b[^.!?]{12,}[.!?]?/gi) || [];
        for (const candidate of candidates) {
          const text = cleanSentence(candidate);
          if (text.length < 18) continue;
          const id = `${doc.id}-paper-${questions.length}`;
          if (!questions.some(item => item.text.toLowerCase() === text.toLowerCase())) questions.push({ id, text, citation: `${doc.name} · ${section}` });
        }
      }
    }
    return questions;
  }
  function mapPaperQuestionsLocally() {
    const topics = currentTopics();
    const notes = getChunks().filter(chunk => chunk.kind !== 'paper');
    return extractPaperQuestions().map(question => {
      const match = notes.map(chunk => ({ chunk, score: scoreText(question.text, `${chunk.topic} ${chunk.text}`) })).sort((a,b) => b.score-a.score)[0];
      const topic = match?.score > 0 ? match.chunk.topic : 'Unmapped';
      return { ...question, topic, evidenceCitation: topic === 'Unmapped' ? '' : match.chunk.citation, reason: topic === 'Unmapped' ? 'No matching note passage found.' : 'Matched to the closest note passage by topic and keyword overlap.', confidence: topic === 'Unmapped' ? 'Unmapped' : 'Local match' };
    });
  }
  function getPaperMapSignature() {
    return `${currentTopics().join('|')}::${state.documents.filter(doc => doc.kind === 'notes' || doc.kind === 'paper').map(doc => `${doc.id}:${hash(doc.text)}`).join('|')}`;
  }
  function ensurePaperMap() {
    const signature = getPaperMapSignature();
    if (state.paperMapSignature === signature || mappingBusy) return;
    state.paperMap = mapPaperQuestionsLocally();
    state.paperMapSignature = signature;
    state.planTasks = null;
    save();
    if (!aiStatus.configured || !state.paperMap.length) return;
    mappingBusy = true;
    apiPost('map-papers', { topics: currentTopics(), questions: extractPaperQuestions(), chunks: getChunks() })
      .then(result => {
        if (state.paperMapSignature === signature && Array.isArray(result.matches)) {
          state.paperMap = result.matches;
          state.paperMapSignature = signature;
          state.planTasks = null;
          save(); render();
        }
      })
      .catch(error => { console.warn('AI past-paper mapping unavailable:', error.message); })
      .finally(() => {
        mappingBusy = false;
        if (state.paperMapSignature !== getPaperMapSignature()) render();
      });
  }
  function stopWords() { return new Set('a about above after again against all also am an and any are as at be because been before being between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just less many may me might more most must my myself no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who why will with within would you your yours yourself yourselves'.split(/\s+/)); }
  function words(text) { return String(text).toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) || []; }
  function scoreText(query, content) {
    const stop = stopWords();
    const q = [...new Set(words(query).filter(word => word.length > 2 && !stop.has(word)))];
    const c = words(content).filter(word => word.length > 2 && !stop.has(word));
    if (!q.length || !c.length) return 0;
    let score = 0;
    for (const term of q) {
      const count = c.filter(word => word === term || (term.length > 5 && word.startsWith(term.slice(0, -2)))).length;
      if (count) score += 1 + Math.min(count - 1, 2) * .18;
    }
    return score / Math.sqrt(q.length * Math.max(c.length, 1));
  }
  function cleanSentence(text) { return text.replace(/\s+/g, ' ').replace(/^[\s\-•*]+/, '').trim(); }
  function sectionBlocks(doc) {
    const lines = doc.text.replace(/\r/g, '').split('\n');
    const blocks = [];
    let title = doc.name.replace(/\.[^.]+$/, '');
    let buf = [];
    const flush = () => {
      const body = buf.join(' ').replace(/\s+/g, ' ').trim();
      if (body) blocks.push({ title, text: body });
      buf = [];
    };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { if (buf.length > 3) flush(); continue; }
      const heading = line.match(/^(?:#{1,6}\s*|\d+[.)]\s*|(?:unit|chapter|section)\s+[\w.:-]+\s*[:—-]?\s*)(.{0,90})$/i);
      const syllabusHeading = currentTopics().some(topic => topic.toLowerCase() === line.toLowerCase());
      const isHeading = syllabusHeading || (heading && (line.startsWith('#') || /^(?:unit|chapter|section)\b/i.test(line) || (line.length < 56 && !/[.!?]$/.test(line) && !line.includes(',')));
      if (isHeading) { flush(); title = syllabusHeading ? line : (heading[1] || heading[0]).replace(/^#+\s*/, '').trim() || line; continue; }
      buf.push(line);
      if (buf.join(' ').length > 900) flush();
    }
    flush();
    return blocks;
  }
  function bestTopic(text, topics) {
    let best = topics[0] || 'General study'; let value = 0;
    for (const topic of topics) {
      const score = scoreText(topic, text);
      if (score > value) { best = topic; value = score; }
    }
    return best;
  }
  function getChunks() {
    const topics = currentTopics();
    const chunks = [];
    for (const doc of state.documents.filter(item => item.kind !== 'syllabus')) {
      for (const block of sectionBlocks(doc)) {
        let sentences = block.text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [block.text];
        sentences = sentences.map(cleanSentence).filter(sentence => sentence.length > 28);
        if (!sentences.length) continue;
        const citationPage = block.title.match(/page\s+(\d+)/i);
        for (let i = 0; i < sentences.length; i += 2) {
          const body = sentences.slice(i, i + 2).join(' ').trim();
          if (body.length < 28) continue;
          const topic = bestTopic(`${block.title} ${body}`, topics);
          chunks.push({ id: `${doc.id}-${chunks.length}`, topic, text: body, name: doc.name, section: block.title, kind: doc.kind, citation: `${doc.name} · ${citationPage ? `Page ${citationPage[1]}` : block.title}` });
        }
      }
    }
    return chunks;
  }
  function topicScore(topic) { return Math.max(0, Math.min(100, Number(state.mastery[topic] ?? 55))); }
  function level(topic) { const score = topicScore(topic); return score < 55 ? 'weak' : score < 78 ? 'medium' : 'strong'; }
  function levelLabel(topic) { return ({ weak: 'Needs focus', medium: 'Building', strong: 'Strong' })[level(topic)]; }
  function rankedTopics() { return currentTopics().map((topic, index) => ({ topic, score: topicScore(topic), level: level(topic), index })).sort((a,b) => a.score - b.score); }
  function overallMastery() { const list = currentTopics(); return list.length ? Math.round(list.reduce((sum, topic) => sum + topicScore(topic), 0) / list.length) : 0; }
  function reasonFor(topic) {
    const attempt = state.lastReview;
    const item = attempt?.topics?.[topic];
    if (item && item.total) return `You missed ${item.total - item.correct} of ${item.total} questions here. ${item.note || 'Revisit the cited sections, then try a short recall check.'}`;
    const history = state.attempts.filter(entry => entry.topicScores?.[topic]).slice(-2);
    if (history.length > 1 && history.at(-1).topicScores[topic] < history[0].topicScores[topic]) return 'Your latest check slipped from the previous attempt. A focused review will help keep this topic moving.';
    return topic === 'Photosynthesis' ? 'Light-dependent reactions and the Calvin cycle are easy to mix up. Review where each stage happens.' : `Recent checks show this topic needs a little more recall practice. Review your notes, then explain the key idea in your own words.`;
  }
  function examFrequency(topic) {
    const count = (state.paperMap || []).filter(item => item.topic === topic).length;
    return count ? `${count} past-paper question${count === 1 ? '' : 's'}` : 'Not seen in uploaded papers';
  }

  function shell(viewHTML) {
    const user = JSON.parse(localStorage.getItem('gapfinder-profile') || '{"name":"Maya Chen","email":"demo@student.com"}');
    const name = user.name || 'Maya Chen';
    const firstName = name.split(/\s+/)[0];
    const title = titleForView(currentView);
    const pct = state.completedTasks.length && state.planTasks?.length ? Math.round(state.completedTasks.length / state.planTasks.length * 100) : 0;
    return `<div class="app-shell">
      <aside class="sidebar ${mobileNavOpen ? 'open' : ''}">
        <a class="brand" href="#" data-route="overview"><span class="brand-mark">g.</span><span><span class="brand-name">GapFinder AI</span><span class="brand-caption">Study with direction</span></span></a>
        <div class="side-label">Workspace</div>
        <nav class="nav-list" aria-label="Main navigation">${nav.map(([key,label]) => `<button class="nav-item ${currentView === key ? 'active' : ''}" data-route="${key}"><span class="nav-icon">${icon(key)}</span>${label}</button>`).join('')}</nav>
        <div class="sidebar-bottom">
          <div class="plan-mini"><div class="plan-mini-top"><span>This week</span><span>${state.planDays} days left</span></div><div class="mini-track"><i style="width:${pct}%"></i></div><div class="mini-note">${pct ? `${pct}% of your plan complete` : 'Your plan is ready when you are'}</div></div>
          <div class="student-chip"><div class="avatar">${esc((firstName[0] || 'M') + ((name.split(/\s+/)[1] || 'C')[0]))}</div><div><div class="student-name">${esc(name)}</div><div class="student-sub">Student workspace</div></div><button class="quiet-button" data-action="logout" aria-label="Log out" title="Log out">↗</button></div>
        </div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="top-actions"><button class="icon-button mobile-menu" data-action="menu" aria-label="Open menu">☰</button><div class="breadcrumb">Workspace <span aria-hidden="true">/</span> <strong>${esc(title)}</strong></div></div><div class="top-actions"><span class="ai-pill ${aiStatus.configured ? 'active' : ''}"><i></i>${aiStatus.configured ? `AI · ${esc(aiStatus.model)}` : 'Local demo mode'}</span><span class="course-pill">Biology · Year 11</span><span class="days-pill"><i class="dot"></i> Exam in ${state.planDays} days</span><button class="icon-button" data-route="materials" aria-label="Study material">${icon('materials')}</button></div></header>
        ${viewHTML}
      </main>
    </div>`;
  }
  function renderLogin(error = '') {
    document.getElementById('app').innerHTML = `<main class="login-screen"><section class="login-card" aria-labelledby="login-title"><a class="brand" href="#"><span class="brand-mark">g.</span><span><span class="brand-name">GapFinder AI</span><span class="brand-caption">Study with direction</span></span></a><div class="eyebrow">Your personal study diagnosis</div><h1 id="login-title">Find the gaps.<br>Close them with a plan.</h1><p>Sign in to see your topic map, source-grounded quizzes and a revision plan built around what you need next.</p><form class="login-form" id="login-form"><label class="field">Email<input name="email" type="email" autocomplete="username" value="demo@student.com" required></label><label class="field">Password<input name="password" type="password" autocomplete="current-password" value="study123" required></label><div class="login-error">${esc(error)}</div><button class="primary-button" type="submit">Continue to my workspace <span aria-hidden="true">→</span></button></form><div class="demo-note"><b>Demo account ready</b><br>demo@student.com &nbsp;·&nbsp; study123<br>Your demo course data is saved in this browser.</div></section></main>`;
  }

  function renderOverview() {
    const ranked = rankedTopics();
    const weak = ranked[0] || { topic: 'Add your syllabus', score: 0, level: 'weak' };
    const attemptText = state.attempts.length ? `+${Math.max(0, state.attempts.at(-1).percent - state.attempts[0].percent)} pts since your first check` : 'Take your first check';
    return `<div class="page-heading"><div><div class="eyebrow">Thursday, November 5 · Your study overview</div><h1>Good evening, Maya.</h1><p class="page-subtitle">A little focus goes a long way. Here’s what to work on next.</p></div><button class="primary-button" data-action="start-quiz">Start diagnostic <span aria-hidden="true">→</span></button></div>
      <section class="hero"><div class="hero-content"><div class="hero-kicker"><span>YOUR NEXT STEP</span> A clearer way to revise</div><h1>Know what you don’t know.</h1><p>Your notes point to a few places worth another look. Take a quick check, find the gaps, and spend your time where it counts.</p><button class="primary-button hero-cta" data-action="start-quiz">Find my gaps <span aria-hidden="true">→</span></button></div><div class="hero-visual" aria-hidden="true"><div class="orbit one"></div><div class="orbit two"></div><i class="orbit-dot"></i><i class="orbit-dot alt"></i><div class="focus-card"><span>TOPIC CONFIDENCE</span><b>Building steadily</b><div class="focus-bars"><i></i><i></i><i></i><i></i><i></i></div></div></div></section>
      <section class="stats-grid"><article class="stat-card"><div class="stat-label">Overall confidence <span>↗</span></div><div class="stat-value">${overallMastery()}%</div><div class="stat-sub">${esc(attemptText)}</div></article><article class="stat-card"><div class="stat-label">Topics mapped <span>⌗</span></div><div class="stat-value">${currentTopics().length}</div><div class="stat-sub">From your uploaded syllabus</div></article><article class="stat-card"><div class="stat-label">Need a closer look <span>◎</span></div><div class="stat-value">${ranked.filter(t => t.level === 'weak').length}</div><div class="stat-sub">Topics below 55% confidence</div></article><article class="stat-card"><div class="stat-label">Study time planned <span>◷</span></div><div class="stat-value">${state.planDays * state.hoursPerDay}<small style="font-size:11px;color:#77847b"> hrs</small></div><div class="stat-sub">${state.planDays} days · ${state.hoursPerDay} hours a day</div></article></section>
      <div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Your topic map</h2><p>Confidence across the topics in your syllabus</p></div><button class="text-button" data-route="report">Full gap report →</button></div><div class="topic-list">${ranked.map(item => topicRow(item.topic, item.score, item.level)).join('')}</div><div class="panel-footer"><span>Updated from your latest diagnostic</span><span>Source-based · ${docsOf().length} materials</span></div></section>
      <section class="panel"><div class="panel-head"><div><h2>Start here</h2><p>Your highest priority right now</p></div><span class="pill weak">FOCUS</span></div><div class="priority-card"><div class="priority-top"><div><div class="priority-title">${esc(weak.topic)}</div><div class="priority-meta">${esc(examFrequency(weak.topic))} · ${weak.score}% confidence</div></div><div class="priority-score">${weak.score}%</div></div><p class="priority-reason">${esc(reasonFor(weak.topic))}</p><div class="priority-actions"><button class="primary-button" data-route="plan">Review this topic</button><button class="secondary-button" data-route="ask">Ask a question</button></div></div><div class="exam-frequency"><span>Today’s planned focus</span><b>${esc(weak.topic)} · 30 min</b></div><div class="exam-frequency"><span>Next checkpoint</span><b>Take a short diagnostic</b></div><div class="panel-footer"><span>Plan adapts after each quiz</span><button class="text-button" data-route="plan">Open plan →</button></div></section></div>`;
  }
  function topicRow(topic, score, lvl) {
    const color = lvl === 'weak' ? '#bd6a56' : lvl === 'medium' ? '#d0a54e' : '#6ba27b';
    return `<div class="topic-row"><div class="topic-label"><i class="topic-dot" style="background:${color}"></i><b>${esc(topic)}</b></div><div class="progress-track"><i style="width:${score}%;background:${color}"></i></div><div class="topic-percent">${score}%</div><div class="topic-status ${lvl}">${levelLabel(topic)}</div></div>`;
  }
  function renderMaterials() {
    const docs = state.documents;
    const countWord = docs.length === 1 ? 'source' : 'sources';
    return `<div class="page-heading"><div><div class="eyebrow">Your personal source library</div><h1>Study material</h1><p class="page-subtitle">Upload the syllabus, notes and past papers GapFinder should use.</p></div><button class="primary-button" data-action="upload" data-kind="notes">＋ Add material</button></div>
      <section class="panel"><div class="upload-zone"><div class="upload-copy"><span class="upload-symbol">↑</span><div><strong>Bring your course material together</strong><small>PDF, TXT, MD or CSV · Up to 10 MB per file</small></div></div><div class="upload-actions"><button class="secondary-button" data-action="upload" data-kind="syllabus">＋ Syllabus</button><button class="secondary-button" data-action="upload" data-kind="notes">＋ Notes</button><button class="secondary-button" data-action="upload" data-kind="paper">＋ Past paper</button></div></div><input type="file" id="file-input" accept=".pdf,.txt,.md,.csv,text/plain,text/markdown,text/csv,application/pdf" hidden><div class="card-headline"><div><h2>Saved sources</h2><p class="inline-note" style="margin:5px 0 0">${docs.length} ${countWord} in your workspace</p></div><span class="type-badge">● Private to this browser</span></div><div class="source-list">${docs.length ? docs.map(doc => sourceCard(doc)).join('') : `<div class="empty-state">No material yet. Add a syllabus and some notes to build your topic map.</div>`}</div></section>
      <div class="dashboard-grid" style="margin-top:16px"><section class="panel"><div class="panel-head"><div><h2>Past paper topic map</h2><p>Questions mapped against your syllabus and uploaded notes</p></div><span class="type-badge">${aiStatus.configured ? `AI · ${esc(aiStatus.model)}` : 'Local mapping'}</span></div>${renderPaperMap()}</section><aside class="panel"><div class="panel-head"><div><h2>How your material is used</h2><p>Retrieval and generation stay separate.</p></div></div><div class="method-step"><b>01</b><span><strong>Retrieve</strong> — rank source passages against the topic or question.</span></div><div class="method-step"><b>02</b><span><strong>Generate</strong> — the model receives only those passages to create questions or explanations.</span></div><div class="method-step"><b>03</b><span><strong>Cite</strong> — accept only returned source IDs and display the stored citation.</span></div><p class="inline-note" style="margin:10px 0 0">${aiStatus.configured ? `Only the retrieved passages and your prompt are sent to ${esc(aiStatus.model)}. Source files stay in this browser.` : 'Add a local API key to enable model-backed generation. Local retrieval remains available without one.'}</p></aside></div>`;
  }
  function sourceCard(doc) {
    const label = ({ syllabus: 'Syllabus', notes: 'Notes', paper: 'Past paper' })[doc.kind] || 'Notes';
    const size = `${Math.max(1, Math.round(doc.text.length / 1024))} KB text`;
    return `<article class="source-card"><div class="file-icon">${doc.name.toLowerCase().endsWith('.pdf') ? 'PDF' : doc.name.split('.').at(-1).toUpperCase().slice(0,3)}</div><div class="source-info"><b>${esc(doc.name)}</b><span>${size} · Added ${doc.seeded ? 'for your demo' : 'just now'}</span></div><span class="source-tag">${label}</span>${doc.seeded ? '' : `<button class="quiet-button" data-action="remove-doc" data-id="${esc(doc.id)}" title="Remove ${esc(doc.name)}" aria-label="Remove ${esc(doc.name)}">×</button>`}</article>`;
  }
  function renderPaperMap() {
    const matches = state.paperMap || [];
    if (!matches.length) return `<div class="empty-state">No question-like lines found yet. Add a past paper with questions on separate lines to see topic frequency here.</div>`;
    const counts = currentTopics().map(topic => ({ topic, count: matches.filter(item => item.topic === topic).length })).sort((a,b) => b.count-a.count);
    return `<div class="topic-list">${counts.map(({topic,count}) => `<div class="exam-frequency"><span>${esc(topic)}</span><b>${count} mapped</b></div>`).join('')}</div><div class="paper-question-list">${matches.map(item => `<article class="paper-question"><div><span class="pill ${item.topic === 'Unmapped' ? 'medium' : 'strong'}">${esc(item.topic)}</span><span class="paper-confidence">${esc(item.confidence || 'Mapped')}</span></div><p>${esc(item.question)}</p><small>${esc(item.citation)}${item.evidenceCitation ? ` · matched to ${esc(item.evidenceCitation)}` : ''}</small></article>`).join('')}</div>`;
  }

  function makeQuiz() {
    const chunks = getChunks();
    const topics = rankedTopics();
    if (!chunks.length) return [];
    const picked = [];
    for (const item of topics) {
      const candidates = chunks.filter(chunk => chunk.topic === item.topic);
      if (candidates.length) picked.push(candidates[(picked.length) % candidates.length]);
      if (picked.length >= Math.min(6, Math.max(3, topics.length))) break;
    }
    for (const chunk of chunks) {
      if (picked.length >= 6) break;
      if (!picked.some(item => item.id === chunk.id)) picked.push(chunk);
    }
    return picked.map((chunk, index) => {
      const candidates = chunks.filter(other => other.id !== chunk.id).map(other => ({ text: firstSentence(other.text), topic: other.topic, citation: other.citation })).filter(other => other.text !== firstSentence(chunk.text));
      const distractors = [];
      for (const other of candidates) if (!distractors.some(item => item.text === other.text)) { distractors.push(other); if (distractors.length === 3) break; }
      const correct = { text: firstSentence(chunk.text), topic: chunk.topic, citation: chunk.citation };
      const options = [correct, ...distractors].sort((a,b) => hash(a.text + index) - hash(b.text + index));
      return { topic: chunk.topic, citation: chunk.citation, sourceText: chunk.text, correctText: correct.text, prompt: `Which statement about ${chunk.topic} is supported by your material?`, options, answerIndex: options.findIndex(option => option.text === correct.text) };
    }).filter(q => q.options.length >= 2);
  }
  function hash(text) { let n = 0; for (let i = 0; i < text.length; i++) n = (n * 31 + text.charCodeAt(i)) | 0; return Math.abs(n); }
  function firstSentence(text) { return cleanSentence((text.match(/[^.!?]+[.!?]+|[^.!?]+$/) || [text])[0]).slice(0, 260); }
  function normalizeGeneratedQuestions(questions) {
    return questions.map(question => ({
      ...question,
      options: question.options.map(option => typeof option === 'string' ? { text: option, topic: question.topic, citation: question.citation } : option),
      answerIndex: Number(question.answerIndex)
    }));
  }
  function renderQuiz() {
    if (!quizSession) {
      const questionCount = Math.min(6, getChunks().length);
      const materialCount = state.documents.filter(doc => doc.kind !== 'syllabus').length;
      return `<div class="page-heading"><div><div class="eyebrow">A quick check of what’s sticking</div><h1>Diagnostic quiz</h1><p class="page-subtitle">Questions are grounded in retrieved source passages, with the section beside each one.</p></div></div><section class="quiz-intro"><span class="type-badge">✦ ${aiStatus.configured ? `AI-generated · ${esc(aiStatus.model)}` : 'Local demo questions'}</span><h2>Let’s find your next best revision step.</h2><p>Choose the best answer. After you finish, you’ll see why it was right or wrong, which topics need attention, and a revision plan adjusted to your results.</p><div class="quiz-facts"><span><b>${questionCount}</b>quick questions</span><span><b>${materialCount}</b>source documents</span><span><b>~5 min</b>to complete</span></div><button class="primary-button" data-action="begin-quiz" ${questionCount && !aiBusy ? '' : 'disabled'}>${aiBusy ? 'Generating from your sources…' : 'Begin diagnostic →'}</button></section><section class="panel" style="margin-top:15px"><div class="panel-head"><div><h2>Before you begin</h2><p>Questions are made from retrieved passages; each answer is checked and explained.</p></div></div><div class="info-box">${aiStatus.configured ? `Retrieval happens locally first; only the selected passages are sent to ${esc(aiStatus.model)} to create questions and feedback.` : 'Local retrieval is ready. Configure an API key in your local .env file to enable model-backed question generation and feedback.'}</div></section>`;
    }
    const { questions, index } = quizSession;
    const selected = quizSession.answers[index];
    const q = questions[index];
    const pct = Math.round(index / questions.length * 100);
    return `<div class="page-heading"><div><div class="eyebrow">Diagnostic · ${esc(q.topic)} · ${esc(q.generatedBy || 'Local source match')}</div><h1>Show what you know.</h1><p class="page-subtitle">Take your time. You can’t lose progress by going back.</p></div></div><div class="quiz-progress"><span>Question ${index + 1} of ${questions.length}</span><div class="progress-track"><i style="width:${pct}%"></i></div><span>${pct}%</span></div><section class="question-card"><div class="question-overline">${esc(q.topic)} · Question ${index + 1}</div><h2>${esc(q.prompt)}</h2><div class="citation">⌕ Source: ${esc(q.citation)}</div><div class="option-list">${q.options.map((option, i) => `<button class="option ${selected === i ? 'selected' : ''}" data-action="answer" data-index="${i}" aria-pressed="${selected === i}" ${aiBusy ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${esc(option.text)}</span></button>`).join('')}</div><div class="quiz-controls"><button class="secondary-button" data-action="quiz-back" ${index === 0 || aiBusy ? 'disabled' : ''}>← Back</button><button class="primary-button" data-action="quiz-next" ${selected === null || aiBusy ? 'disabled' : ''}>${aiBusy ? 'Checking answers…' : index === questions.length - 1 ? 'See my results' : 'Next question →'}</button></div></section>`;
  }
  async function beginQuiz() {
    if (aiBusy) return;
    let questions = [];
    if (aiStatus.configured) {
      aiBusy = true; render();
      try {
        const result = await apiPost('diagnostic', { topics: rankedTopics().map(({topic,score}) => ({topic,score})), chunks: getChunks() });
        questions = normalizeGeneratedQuestions(result.questions || []);
      } catch (error) {
        notify(`AI generation failed; using local demo questions. ${error.message}`);
      }
    } else {
      notify('Local demo mode: add a key in .env for model-generated questions and feedback.');
    }
    if (!questions.length) questions = makeQuiz();
    aiBusy = false;
    if (!questions.length) { notify('Add notes or a past paper to build a diagnostic.'); route('materials'); return; }
    quizSession = { questions, index: 0, answers: Array(questions.length).fill(null) };
    render();
  }
  async function finishQuiz() {
    if (!quizSession || aiBusy) return;
    const session = quizSession;
    if (session.answers.some(answer => answer === null)) { notify('Answer each question before finishing.'); return; }
    let aiFeedback = {};
    if (aiStatus.configured) {
      aiBusy = true; render();
      try {
        const result = await apiPost('grade', { questions: session.questions.map((q,i) => ({ ...q, options: q.options.map(option => option.text), selectedIndex: session.answers[i] })) });
        aiFeedback = Object.fromEntries((result.results || []).map(item => [item.index, item.feedback]));
      } catch (error) {
        notify(`AI feedback failed; showing source-based answer checks. ${error.message}`);
      }
      aiBusy = false;
    }
    if (quizSession !== session) return;
    const questions = session.questions;
    const topicResults = {};
    questions.forEach((q, i) => {
      topicResults[q.topic] ||= { correct: 0, total: 0, note: '' };
      topicResults[q.topic].total++;
      if (session.answers[i] === q.answerIndex) topicResults[q.topic].correct++;
      else topicResults[q.topic].note = aiFeedback[i] || 'Revisit the cited source, then try to recall the idea without looking.';
    });
    const percent = Math.round(questions.reduce((sum, q, i) => sum + (session.answers[i] === q.answerIndex ? 1 : 0), 0) / questions.length * 100);
    for (const [topic, result] of Object.entries(topicResults)) {
      const score = Math.round(result.correct / result.total * 100);
      state.mastery[topic] = Math.round(topicScore(topic) * .4 + score * .6);
    }
    const date = new Date().toISOString().slice(0,10);
    const attempt = { id: `attempt-${Date.now()}`, date, label: `Diagnostic ${state.attempts.length + 1}`, percent, topicScores: Object.fromEntries(currentTopics().map(topic => [topic, topicScore(topic)])), topics: topicResults, review: questions.map((q, i) => ({ ...q, selected: session.answers[i], correct: session.answers[i] === q.answerIndex, feedback: aiFeedback[i] || q.explanation || '' })) };
    state.attempts.push(attempt); state.lastReview = attempt; quizSession = null; state.planTasks = null; state.completedTasks = []; save(); route('report'); notify('Your topic map and plan have been updated.');
  }
  function renderReport() {
    const ranked = rankedTopics();
    const attempt = state.lastReview;
    const label = attempt ? `Diagnostic score · ${attempt.percent}%` : 'Based on your latest saved scores';
    return `<div class="page-heading"><div><div class="eyebrow">The main output · a diagnosis, not just answers</div><h1>Your gap report</h1><p class="page-subtitle">${esc(label)}. Use the reasons and citations to decide where to spend your time.</p></div><button class="primary-button" data-route="plan">Build my revision plan →</button></div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><h2>Topic diagnosis</h2><p>Weak · below 55% &nbsp; Medium · 55–77% &nbsp; Strong · 78%+</p></div><span class="pill ${ranked[0]?.level || 'medium'}">${ranked.filter(item => item.level === 'weak').length} NEED FOCUS</span></div><div class="report-list">${ranked.map(({topic,score,level:lvl}) => `<article class="report-topic"><i class="topic-dot" style="background:${lvl==='weak'?'#bd6a56':lvl==='medium'?'#d0a54e':'#6ba27b'}"></i><div class="topic-label"><b>${esc(topic)}</b></div><div class="progress-track"><i style="width:${score}%;background:${lvl==='weak'?'#bd6a56':lvl==='medium'?'#d0a54e':'#6ba27b'}"></i></div><strong class="topic-percent">${score}%</strong><p class="report-reason">${esc(reasonFor(topic))} <span class="pill ${lvl}">${levelLabel(topic)}</span></p></article>`).join('')}</div></section><aside class="panel"><div class="panel-head"><div><h2>Your next steps</h2><p>Ordered by need and mapped past-paper frequency</p></div></div>${ranked.slice(0,3).map((item,i)=>`<div class="exam-frequency"><span>${String(i+1).padStart(2,'0')} &nbsp; ${esc(item.topic)}</span><b>${esc(examFrequency(item.topic))}</b></div>`).join('')}<div class="panel-footer"><span>Priority combines current confidence with mapped past-paper counts.</span></div></aside></div>${attempt?.review?.length ? `<section class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>Answer review</h2><p>See what your selection matched in the source passage.</p></div></div><div class="report-list">${attempt.review.map((q,i)=>`<article class="priority-card" style="margin:0"><div class="priority-top"><div><div class="priority-title">${i+1}. ${esc(q.topic)} · ${q.correct?'Correct':'Review this'}</div><div class="priority-meta">${esc(q.citation)}</div></div><span class="pill ${q.correct?'strong':'weak'}">${q.correct?'RIGHT':'WRONG'}</span></div><p class="priority-reason"><b>Your answer:</b> ${esc(q.selected === null ? 'No answer selected' : q.options[q.selected]?.text)}<br><b>Expected answer:</b> ${esc(q.correctText)}<br>${esc(q.feedback || (q.correct?'This answer matches the retrieved material.':'Compare your selection with the cited source passage.'))}</p></article>`).join('')}</div></section>` : ''}`;
  }

  function ensurePlan() {
    if (Array.isArray(state.planTasks) && state.planTasks.length) return state.planTasks;
    const ranked = rankedTopics().map(item => ({ ...item, importance: 1 + Math.min(.8, (state.paperMap || []).filter(question => question.topic === item.topic).length * .2) }));
    const totalMinutes = state.planDays * state.hoursPerDay * 60;
    const sessionsPerDay = Math.min(8, Math.max(1, Math.floor(state.hoursPerDay * 2)));
    let blocks = Math.max(ranked.length, Math.min(state.planDays * sessionsPerDay, Math.floor(totalMinutes / 30)));
    const priorities = ranked.map(item => ({ ...item, weight: (105 - item.score) * item.importance })).sort((a,b) => b.weight-a.weight);
    const tasks = [];
    const verbs = ['Review key ideas', 'Practise active recall', 'Try past-paper questions', 'Explain it from memory', 'Recheck your understanding'];
    for (let i = 0; i < blocks; i++) {
      const item = priorities[i % priorities.length];
      const day = Math.floor(i / Math.max(1, Math.ceil(blocks / state.planDays))) + 1;
      tasks.push({ id: `task-${i}-${item.topic}`, day: Math.min(state.planDays, day), topic: item.topic, title: `${verbs[i % verbs.length]} · ${item.topic}`, description: i % verbs.length === 0 ? `Start with the cited notes, then write down the main idea without looking. ${examFrequency(item.topic)}.` : i % verbs.length === 1 ? 'Close your notes and recall the process or key terms in your own words.' : 'Use a relevant question from your past paper and check your reasoning against the notes.', minutes: 30 });
    }
    state.planTasks = tasks; save(); return tasks;
  }
  function renderPlan() {
    const tasks = ensurePlan();
    const grouped = Array.from({ length: state.planDays }, (_, i) => tasks.filter(task => task.day === i + 1));
    const done = tasks.filter(task => state.completedTasks.includes(task.id)).length;
    return `<div class="page-heading"><div><div class="eyebrow">A plan that changes as you improve</div><h1>Your revision plan</h1><p class="page-subtitle">Weak topics and mapped past-paper frequency come first. Mark sessions complete as you go.</p></div></div><section class="panel"><div class="panel-head"><div><h2>Make it fit your week</h2><p>Adjust the time you have. Priority uses your current confidence and mapped paper-question counts.</p></div><span class="pill medium">${done}/${tasks.length} SESSIONS DONE</span></div><form id="plan-settings" class="plan-inputs"><label class="field">Days until exam<input type="number" name="days" value="${state.planDays}" min="1" max="60" required></label><label class="field">Hours available each day<input type="number" name="hours" value="${state.hoursPerDay}" min="1" max="12" required></label><button class="secondary-button" type="submit">Update my plan</button></form></section><div class="page-grid" style="margin-top:16px"><section class="panel"><div class="panel-head"><div><h2>${state.planDays}-day focus plan</h2><p>${state.planDays * state.hoursPerDay} hours available · ${tasks.length} short sessions</p></div></div>${grouped.map((day,i)=>day.length?`<div class="card-headline"><h3>Day ${i+1}</h3><span class="inline-note">${day.reduce((n,t)=>n+t.minutes,0)} min</span></div><div class="revision-list">${day.map(task=>{const checked=state.completedTasks.includes(task.id);return `<article class="plan-card ${checked?'done':''}"><button class="plan-check" data-action="toggle-task" data-id="${esc(task.id)}" aria-label="Mark ${checked?'incomplete':'complete'}">${checked?'✓':''}</button><div class="plan-content"><b>${esc(task.title)}</b><p>${esc(task.description)}</p></div><span class="plan-duration">${task.minutes} min</span></article>`}).join('')}`:'').join('')}</section><aside class="panel"><div class="panel-head"><div><h2>Why this order?</h2><p>Your revision follows the evidence.</p></div></div><div class="method-card"><div class="method-step"><b>01</b><span>Lowest-confidence topics appear first.</span></div><div class="method-step"><b>02</b><span>Topics with more mapped paper questions get more sessions.</span></div><div class="method-step"><b>03</b><span>New quiz results rebuild your plan automatically.</span></div></div><div class="card-headline"><h3>Current priority</h3></div><div class="priority-card"><div class="priority-title">${esc(rankedTopics()[0]?.topic || 'Your syllabus')}</div><p class="priority-reason" style="margin-bottom:0">${esc(reasonFor(rankedTopics()[0]?.topic || ''))}</p></div><button class="secondary-button" data-route="diagnosis" style="width:100%;margin-top:7px">Retake diagnostic</button></aside></div>`;
  }

  function retrieve(query) {
    const chunks = getChunks();
    const ranked = chunks.map(chunk => ({ ...chunk, score: scoreText(query, `${chunk.topic} ${chunk.section} ${chunk.text}`) })).sort((a,b) => b.score-a.score);
    return ranked[0]?.score > 0 ? ranked[0] : null;
  }
  function renderChat() {
    const messages = chatHistory.map(message => `<div class="message ${message.role}">${esc(message.text)}${message.citation ? `<span class="message-cite">Source · ${esc(message.citation)}</span>` : ''}</div>`).join('');
    return `<div class="page-heading"><div><div class="eyebrow">Ask questions. Get material-backed answers.</div><h1>Explain a topic</h1><p class="page-subtitle">The answer comes from your saved sources; if they don’t cover it, GapFinder will say so.</p></div></div><div class="page-grid"><section class="chat-shell"><div class="chat-header"><span class="chat-orb">g.</span><div><b>Study companion</b><small><i class="dot"></i> ${aiStatus.configured ? `AI · ${esc(aiStatus.model)}` : 'Local source search'}</small></div></div><div class="chat-messages" id="chat-messages">${messages}</div><div class="chat-suggestions"><button data-action="suggest-chat" data-text="Explain photosynthesis">Explain photosynthesis</button><button data-action="suggest-chat" data-text="What is active transport?">What is active transport?</button><button data-action="suggest-chat" data-text="Where does glycolysis happen?">Where does glycolysis happen?</button></div><form class="chat-form" id="chat-form"><input class="chat-input" name="message" placeholder="Ask about a topic in your material…" autocomplete="off" required><button class="primary-button" type="submit">Send →</button></form></section><aside class="panel"><div class="panel-head"><div><h2>How answers stay grounded</h2><p>Retrieval first, then generation</p></div></div><div class="method-card"><h3>Only retrieved passages become context</h3><p>The server ranks your source passages against the question, sends the strongest matches to the model, validates its cited source IDs, and shows the original citations.</p><div class="method-step"><b>01</b><span><strong>Retrieve</strong> relevant source sections using keyword ranking.</span></div><div class="method-step"><b>02</b><span><strong>Generate</strong> an answer from those sections only.</span></div><div class="method-step"><b>03</b><span><strong>Decline</strong> when no retrieved section supports an answer.</span></div></div><p class="inline-note" style="margin-top:12px">${aiStatus.configured ? `Your question and retrieved passages are sent to ${esc(aiStatus.model)}. Uploaded files remain in this browser.` : 'The current page is in local demo mode. Start server.py with a local API key to enable the AI model.'}</p></aside></div>`;
  }
  async function answerChat(query) {
    chatHistory.push({ role: 'user', text: query });
    chatHistory.push({ role: 'assistant', text: aiStatus.configured ? 'Retrieving relevant passages and preparing a source-grounded answer…' : 'Searching your saved sources…', pending: true });
    render();
    let answer;
    try {
      if (!aiStatus.configured) throw new Error('Local mode');
      const result = await apiPost('explain', { query, chunks: getChunks() });
      answer = { role: 'assistant', text: result.answer || 'I could not find enough information in the uploaded material to answer that.', citation: (result.sources || []).map(source => source.citation).join(' · ') };
    } catch (error) {
      const hit = retrieve(query);
      answer = hit ? { role: 'assistant', text: `In your material: ${hit.text}\n\nThis is the closest passage I found for “${query}”.`, citation: hit.citation } : { role: 'assistant', text: `I couldn’t find this in your uploaded material, so I don’t want to guess. Try a topic name from your syllabus or add notes that cover it.` };
      if (aiStatus.configured) notify(`AI answer unavailable; showing the closest source passage. ${error.message}`);
    }
    if (chatHistory.at(-1)?.pending) chatHistory.pop();
    chatHistory.push(answer);
    render();
    const messages = document.getElementById('chat-messages'); if (messages) messages.scrollTop = messages.scrollHeight;
  }

  function renderProgress() {
    const attempts = state.attempts;
    const last = attempts.at(-1);
    const improvement = attempts.length > 1 ? last.percent - attempts[0].percent : 0;
    const chartBars = attempts.map((attempt,i)=>`<div class="chart-col"><div class="chart-bar" style="height:${Math.max(5,attempt.percent)}%"><span class="chart-value">${attempt.percent}%</span></div><span class="chart-label">${esc(attempt.label)}<br>${fmtDate(attempt.date)}</span></div>`).join('');
    return `<div class="page-heading"><div><div class="eyebrow">Your effort, made visible</div><h1>Progress</h1><p class="page-subtitle">Track confidence across attempts and see which topics are moving.</p></div><button class="primary-button" data-action="start-quiz">New diagnostic →</button></div><div class="stats-grid"><article class="stat-card"><div class="stat-label">Latest check <span>✓</span></div><div class="stat-value">${last?.percent ?? 0}%</div><div class="stat-sub">${last ? `${esc(last.label)} · ${fmtDate(last.date)}` : 'No attempt yet'}</div></article><article class="stat-card"><div class="stat-label">Change since first check <span>↗</span></div><div class="stat-value">${improvement > 0 ? '+' : ''}${improvement} pts</div><div class="stat-sub">${attempts.length} saved diagnostic${attempts.length === 1 ? '' : 's'}</div></article><article class="stat-card"><div class="stat-label">Strongest topic <span>✦</span></div><div class="stat-value" style="font-size:15px;letter-spacing:-.3px">${esc([...currentTopics()].sort((a,b)=>topicScore(b)-topicScore(a))[0]||'—')}</div><div class="stat-sub">${Math.max(...currentTopics().map(topicScore),0)}% confidence</div></article><article class="stat-card"><div class="stat-label">Saved study sources <span>⌑</span></div><div class="stat-value">${state.documents.length}</div><div class="stat-sub">Used for questions and explanations</div></article></div><section class="panel chart-panel"><div class="panel-head"><div><h2>Overall diagnostic score</h2><p>Results from each completed attempt</p></div><span class="pill strong">${improvement >= 0 ? 'TRENDING UP' : 'ROOM TO REVISIT'}</span></div><div class="chart">${chartBars}</div></section><div class="page-grid" style="margin-top:16px"><section class="panel"><div class="panel-head"><div><h2>Topic confidence now</h2><p>Current estimates based on your diagnostic answers</p></div></div><div class="topic-list">${rankedTopics().map(item=>topicRow(item.topic,item.score,item.level)).join('')}</div></section><aside class="panel"><div class="panel-head"><div><h2>Your saved attempts</h2><p>Use the next check to measure progress</p></div></div>${attempts.slice().reverse().map(a=>`<div class="exam-frequency"><span>${esc(a.label)} · ${fmtDate(a.date)}</span><b>${a.percent}%</b></div>`).join('')}</aside></div>`;
  }

  function render() {
    if (!loggedIn) { renderLogin(); return; }
    ensurePaperMap();
    const views = { overview: renderOverview, materials: renderMaterials, diagnosis: renderQuiz, report: renderReport, plan: renderPlan, ask: renderChat, progress: renderProgress };
    document.getElementById('app').innerHTML = shell((views[currentView] || renderOverview)());
  }
  async function loadAIStatus() {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      if (!response.ok) return;
      const status = await response.json();
      aiStatus = { configured: Boolean(status.configured), provider: status.provider || 'Local retrieval', model: status.model || null };
      if (aiStatus.configured) state.paperMapSignature = '';
      render();
    } catch (_) {
      // Opening index.html directly stays supported as a local-only demo.
    }
  }

  async function extractPdf(file) {
    if (!window.pdfjsLib) throw new Error('PDF reading needs a connection to load the document reader. Save this file as TXT or MD to upload it offline.');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
      if (text) pages.push(`# Page ${n}\n${text}`);
    }
    return pages.join('\n\n');
  }
  async function handleUpload(file, kind) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { notify('Please choose a file smaller than 10 MB.'); return; }
    try {
      const text = file.name.toLowerCase().endsWith('.pdf') ? await extractPdf(file) : await file.text();
      if (!text.trim()) { notify('No readable text found in that file.'); return; }
      if (text.length > 900_000) { notify('That file has too much text for this local demo. Try a smaller section.'); return; }
      state.documents.push({ id: `upload-${Date.now()}`, name: file.name, kind, text, seeded: false });
      if (kind === 'syllabus') for (const topic of currentTopics()) if (!(topic in state.mastery)) state.mastery[topic] = 55;
      state.paperMapSignature = ''; state.planTasks = null; state.completedTasks = []; save(); render(); notify(`${file.name} added to your sources.`);
    } catch (error) { notify(error.message || 'Could not read that file.'); }
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-route], [data-action], [data-kind]');
    if (!target) return;
    if (target.dataset.route) { event.preventDefault(); route(target.dataset.route); return; }
    const action = target.dataset.action;
    if (action === 'menu') { mobileNavOpen = !mobileNavOpen; render(); }
    if (action === 'logout') { loggedIn = false; localStorage.removeItem(AUTH_KEY); render(); }
    if (action === 'upload') { activeUploadKind = target.dataset.kind || 'notes'; document.getElementById('file-input')?.click(); }
    if (action === 'start-quiz' || action === 'begin-quiz') beginQuiz();
    if (action === 'answer' && quizSession) { quizSession.answers[quizSession.index] = Number(target.dataset.index); render(); }
    if (action === 'quiz-back' && quizSession && quizSession.index > 0) { quizSession.index--; render(); }
    if (action === 'quiz-next' && quizSession) {
      if (quizSession.answers[quizSession.index] === null) return;
      if (quizSession.index + 1 < quizSession.questions.length) { quizSession.index++; render(); } else finishQuiz();
    }
    if (action === 'remove-doc') { state.documents = state.documents.filter(doc => doc.id !== target.dataset.id); state.paperMapSignature = ''; state.planTasks = null; save(); render(); notify('Source removed.'); }
    if (action === 'toggle-task') {
      const id = target.dataset.id;
      state.completedTasks = state.completedTasks.includes(id) ? state.completedTasks.filter(item => item !== id) : [...state.completedTasks, id]; save(); render();
    }
    if (action === 'suggest-chat') answerChat(target.dataset.text);
  });
  document.addEventListener('change', event => {
    if (event.target.id === 'file-input') handleUpload(event.target.files?.[0], activeUploadKind);
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'login-form') {
      event.preventDefault();
      const form = new FormData(event.target); const email = String(form.get('email')).trim().toLowerCase(); const password = String(form.get('password'));
      if (email !== 'demo@student.com' || password !== 'study123') { renderLogin('Use the demo credentials shown below to continue.'); return; }
      loggedIn = true; localStorage.setItem(AUTH_KEY, 'yes'); localStorage.setItem('gapfinder-profile', JSON.stringify({ name: 'Maya Chen', email })); render();
    }
    if (event.target.id === 'plan-settings') {
      event.preventDefault(); const form = new FormData(event.target); const days = Math.max(1, Math.min(60, Number(form.get('days')) || 5)); const hours = Math.max(1, Math.min(12, Number(form.get('hours')) || 2));
      state.planDays = days; state.hoursPerDay = hours; state.planTasks = null; state.completedTasks = []; save(); render(); notify('Your revision plan is refreshed.');
    }
    if (event.target.id === 'chat-form') { event.preventDefault(); const form = new FormData(event.target); const query = String(form.get('message') || '').trim(); if (query) answerChat(query); }
  });
  render();
  loadAIStatus();
})();
