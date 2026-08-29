const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require JWT and Admin role
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/employees - List all employees
router.get('/employees', (req, res) => {
  try {
    const employees = db.getAllEmployees();
    res.json(employees);
  } catch (error) {
    console.error('Admin employees error:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// POST /api/admin/employees - Create a new employee
router.post('/employees', (req, res) => {
  try {
    const { employee_id, name, email, phone, password, role, branch } = req.body;

    if (!employee_id || !name || !password) {
      return res.status(400).json({ error: 'Employee ID, Name, and Password are required' });
    }

    const created = db.createEmployee({
      employee_id,
      name,
      email,
      phone,
      password,
      role: role || 'employee',
      branch: branch || ''
    });

    db.logAudit({
      employee_id: req.user.employee_id,
      employee_name: req.user.name,
      action: 'ADMIN_CREATE_EMPLOYEE',
      record_id: created.employee_id,
      details: `Created new ${created.role} account for ${created.name} (${created.employee_id})`
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/admin/employees/:id - Update employee
router.put('/employees/:id', (req, res) => {
  try {
    const { name, email, phone, role, branch, status, password } = req.body;
    const updated = db.updateEmployee(req.params.id, {
      name,
      email,
      phone,
      role,
      branch,
      status,
      password
    });

    db.logAudit({
      employee_id: req.user.employee_id,
      employee_name: req.user.name,
      action: 'ADMIN_UPDATE_EMPLOYEE',
      record_id: updated.employee_id,
      details: `Updated employee ${updated.name} (${updated.employee_id})`
    });

    res.json(updated);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET /api/admin/audit-logs - View system audit trail
router.get('/audit-logs', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 200;
    const logs = db.getAuditLogs(limit);
    res.json(logs);
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/admin/export/excel - Export SHG report data to Excel (.xlsx)
router.get('/export/excel', async (req, res) => {
  try {
    const shgs = db.getAllSHGs(req.query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SHG Loan Documentation Portal';
    workbook.created = new Date();

    // Sheet 1: SHG Summary
    const shgSheet = workbook.addWorksheet('SHG Reports');
    shgSheet.columns = [
      { header: 'Report ID', key: 'report_id', width: 22 },
      { header: 'SHG Name', key: 'shg_name', width: 25 },
      { header: 'SHG Code', key: 'shg_code', width: 16 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Village', key: 'village', width: 18 },
      { header: 'Gram Panchayat', key: 'panchayat', width: 18 },
      { header: 'Taluk', key: 'taluk', width: 16 },
      { header: 'District', key: 'district', width: 16 },
      { header: 'State', key: 'state', width: 14 },
      { header: 'Branch Name', key: 'branch_name', width: 22 },
      { header: 'Branch Code', key: 'branch_code', width: 14 },
      { header: 'Loan Amount (₹)', key: 'loan_amount', width: 16 },
      { header: 'Loan A/C Number', key: 'loan_account_number', width: 20 },
      { header: 'No. of Members', key: 'num_members', width: 16 },
      { header: 'Meeting Date', key: 'meeting_date', width: 15 },
      { header: 'Employee Name', key: 'employee_name', width: 20 },
      { header: 'Employee ID', key: 'employee_id', width: 16 },
      { header: 'Submitted At', key: 'submitted_at', width: 22 },
      { header: 'Created At', key: 'created_at', width: 22 },
      { header: 'Remarks', key: 'remarks', width: 30 },
    ];

    // Style Header Row
    shgSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    shgSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF166534' }
    };

    shgs.forEach(s => {
      shgSheet.addRow({
        report_id: s.report_id || `DRAFT-${s.id}`,
        shg_name: s.shg_name,
        shg_code: s.shg_code,
        status: s.status ? s.status.toUpperCase() : 'DRAFT',
        village: s.village,
        panchayat: s.panchayat,
        taluk: s.taluk,
        district: s.district,
        state: s.state,
        branch_name: s.branch_name,
        branch_code: s.branch_code,
        loan_amount: s.loan_amount,
        loan_account_number: s.loan_account_number,
        num_members: s.num_members,
        meeting_date: s.meeting_date,
        employee_name: s.employee_name,
        employee_id: s.employee_id,
        submitted_at: s.submitted_at || '',
        created_at: s.created_at || '',
        remarks: s.remarks
      });
    });

    // Sheet 2: Member Details & GPS
    const memberSheet = workbook.addWorksheet('Member & GPS Details');
    memberSheet.columns = [
      { header: 'Report ID', key: 'report_id', width: 22 },
      { header: 'SHG Name', key: 'shg_name', width: 25 },
      { header: 'Member #', key: 'member_number', width: 12 },
      { header: 'Member Name', key: 'member_name', width: 22 },
      { header: 'Member ID', key: 'member_id', width: 16 },
      { header: 'Loan Amount (₹)', key: 'loan_amount', width: 16 },
      { header: 'Mobile Number', key: 'mobile_number', width: 16 },
      { header: 'Photo Captured', key: 'has_photo', width: 15 },
      { header: 'Latitude', key: 'latitude', width: 16 },
      { header: 'Longitude', key: 'longitude', width: 16 },
      { header: 'GPS Accuracy (m)', key: 'accuracy', width: 16 },
      { header: 'Location / Address', key: 'address', width: 30 },
      { header: 'GPS Timestamp', key: 'timestamp', width: 22 }
    ];

    memberSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    memberSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };

    shgs.forEach(s => {
      const fullSHG = db.getSHGById(s.id);
      if (fullSHG && fullSHG.members) {
        fullSHG.members.forEach(m => {
          const photo = (fullSHG.photos || []).find(p => p.photo_type === 'MEMBER' && p.member_number === m.member_number);
          memberSheet.addRow({
            report_id: fullSHG.report_id || `DRAFT-${fullSHG.id}`,
            shg_name: fullSHG.shg_name,
            member_number: m.member_number,
            member_name: m.member_name,
            member_id: m.member_id,
            loan_amount: m.loan_amount,
            mobile_number: m.mobile_number,
            has_photo: photo ? 'YES' : 'NO',
            latitude: photo ? photo.latitude : '',
            longitude: photo ? photo.longitude : '',
            accuracy: photo ? photo.gps_accuracy : '',
            address: photo ? photo.address : '',
            timestamp: photo ? photo.captured_at : ''
          });
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="SHG_Loan_Reports_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ error: 'Failed to generate Excel export' });
  }
});

// GET /api/admin/export/csv - Export CSV
router.get('/export/csv', (req, res) => {
  try {
    const shgs = db.getAllSHGs(req.query);

    const headers = [
      'Report ID',
      'SHG Name',
      'SHG Code',
      'Status',
      'Village',
      'Gram Panchayat',
      'Taluk',
      'District',
      'State',
      'Branch Name',
      'Branch Code',
      'Loan Amount',
      'Loan Account Number',
      'Number of Members',
      'Meeting Date',
      'Employee Name',
      'Employee ID',
      'Submitted At'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = shgs.map(s => [
      escapeCsv(s.report_id || `DRAFT-${s.id}`),
      escapeCsv(s.shg_name),
      escapeCsv(s.shg_code),
      escapeCsv(s.status),
      escapeCsv(s.village),
      escapeCsv(s.panchayat),
      escapeCsv(s.taluk),
      escapeCsv(s.district),
      escapeCsv(s.state),
      escapeCsv(s.branch_name),
      escapeCsv(s.branch_code),
      escapeCsv(s.loan_amount),
      escapeCsv(s.loan_account_number),
      escapeCsv(s.num_members),
      escapeCsv(s.meeting_date),
      escapeCsv(s.employee_name),
      escapeCsv(s.employee_id),
      escapeCsv(s.submitted_at || '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="SHG_Loan_Reports_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to generate CSV export' });
  }
});

module.exports = router;
