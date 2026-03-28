const complaintText = document.getElementById('complaintText');
const language = document.getElementById('language');
const generateButton = document.getElementById('generateButton');
const downloadButton = document.getElementById('downloadButton');
const loading = document.getElementById('loading');
const errorBox = document.getElementById('errorBox');
const originalOutput = document.getElementById('originalOutput');
const translatedOutput = document.getElementById('translatedOutput');
const formattedOutput = document.getElementById('formattedOutput');

let latestFormattedComplaint = '';

function setLoading(isLoading) {
  loading.classList.toggle('hidden', !isLoading);
  loading.classList.toggle('flex', isLoading);
  generateButton.disabled = isLoading;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}

async function generateComplaint() {
  clearError();
  latestFormattedComplaint = '';
  downloadButton.disabled = true;

  const text = complaintText.value.trim();
  const selectedLanguage = language.value;

  if (!text) {
    showError('Please enter a complaint before generating.');
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language: selectedLanguage,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate complaint.');
    }

    originalOutput.value = data.original || '';
    translatedOutput.value = data.translated || '';
    formattedOutput.textContent = data.formatted || '';
    latestFormattedComplaint = data.formatted || '';
    downloadButton.disabled = !latestFormattedComplaint;
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to generate complaint.');
  } finally {
    setLoading(false);
  }
}

function downloadPdf() {
  if (!latestFormattedComplaint) {
    return;
  }

  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF();
  const lines = pdf.splitTextToSize(latestFormattedComplaint, 170);

  pdf.setFontSize(16);
  pdf.text('Formal Legal Complaint', 20, 20);
  pdf.setFontSize(12);
  pdf.text(lines, 20, 35);
  pdf.save('janvaani-complaint.pdf');
}

generateButton.addEventListener('click', generateComplaint);
downloadButton.addEventListener('click', downloadPdf);
