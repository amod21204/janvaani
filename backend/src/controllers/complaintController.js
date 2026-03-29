import { generateAiText } from '../services/aiService.js';
import {
  classifyByKeyword,
  createComplaint,
  getComplaintStatuses,
  getDashboardData,
} from '../services/complaintService.js';

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

export async function improveComplaint(req, res) {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return badRequest(res, 'Complaint text is required.');
    }

    const fallback = `Formal civic complaint:\nIssue: ${text}\nLocation: [Please specify location]\nRequest: Kindly resolve this issue at the earliest.`;
    const improved = await generateAiText(
      `Convert this into a formal civic complaint with clear issue, location, and request. Complaint: ${text}`,
      fallback,
    );

    return res.json({ original_text: text, improved_text: improved });
  } catch (error) {
    console.error('improveComplaint failed', error);
    return res.status(500).json({ error: 'Failed to improve complaint.' });
  }
}

export async function classifyComplaint(req, res) {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return badRequest(res, 'Complaint text is required.');
    }

    const keywordMatch = classifyByKeyword(text);
    if (keywordMatch) {
      return res.json(keywordMatch);
    }

    const fallback = 'category: civic\ndepartment: Municipal Corporation';
    const aiResult = await generateAiText(
      `Classify this complaint into a government department. Return only two lines: category: <value>, department: <value>. Complaint: ${text}`,
      fallback,
    );

    const categoryMatch = aiResult.match(/category\s*:\s*(.+)/i);
    const departmentMatch = aiResult.match(/department\s*:\s*(.+)/i);

    return res.json({
      category: categoryMatch?.[1]?.trim() || 'civic',
      department: departmentMatch?.[1]?.trim() || 'Municipal Corporation',
    });
  } catch (error) {
    console.error('classifyComplaint failed', error);
    return res.status(500).json({ error: 'Failed to classify complaint.' });
  }
}

export async function buildEvidence(req, res) {
  try {
    const voiceText = typeof req.body?.voiceText === 'string' ? req.body.voiceText.trim() : '';
    const imageFile = req.file;

    const evidenceParts = [];
    if (voiceText) {
      evidenceParts.push(`Voice note: ${voiceText}`);
    }

    if (imageFile?.originalname) {
      const imageFallback = `Attached image evidence showing issue context (${imageFile.originalname}).`;
      const imageSummary = await generateAiText(
        `Generate one short evidence line for a civic complaint image file named: ${imageFile.originalname}`,
        imageFallback,
      );
      evidenceParts.push(imageSummary);
    }

    if (evidenceParts.length === 0) {
      evidenceParts.push('No additional evidence provided.');
    }

    return res.json({ evidence_text: `Evidence: ${evidenceParts.join(' | ')}` });
  } catch (error) {
    console.error('buildEvidence failed', error);
    return res.status(500).json({ error: 'Failed to build evidence text.' });
  }
}

export async function createComplaintRecord(req, res) {
  try {
    const payload = {
      text_original: typeof req.body?.text_original === 'string' ? req.body.text_original : '',
      text_improved: typeof req.body?.text_improved === 'string' ? req.body.text_improved : '',
      category: typeof req.body?.category === 'string' ? req.body.category : '',
      department: typeof req.body?.department === 'string' ? req.body.department : '',
      evidence_text: typeof req.body?.evidence_text === 'string' ? req.body.evidence_text : '',
      status: typeof req.body?.status === 'string' ? req.body.status : 'pending',
      latitude: req.body?.latitude ? Number(req.body.latitude) : null,
      longitude: req.body?.longitude ? Number(req.body.longitude) : null,
    };

    if (!payload.text_original) {
      return badRequest(res, 'Original complaint text is required.');
    }

    const created = await createComplaint(payload);
    return res.status(201).json({ id: created.id, status: payload.status });
  } catch (error) {
    console.error('createComplaintRecord failed', error);
    return res.status(500).json({ error: 'Failed to store complaint.' });
  }
}

export async function getComplaintStatusList(_req, res) {
  try {
    const complaints = await getComplaintStatuses();
    return res.json({ complaints });
  } catch (error) {
    console.error('getComplaintStatusList failed', error);
    return res.status(500).json({ error: 'Failed to fetch complaint statuses.' });
  }
}

export async function getDashboard(_req, res) {
  try {
    const data = await getDashboardData();
    return res.json(data);
  } catch (error) {
    console.error('getDashboard failed', error);
    return res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
}
