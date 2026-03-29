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

function requireUser(req, res) {
  if (!req.user?.email) {
    res.status(401).json({ error: 'Login required.' });
    return null;
  }

  return req.user;
}

function buildImprovedComplaintFallback(text) {
  const locationMatch = text.match(/\b(?:near|at|in|on|around)\s+([a-z0-9 ,.-]+)/i);
  const location = locationMatch?.[1]?.trim() || 'Not clearly specified';

  return [
    'Subject: Civic issue requiring attention',
    `Issue: ${text}`,
    `Location: ${location}`,
    'Request: Kindly inspect the issue and resolve it at the earliest.',
  ].join('\n');
}

function parseRoutingResponse(aiResult) {
  try {
    const parsed = JSON.parse(aiResult);
    if (parsed && typeof parsed === 'object') {
      return normalizeRoutingResult(parsed);
    }
  } catch {
    // Fall back to text parsing below.
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
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      return badRequest(res, 'Complaint text is required.');
    }

    const fallback = buildImprovedComplaintFallback(text);
    const improved = await generateAiText(
      [
        'Rewrite the civic complaint in a formal, concise, professional tone.',
        'Return plain text with these labels only:',
        'Subject:',
        'Issue:',
        'Location:',
        'Request:',
        `Complaint: ${text}`,
      ].join('\n'),
      fallback,
    );

    return res.json({ improved_text: improved });
  } catch (error) {
    console.error('improveComplaint failed', error);
    return res.status(500).json({ error: 'Failed to improve complaint.' });
  }
}

export async function classifyComplaint(req, res) {
  try {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

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
        'Classify this complaint and identify the correct civic department.',
        'Return only JSON with keys "category" and "department".',
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
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

    const voiceText = typeof req.body?.voiceText === 'string' ? req.body.voiceText.trim() : '';
    const complaintText = typeof req.body?.complaintText === 'string' ? req.body.complaintText.trim() : '';
    const imageFile = req.file;

    const evidenceParts = [];
    if (voiceText) {
      evidenceParts.push(`Voice transcript: ${voiceText}`);
    }

    if (imageFile?.originalname) {
      const imageFallback = `Image evidence attached showing issue context (${imageFile.originalname}).`;
      const imageSummary = await generateAiText(
        [
          'Write one short evidence line for an uploaded complaint image.',
          'Keep it factual and under 20 words.',
          complaintText ? `Complaint: ${complaintText}` : '',
          `Filename: ${imageFile.originalname}`,
        ]
          .filter(Boolean)
          .join('\n'),
        imageFallback,
      );
      evidenceParts.push(imageSummary);
    }

    if (evidenceParts.length === 0) {
      evidenceParts.push('No additional evidence attached.');
    }

    return res.json({
      evidence_text: `Evidence Section:\n- ${evidenceParts.join('\n- ')}`,
    });
  } catch (error) {
    console.error('buildEvidence failed', error);
    return res.status(500).json({ error: 'Failed to build evidence text.' });
  }
}

export async function createComplaintRecord(req, res) {
  try {
    const user = requireUser(req, res);
    if (!user) {
      return;
    }

    const originalText = typeof req.body?.text_original === 'string' ? req.body.text_original.trim() : '';
    const improvedText = typeof req.body?.text_improved === 'string' ? req.body.text_improved.trim() : '';
    const evidenceText = typeof req.body?.evidence_text === 'string' ? req.body.evidence_text.trim() : '';
    const routing = normalizeRoutingResult(
      classifyByKeyword(improvedText || originalText) || {
        category: typeof req.body?.category === 'string' ? req.body.category.trim() : '',
        department: typeof req.body?.department === 'string' ? req.body.department.trim() : '',
      },
    );

    const payload = {
      user_name: user.name || 'Citizen',
      user_email: user.email,
      text_original: originalText,
      text_improved: improvedText,
      category: routing.category,
      department: routing.department,
      evidence_text: evidenceText,
      status: 'pending',
      latitude: null,
      longitude: null,
    };

    if (!payload.text_original) {
      return badRequest(res, 'Original complaint text is required.');
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
    const user = requireUser(_req, res);
    if (!user) {
      return;
    }

    const complaints = await getComplaintStatuses(user.email);
    return res.json({ complaints });
  } catch (error) {
    console.error('getComplaintStatusList failed', error);
    return res.status(500).json({ error: 'Failed to fetch complaint statuses.' });
  }
}

export async function getDashboard(_req, res) {
  try {
    const user = requireUser(_req, res);
    if (!user) {
      return;
    }

    const data = await getDashboardData(user.email);
    return res.json(data);
  } catch (error) {
    console.error('getDashboard failed', error);
    return res.status(500).json({ error: 'Failed to load dashboard data.' });
  }
}
