import { generateAiText } from '../services/aiService.js';
import {
  classifyByKeyword,
  createComplaint,
  getComplaintStatuses,
  getDashboardData,
  normalizeRoutingResult,
} from '../services/complaintService.js';

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function buildImprovedComplaintFallback(text) {
  const locationMatch = text.match(/\b(?:near|at|in|on|around)\s+([a-z0-9 ,.-]+)/i);
  const location = locationMatch?.[1]?.trim() || 'Not clearly specified';

  return [
    'Subject: Civic grievance requiring prompt attention',
    '',
    `Issue: ${text}`,
    `Location: ${location}`,
    'Request: Kindly inspect the issue and take necessary action at the earliest.',
  ].join('\n');
}

function parseRoutingResponse(aiResult) {
  try {
    const parsed = JSON.parse(aiResult);
    if (parsed && typeof parsed === 'object') {
      return normalizeRoutingResult(parsed);
    }
  } catch {
    // Fall back to line parsing below.
  }

  const categoryMatch = aiResult.match(/category\s*:\s*(.+)/i);
  const departmentMatch = aiResult.match(/department\s*:\s*(.+)/i);

  return normalizeRoutingResult({
    category: categoryMatch?.[1]?.trim(),
    department: departmentMatch?.[1]?.trim(),
  });
}

export async function improveComplaint(req, res) {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return badRequest(res, 'Complaint text is required.');
    }

    const fallback = buildImprovedComplaintFallback(text);
    const improved = await generateAiText(
      [
        'Rewrite the following civic complaint in a formal, citizen-friendly format.',
        'Return plain text with exactly these fields in order:',
        'Subject:',
        'Issue:',
        'Location:',
        'Request:',
        `Complaint: ${text}`,
      ].join('\n'),
      fallback,
    );

    return res.json({
      original_text: text,
      improved_text: improved,
    });
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
      return res.json(normalizeRoutingResult(keywordMatch));
    }

    const fallback = JSON.stringify(normalizeRoutingResult(null));
    const aiResult = await generateAiText(
      [
        'Classify this civic complaint into the most suitable category and department.',
        'Respond only as JSON with keys "category" and "department".',
        `Complaint: ${text}`,
      ].join('\n'),
      fallback,
    );

    return res.json(parseRoutingResponse(aiResult));
  } catch (error) {
    console.error('classifyComplaint failed', error);
    return res.status(500).json({ error: 'Failed to classify complaint.' });
  }
}

export async function buildEvidence(req, res) {
  try {
    const voiceText = typeof req.body?.voiceText === 'string' ? req.body.voiceText.trim() : '';
    const complaintText = typeof req.body?.complaintText === 'string' ? req.body.complaintText.trim() : '';
    const imageFile = req.file;

    const evidenceParts = [];
    let imageSummary = '';
    if (voiceText) {
      evidenceParts.push(`Voice transcript: ${voiceText}`);
    }

    if (imageFile?.originalname) {
      const imageFallback = `Image evidence attached showing complaint context (${imageFile.originalname}).`;
      imageSummary = await generateAiText(
        [
          'Generate one short line describing the likely evidence attached to a civic complaint image.',
          'Keep it factual and under 20 words.',
          complaintText ? `Complaint context: ${complaintText}` : '',
          `Image filename: ${imageFile.originalname}`,
        ]
          .filter(Boolean)
          .join('\n'),
        imageFallback,
      );
      evidenceParts.push(imageSummary);
    }

    if (evidenceParts.length === 0) {
      evidenceParts.push('No additional evidence provided.');
    }

    return res.json({
      evidence_text: `Evidence Section:\n- ${evidenceParts.join('\n- ')}`,
      voice_text: voiceText,
      image_summary: imageSummary,
    });
  } catch (error) {
    console.error('buildEvidence failed', error);
    return res.status(500).json({ error: 'Failed to build evidence text.' });
  }
}

export async function createComplaintRecord(req, res) {
  try {
    const originalText = typeof req.body?.text_original === 'string' ? req.body.text_original.trim() : '';
    const improvedText = typeof req.body?.text_improved === 'string' ? req.body.text_improved.trim() : '';
    const evidenceText = typeof req.body?.evidence_text === 'string' ? req.body.evidence_text.trim() : '';
    const complaintTextForRouting = improvedText || originalText;
    const derivedRouting = normalizeRoutingResult(classifyByKeyword(complaintTextForRouting));

    const payload = {
      text_original: originalText,
      text_improved: improvedText,
      category: typeof req.body?.category === 'string' && req.body.category.trim() ? req.body.category.trim() : derivedRouting.category,
      department:
        typeof req.body?.department === 'string' && req.body.department.trim()
          ? req.body.department.trim()
          : derivedRouting.department,
      evidence_text: evidenceText,
      status: typeof req.body?.status === 'string' ? req.body.status : 'pending',
      latitude: req.body?.latitude ? Number(req.body.latitude) : null,
      longitude: req.body?.longitude ? Number(req.body.longitude) : null,
    };

    if (!payload.text_original) {
      return badRequest(res, 'Original complaint text is required.');
    }

    if (payload.text_improved && evidenceText && !payload.text_improved.includes('Evidence Section:')) {
      payload.text_improved = `${payload.text_improved}\n\n${evidenceText}`;
    }

    const created = await createComplaint(payload);
    return res.status(201).json({
      id: created.id,
      status: payload.status,
      category: payload.category,
      department: payload.department,
    });
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
