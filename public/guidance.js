const queryInput = document.getElementById('queryInput');
const guidanceButton = document.getElementById('guidanceButton');
const translateHindiButton = document.getElementById('translateHindiButton');
const downloadButton = document.getElementById('downloadButton');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('errorBox');
const originalOutput = document.getElementById('originalOutput');
const documentsOutput = document.getElementById('documentsOutput');
const stepsOutput = document.getElementById('stepsOutput');
const whereToGoOutput = document.getElementById('whereToGoOutput');
const tipsOutput = document.getElementById('tipsOutput');
const translatedHindiCard = document.getElementById('translatedHindiCard');
const translatedHindiOutput = document.getElementById('translatedHindiOutput');

let latestGuidance = null;
let latestHindiTranslation = '';

function setLoading(isLoading) {
  loading.classList.toggle('hidden', !isLoading);
  loading.classList.toggle('flex', isLoading);
  guidanceButton.disabled = isLoading;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}

function renderList(element, items, ordered = false) {
  element.innerHTML = '';

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'flex gap-3';

    const marker = document.createElement('span');
    marker.className = 'mt-0.5 shrink-0 font-semibold text-orange-600';
    marker.textContent = ordered ? `${index + 1}.` : '•';

    const text = document.createElement('span');
    text.textContent = item;

    li.append(marker, text);
    element.appendChild(li);
  });
}

function buildHindiPrompt() {
  if (!latestGuidance) {
    return '';
  }

  return [
    `Original Query: ${latestGuidance.query}`,
    '',
    'Documents Required:',
    ...latestGuidance.documents_required.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Steps to Follow:',
    ...latestGuidance.steps.map((item, index) => `${index + 1}. ${item}`),
    '',
    `Where to Go: ${latestGuidance.where_to_go}`,
    '',
    'Tips / Notes:',
    ...latestGuidance.tips.map((item, index) => `${index + 1}. ${item}`),
  ].join('\n');
}

function buildPdfText() {
  if (!latestGuidance) {
    return '';
  }

  const sections = [
    `Original Query:\n${latestGuidance.query}`,
    `Documents Required:\n${latestGuidance.documents_required.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
    `Steps to Follow:\n${latestGuidance.steps.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
    `Where to Go:\n${latestGuidance.where_to_go}`,
    `Tips / Notes:\n${latestGuidance.tips.map((item, index) => `${index + 1}. ${item}`).join('\n')}`,
  ];

  if (latestHindiTranslation) {
    sections.push(`Hindi Translation:\n${latestHindiTranslation}`);
  }

  return sections.join('\n\n');
}

async function getGuidance() {
  clearError();
  latestGuidance = null;
  latestHindiTranslation = '';
  translatedHindiOutput.textContent = '';
  translatedHindiCard.classList.add('hidden');
  downloadButton.disabled = true;
  translateHindiButton.disabled = true;

  const query = queryInput.value.trim();
  if (!query) {
    showError('Please describe your problem before requesting guidance.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/get-guidance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query}),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch guidance.');
    }

    latestGuidance = data;
    originalOutput.textContent = data.query || '';
    whereToGoOutput.textContent = data.where_to_go || '';
    renderList(documentsOutput, Array.isArray(data.documents_required) ? data.documents_required : []);
    renderList(stepsOutput, Array.isArray(data.steps) ? data.steps : [], true);
    renderList(tipsOutput, Array.isArray(data.tips) ? data.tips : []);
    downloadButton.disabled = false;
    translateHindiButton.disabled = false;
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to fetch guidance.');
  } finally {
    setLoading(false);
  }
}

async function translateToHindi() {
  clearError();

  if (!latestGuidance) {
    showError('Please generate guidance first.');
    return;
  }

  translateHindiButton.disabled = true;

  try {
    const response = await fetch('/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `Translate the following civic guidance into simple Hindi while preserving the headings and bullet order.\n\n${buildHindiPrompt()}`,
        language: 'en',
        targetLanguage: 'hi',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to translate guidance.');
    }

    latestHindiTranslation = data.formatted || data.translated || '';
    translatedHindiOutput.textContent = latestHindiTranslation;
    translatedHindiCard.classList.toggle('hidden', !latestHindiTranslation);
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to translate guidance.');
  } finally {
    translateHindiButton.disabled = false;
  }
}

function downloadPdf() {
  if (!latestGuidance) {
    return;
  }

  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(buildPdfText(), 170);

  pdf.setFontSize(16);
  pdf.text('JanVaani Civic Guidance', 20, 20);
  pdf.setFontSize(11);
  pdf.text(lines, 20, 32);
  pdf.save('janvaani-civic-guidance.pdf');
}

guidanceButton.addEventListener('click', getGuidance);
translateHindiButton.addEventListener('click', translateToHindi);
downloadButton.addEventListener('click', downloadPdf);
