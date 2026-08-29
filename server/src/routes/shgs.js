const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { saveBase64Image } = require('../utils/photoStorage');

// GET /api/shgs/stats - Dashboard metrics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const stats = db.getDashboardStats(req.user.employee_id, req.user.role);
    res.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to compute dashboard stats' });
  }
});

// GET /api/shgs - List SHGs with filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const filters = {
      employee_id: req.user.employee_id,
      role: req.user.role,
      status: req.query.status,
      village: req.query.village,
      branch: req.query.branch,
      search: req.query.search,
      dateFilter: req.query.dateFilter,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const shgs = db.getAllSHGs(filters);
    res.json(shgs);
  } catch (error) {
    console.error('Fetch SHGs error:', error);
    res.status(500).json({ error: 'Failed to retrieve SHG records' });
  }
});

// GET /api/shgs/:id - Get full SHG details
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const shg = db.getSHGById(req.params.id);
    if (!shg) {
      return res.status(404).json({ error: 'SHG documentation record not found' });
    }

    // Role security check: employees can only view their own SHGs unless admin
    if (req.user.role !== 'admin' && shg.employee_id.toUpperCase() !== req.user.employee_id.toUpperCase()) {
      return res.status(403).json({ error: 'Unauthorized to access this SHG record' });
    }

    res.json(shg);
  } catch (error) {
    console.error('Get SHG error:', error);
    res.status(500).json({ error: 'Failed to fetch SHG record details' });
  }
});

// Helper function to process photos and save base64 to disk files
function processPhotos(photos, employee_id) {
  if (!Array.isArray(photos)) return [];
  
  return photos.map(p => {
    let stamped_image_url = p.stamped_image_url;
    let original_image_url = p.original_image_url;

    if (stamped_image_url && stamped_image_url.startsWith('data:image')) {
      const prefix = p.photo_type === 'GROUP' ? 'stamped_group' : `stamped_m${p.member_number || 0}`;
      stamped_image_url = saveBase64Image(stamped_image_url, prefix) || stamped_image_url;
    }

    if (original_image_url && original_image_url.startsWith('data:image')) {
      const prefix = p.photo_type === 'GROUP' ? 'orig_group' : `orig_m${p.member_number || 0}`;
      original_image_url = saveBase64Image(original_image_url, prefix) || original_image_url;
    }

    return {
      ...p,
      stamped_image_url,
      original_image_url: original_image_url || stamped_image_url,
      employee_id: employee_id || p.employee_id
    };
  });
}

// POST /api/shgs - Create a new SHG record
router.post('/', authenticateToken, (req, res) => {
  try {
    const { shgData, members, photos } = req.body;

    if (!shgData || !shgData.shg_name) {
      return res.status(400).json({ error: 'SHG Name is required' });
    }

    // Attach creator employee information
    const enrichedShgData = {
      ...shgData,
      employee_id: req.user.employee_id,
      employee_name: req.user.name,
      branch_name: shgData.branch_name || req.user.branch
    };

    const processedPhotos = processPhotos(photos, req.user.employee_id);
    const createdSHG = db.createSHG(enrichedShgData, members || [], processedPhotos);

    db.logAudit({
      employee_id: req.user.employee_id,
      employee_name: req.user.name,
      action: createdSHG.status === 'submitted' ? 'SHG_SUBMITTED' : 'SHG_DRAFT_CREATED',
      record_id: createdSHG.report_id || `ID-${createdSHG.id}`,
      details: `Created SHG "${createdSHG.shg_name}" with status ${createdSHG.status}`
    });

    res.status(201).json(createdSHG);
  } catch (error) {
    console.error('Create SHG error:', error);
    res.status(500).json({ error: error.message || 'Failed to create SHG documentation' });
  }
});

