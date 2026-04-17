require('dotenv').config();
const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const fse      = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const cors     = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const puppeteer = require('puppeteer');

const app  = express();
const PORT = process.env.PORT || 3000;

// Gemini — lazy factory so key can be swapped at runtime
let _apiKey = process.env.GEMINI_API_KEY || '';
const getGenAI = () => new GoogleGenerativeAI(_apiKey);

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

fse.ensureDirSync(path.join(__dirname, 'uploads'));
fse.ensureDirSync(path.join(__dirname, 'generated'));

// ─── Multer — accept up to 10 files ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ok  = ['.pdf', '.txt', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    ok.includes(ext) ? cb(null, true) : cb(new Error('Only PDF, TXT, DOC, DOCX allowed'));
  }
});

// ─── Text Extractor ──────────────────────────────────────────────────────────
async function extractText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  if (ext === '.pdf') {
    const buf  = fs.readFileSync(filePath);
    const data = await pdfParse(buf);
    return data.text || '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// ─── Master Prompt — UNIVERSAL (any subject, any document) ──────────────────
function buildPrompt({ subject, topics, docText }) {
  const topicLine = topics
    ? `FOCUS TOPICS (mandatory — prioritise these above all else): ${topics}`
    : 'FOCUS: Cover ALL topics found in the document.';

  return `You are an expert teacher, examiner, and paper setter with decades of experience designing board-level examinations across ALL subjects — Mathematics, Physics, Chemistry, Biology, History, Geography, Economics, Law, Literature, Computer Science, and any other field.

SUBJECT: ${subject ? subject : 'Auto-detect from the document content — state it clearly at the top of your output'}
${topicLine}

════════════════════ DOCUMENT CONTENT ════════════════════
${docText}
══════════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU MUST DO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — READ EVERYTHING:
  • Read every line of the provided document carefully.
  • Extract every concept, fact, definition, formula, theorem, example, and existing question/exercise.

STEP 2 — EXTRACT ALL EXISTING QUESTIONS VERBATIM:
  • If the document already contains questions, exercises, or problems — copy ALL of them exactly as written.
  • Then generate SIMILAR, TWISTED, and ADVANCED variants of each one.

STEP 3 — GENERATE MAXIMUM NEW QUESTIONS:
  • From every concept, fact, and idea in the document — generate as many additional questions as possible.
  • Cover all 4 difficulty levels: Easy · Medium · Hard · Advanced (Toughest).
  • DO NOT STOP EARLY. Squeeze every possible question from the material.
  • Text/theory documents → comprehension, reasoning, analytical, comparison, and application questions.
  • Numerical/formula documents → computation, derivation, proof, and problem-solving questions.

STEP 4 — COMPLETE ANSWERS FOR EVERY QUESTION:
  • Write a FULL, DETAILED answer immediately after all questions (in the Solutions section).
  • Theory/explanation → full structured paragraphs covering all key points.
  • Numerical/calculation → Given: → Formula: → Step-by-step → Final Answer.
  • MCQs → correct option + 1–2 line reason WHY.
  • NEVER skip, truncate, or say "...".

⭐ TAGGING:
  • Highly important → ⭐ IMPORTANT
  • Most likely to appear in exam → ⭐⭐ MOST EXPECTED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — follow EXACTLY, no deviation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

════════════════════════════════════════════════════════
                    EXAMINATION PAPER
    Subject: ${subject || '[detected from document]'}
    Date: ${new Date().toDateString()}
    Time: 3 Hours         Maximum Marks: As Per Questions
════════════════════════════════════════════════════════

General Instructions:
1. All questions are compulsory unless stated otherwise.
2. Read each question carefully before answering.
3. Questions marked ⭐⭐ MOST EXPECTED are high-yield for exams.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION A: MULTIPLE CHOICE QUESTIONS (MCQs)    [1 mark each]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generate the MAXIMUM number of MCQs possible (minimum 20, no upper limit).
Each question MUST have exactly 4 options labelled (A) (B) (C) (D).

Q1. [question text]  [⭐ tag if applicable]
    (A) ...  (B) ...  (C) ...  (D) ...

[Write ALL MCQs here — do not stop early]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION B: FILL IN THE BLANKS                  [1 mark each]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Minimum 15. Based on key terms, facts, definitions, and formulas.
Q1. ___________ is defined as ...

[Write ALL fill-in-the-blank questions here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION C: TRUE / FALSE                        [1 mark each]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Minimum 10. Include tricky, conceptual, and commonly confused statements.
Q1. [statement]

[Write ALL T/F questions here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION D: VERY SHORT ANSWER (VSA)             [1 mark each]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Minimum 10. One-line definitions, direct recall, simple one-step computations.
Q1. [question]

[Write ALL VSA questions here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION E: SHORT ANSWER (SA)                   [2 marks each]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Minimum 15. Explanation-based or moderate computation questions (3–6 steps/sentences).
Include original, similar, and twisted variants.

[Write ALL SA questions here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION F: LONG ANSWER (LA)                    [5 marks each]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Minimum 8. Detailed analytical, proof, essay, or problem-solving questions.
Include verbatim questions from the document + similar + twisted + 1 advanced ⭐⭐ MOST EXPECTED.

[Write ALL LA questions here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION G: CASE-BASED / APPLICATION QUESTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Minimum 2–3 real-world scenarios. Each with 3–4 sub-questions.

[Write ALL case-based questions here]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    ★ END OF QUESTION PAPER ★
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

══════════════════════════════════════════════════════════
             COMPLETE SOLUTIONS — BOARD STYLE
══════════════════════════════════════════════════════════

Write a FULL, DETAILED solution for EVERY question above. Do not skip any question.

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION A — SOLUTIONS (MCQs)
━━━━━━━━━━━━━━━━━━━━━━━━━
Q1. Answer: (X)
    Reason: [clear 1–2 line explanation of why this is correct]
Q2. Answer: (X)
    Reason: ...
[Write answers for ALL MCQs — no skipping]

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION B — SOLUTIONS (Fill in the Blanks)
━━━━━━━━━━━━━━━━━━━━━━━━━
Q1. Answer: [exact word/phrase]
Q2. Answer: ...
[Write all answers]

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION C — SOLUTIONS (True / False)
━━━━━━━━━━━━━━━━━━━━━━━━━
Q1. [True / False] — Reason: [clear explanation]
Q2. ...
[Write all answers]

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION D — SOLUTIONS (VSA)
━━━━━━━━━━━━━━━━━━━━━━━━━
Q1. [Complete answer]
Q2. ...
[Write all answers]

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION E — SOLUTIONS (Short Answer)
━━━━━━━━━━━━━━━━━━━━━━━━━
Q1.
  Answer: [Full explanation — 3 to 6 sentences/steps covering all key points]
Q2.
  Answer: ...
[Write ALL answers in full]

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION F — SOLUTIONS (Long Answer)
━━━━━━━━━━━━━━━━━━━━━━━━━
Q1.
  Given: [if applicable]
  To Find / To Prove / To Explain: [objective]
  Solution:
    Step 1: [detailed]
    Step 2: [detailed]
    Step 3: [detailed]
    Step 4: [detailed]
    Step 5: [detailed]
  Final Answer / Conclusion: [clear, complete statement]
Q2.
  [same format]
[Write ALL answers in full]

━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION G — SOLUTIONS (Case-Based)
━━━━━━━━━━━━━━━━━━━━━━━━━
[Complete solutions for every sub-part of every case — no skipping]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              ★ END OF SOLUTIONS ★
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ABSOLUTE RULES — NEVER BREAK:
1. Work with ANY document type — Maths, Science, History, Law, Biology, Economics, Literature, CS, etc.
2. NEVER skip a question or its solution.
3. NEVER write "...", "similar to above", "and so on" — write everything completely.
4. NEVER generate questions not based on the provided document.
5. Extract ALL pre-existing questions from the document verbatim first.
6. ALL solutions must be complete, in board-exam style, and easy to understand.
7. Generate the MAXIMUM possible number of questions from the material.
\`;
}

// ─── Generate HTML for PDF export ───────────────────────────────────────────
function generateHTML(content, subject) {
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const formatted = escaped
    .replace(/^(SECTION [A-G]:?.+)$/gm, '<h2 class="section-header">$1</h2>')
    .replace(/^(━+)$/gm, '<hr class="section-divider"/>')
    .replace(/^(═+)$/gm, '<hr class="major-divider"/>')
    .replace(/⭐⭐ MOST EXPECTED/g, '<span class="tag most-expected">⭐⭐ MOST EXPECTED</span>')
    .replace(/⭐ IMPORTANT/g, '<span class="tag important">⭐ IMPORTANT</span>')
    .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
    .replace(/\\n/g, '<br/>');

  return \`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>\${subject || 'Examination'} Paper</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Times New Roman',Times,serif; font-size:13px; line-height:1.9; color:#000; background:#fff; padding:30px 40px; }
  .paper-header { text-align:center; border:3px double #000; padding:16px; margin-bottom:24px; }
  .paper-header h1 { font-size:18px; font-weight:bold; }
  .paper-header .sub { font-size:14px; margin:4px 0; }
  .section-header { background:#111; color:#fff; padding:8px 14px; margin:24px 0 10px; font-size:13px; letter-spacing:1px; }
  .section-divider { border:1px solid #000; margin:8px 0; }
  .major-divider { border:2px solid #000; margin:14px 0; }
  .tag { display:inline-block; padding:1px 6px; border-radius:3px; font-size:11px; font-weight:bold; }
  .important { background:#fff3cd; border:1px solid #ffc107; color:#856404; }
  .most-expected { background:#d4edda; border:1px solid #28a745; color:#155724; }
  @media print { body { padding:15mm 20mm; } .section-header { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
  <div class="paper-header">
    <h1>EXAMINATION PAPER</h1>
    <div class="sub">Subject: \${subject || 'As detected'} &nbsp;|&nbsp; \${new Date().toDateString()}</div>
    <div class="sub">Time: 3 Hours &nbsp;&nbsp; Maximum Marks: As Per Questions</div>
  </div>
  <div>\${formatted}</div>
</body>
</html>\`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Dynamic API key setter
app.post('/api/set-key', (req, res) => {
  const { key } = req.body;
  if (key && key.trim().length > 10) _apiKey = key.trim();
  res.json({ ok: true });
});

// ─── Main Generate ────────────────────────────────────────────────────────────
app.post('/api/generate', upload.array('documents', 10), async (req, res) => {
  const uploadedPaths = [];
  try {
    const { subject, topics } = req.body;
    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({ error: 'Please upload at least one document.' });
    }

    // Extract text from every file and combine
    const allParts = [];
    for (const f of files) {
      uploadedPaths.push(f.path);
      let text = '';
      try { text = await extractText(f.path, f.originalname); }
      catch (e) { console.warn(\`Could not parse \${f.originalname}:\`, e.message); }
      if (text.trim()) {
        allParts.push(\`[File: \${f.originalname}]\\n\${text.trim()}\`);
      }
    }

    if (!allParts.length) {
      return res.status(400).json({ error: 'Documents appear empty or unreadable. Please use text-based PDFs.' });
    }

    // Token budget ~30,000 chars total
    const docText = allParts.join('\\n\\n---\\n\\n').substring(0, 30000);

    // ── SSE setup ──
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const send = (type, data) => res.write(\`data: \${JSON.stringify({ type, data })}\\n\\n\`);

    send('status', \`Read \${files.length} file(s). Analyzing content...\`);

    if (!_apiKey) {
      send('error', 'Gemini API key not set. Please enter your API key in the form.');
      res.write('data: [DONE]\\n\\n');
      res.end();
      return;
    }

    const model = getGenAI().getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
    });

    const prompt = buildPrompt({ subject, topics, docText });

    send('status', 'Generating full exam paper + solutions — this takes 1–3 minutes...');

    const result = await model.generateContentStream(prompt);

    let fullText = '';
    for await (const chunk of result.stream) {
      const t = chunk.text();
      fullText += t;
      send('chunk', t);
    }

    const sessionId = uuidv4();
    fs.writeFileSync(path.join(__dirname, 'generated', \`\${sessionId}.txt\`), fullText, 'utf-8');

    send('complete', { sessionId, message: 'Paper generated successfully!' });
    res.write('data: [DONE]\\n\\n');
    res.end();

  } catch (err) {
    console.error('Generate error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(\`data: \${JSON.stringify({ type: 'error', data: err.message })}\\n\\n\`);
      res.end();
    }
  } finally {
    for (const p of uploadedPaths) {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
    }
  }
});

// ─── PDF Download ─────────────────────────────────────────────────────────────
app.post('/api/download-pdf', async (req, res) => {
  try {
    const { content, subject } = req.body;
    if (!content) return res.status(400).json({ error: 'No content provided' });

    const html = generateHTML(content, subject);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', \`attachment; filename="\${subject || 'Exam'}_Paper.pdf"\`);
    res.send(Buffer.from(pdfBuf));
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'PDF generation failed: ' + err.message });
  }
});

// ─── TXT Download ─────────────────────────────────────────────────────────────
app.get('/api/download-txt/:id', (req, res) => {
  const fp = path.join(__dirname, 'generated', \`\${req.params.id}.txt\`);
  if (!fs.existsSync(fp)) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="exam_paper.txt"');
  res.sendFile(fp);
});

// ─── Frontend fallback ────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(\`\\n🚀 AI Paper Setter → http://localhost:\${PORT}\\n\`);
});