// PUT /api/shgs/:id - Update existing SHG record
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const existing = db.getSHGById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'SHG record not found' });
    }

    // Role check: field employees cannot edit already submitted reports unless admin
    if (existing.status === 'submitted' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Submitted reports are finalized and locked for editing.' });
    }

    if (req.user.role !== 'admin' && existing.employee_id.toUpperCase() !== req.user.employee_id.toUpperCase()) {
      return res.status(403).json({ error: 'Unauthorized to modify this SHG record' });
    }

    const { shgData, members, photos } = req.body;
    const processedPhotos = photos ? processPhotos(photos, req.user.employee_id) : null;

    const updated = db.updateSHG(req.params.id, shgData, members, processedPhotos);

    db.logAudit({
      employee_id: req.user.employee_id,
      employee_name: req.user.name,
      action: updated.status === 'submitted' && existing.status !== 'submitted' ? 'SHG_SUBMITTED' : 'SHG_UPDATED',
      record_id: updated.report_id || `ID-${updated.id}`,
      details: `Updated SHG "${updated.shg_name}" (Status: ${updated.status})`
    });

    res.json(updated);
  } catch (error) {
    console.error('Update SHG error:', error);
    res.status(500).json({ error: error.message || 'Failed to update SHG documentation' });
  }
});

// POST /api/shgs/:id/submit - Finalize submission of a draft
router.post('/:id/submit', authenticateToken, (req, res) => {
  try {
    const existing = db.getSHGById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'SHG record not found' });
    }

    if (existing.status === 'submitted') {
      return res.json(existing);
    }

    // Validation checks
    if (!existing.shg_name) {
      return res.status(400).json({ error: 'SHG Name is mandatory' });
    }

    const members = existing.members || [];
    if (members.length < 10) {
      return res.status(400).json({ error: `All 10 member records are required (Currently: ${members.length}/10)` });
    }

    const memberPhotos = (existing.photos || []).filter(p => p.photo_type === 'MEMBER');
    if (memberPhotos.length < 10) {
      return res.status(400).json({ error: `All 10 member photographs are required with GPS (Currently: ${memberPhotos.length}/10)` });
    }

    const groupPhoto = (existing.photos || []).find(p => p.photo_type === 'GROUP');
    if (!groupPhoto) {
      return res.status(400).json({ error: 'Group photograph with GPS is mandatory before submission.' });
    }

    const updated = db.updateSHG(existing.id, {
      status: 'submitted',
      submitted_at: new Date().toISOString()
    });

    db.logAudit({
      employee_id: req.user.employee_id,
      employee_name: req.user.name,
      action: 'SHG_SUBMITTED',
      record_id: updated.report_id,
      details: `Submitted complete SHG documentation for "${updated.shg_name}" with Report ID ${updated.report_id}`
    });

    res.json(updated);
  } catch (error) {
    console.error('Submit SHG error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit SHG record' });
  }
});

// DELETE /api/shgs/:id - Delete draft
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const existing = db.getSHGById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'SHG record not found' });
    }

    if (existing.status === 'submitted' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Submitted reports cannot be deleted by field employees.' });
    }

    db.deleteSHG(req.params.id);

    db.logAudit({
      employee_id: req.user.employee_id,
      employee_name: req.user.name,
      action: 'SHG_DELETED',
      record_id: existing.report_id || `ID-${existing.id}`,
      details: `Deleted SHG record "${existing.shg_name}"`
    });

    res.json({ message: 'SHG record deleted successfully' });
  } catch (error) {
    console.error('Delete SHG error:', error);
    res.status(500).json({ error: 'Failed to delete SHG record' });
  }
});

// POST /api/shgs/sync-batch - Offline batch sync endpoint
router.post('/sync-batch', authenticateToken, (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for synchronization' });
    }

    const syncedResults = [];
    for (const item of items) {
      const { shgData, members, photos, localId } = item;
      const enrichedShgData = {
        ...shgData,
        employee_id: req.user.employee_id,
        employee_name: req.user.name,
        branch_name: shgData.branch_name || req.user.branch
      };

      const processedPhotos = processPhotos(photos, req.user.employee_id);
      
      let saved;
      if (item.server_id) {
        saved = db.updateSHG(item.server_id, enrichedShgData, members, processedPhotos);
      } else {
        saved = db.createSHG(enrichedShgData, members, processedPhotos);
      }

      syncedResults.push({
        localId,
        server_id: saved.id,
        report_id: saved.report_id,
        status: saved.status
      });

      db.logAudit({
        employee_id: req.user.employee_id,
        employee_name: req.user.name,
        action: 'OFFLINE_SYNC',
        record_id: saved.report_id || `ID-${saved.id}`,
        details: `Synced offline SHG "${saved.shg_name}" (Status: ${saved.status})`
      });
    }

    res.json({
      message: `Successfully synchronized ${syncedResults.length} records`,
      results: syncedResults
    });
  } catch (error) {
    console.error('Sync batch error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete batch synchronization' });
  }
});

module.exports = router;
