const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbFilePath = path.join(dbDir, 'shg_app.json');

// Default initial state
const defaultState = {
  employees: [],
  shgs: [],
  members: [],
  photos: [],
  audit_logs: [],
  counters: {
    employeeIdCounter: 1,
    shgIdCounter: 1,
    memberIdCounter: 1,
    photoIdCounter: 1,
    auditIdCounter: 1,
    reportSequence: 100 // Starts report at SERD-GRT-YYYY-000101
  }
};

class JSONDatabase {
  constructor() {
    this.data = this.load();
    this.initSeeds();
  }

  load() {
    if (fs.existsSync(dbFilePath)) {
      try {
        const raw = fs.readFileSync(dbFilePath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Error loading db file, initializing default:', err);
        return { ...defaultState };
      }
    }
    return { ...defaultState };
  }

  save() {
    try {
      const tempPath = `${dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, dbFilePath);
    } catch (err) {
      console.error('Error saving db file:', err);
    }
  }

  initSeeds() {
    if (!this.data.employees || this.data.employees.length === 0) {
      this.data.employees = [];
      const salt = bcrypt.genSaltSync(10);
      const adminPass = bcrypt.hashSync('admin123', salt);
      const fieldPass = bcrypt.hashSync('field123', salt);

      this.data.employees.push(
        {
          id: 1,
          employee_id: 'ADMIN001',
          name: 'System Administrator',
          email: 'admin@serdfoundation.org',
          phone: '9876543210',
          password_hash: adminPass,
          role: 'admin',
          branch: 'SERD Central Operations',
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          employee_id: 'EMP001',
          name: 'Ramesh Kumar',
          email: 'ramesh.k@serdfoundation.org',
          phone: '9876543211',
          password_hash: fieldPass,
          role: 'employee',
          branch: 'Mandya Rural Branch',
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          employee_id: 'EMP002',
          name: 'Priya Sharma',
          email: 'priya.s@serdfoundation.org',
          phone: '9876543212',
          password_hash: fieldPass,
          role: 'employee',
          branch: 'Mysuru North Branch',
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 4,
          employee_id: 'EMP003',
          name: 'Anil Deshmukh',
          email: 'anil.d@serdfoundation.org',
          phone: '9876543213',
          password_hash: fieldPass,
          role: 'employee',
          branch: 'Dharwad Central Branch',
          status: 'active',
          created_at: new Date().toISOString()
        }
      );
      this.data.counters.employeeIdCounter = 5;
      this.save();
      console.log('✅ Seeded default Admin and Field Officers for SERD FOUNDATION.');
    }
  }

  // --- Employees ---
  getEmployeeById(id) {
    return this.data.employees.find(e => e.id === Number(id));
  }

  getEmployeeByEmpId(empId) {
    if (!empId) return null;
    return this.data.employees.find(e => e.employee_id.toUpperCase() === empId.trim().toUpperCase());
  }

  getAllEmployees() {
    return this.data.employees.map(e => {
      const { password_hash, ...rest } = e;
      return rest;
    });
  }

  createEmployee({ employee_id, name, email, phone, password, role = 'employee', branch = '' }) {
    const existing = this.getEmployeeByEmpId(employee_id);
    if (existing) {
      throw new Error(`Employee ID '${employee_id}' already exists.`);
    }
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const id = this.data.counters.employeeIdCounter++;
    const newEmp = {
      id,
      employee_id: employee_id.trim().toUpperCase(),
      name: name.trim(),
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : '',
      password_hash,
      role,
      branch: branch ? branch.trim() : '',
      status: 'active',
      created_at: new Date().toISOString()
    };
    this.data.employees.push(newEmp);
    this.save();
    const { password_hash: _, ...safeEmp } = newEmp;
    return safeEmp;
  }

  updateEmployee(id, updateData) {
    const empIndex = this.data.employees.findIndex(e => e.id === Number(id));
    if (empIndex === -1) throw new Error('Employee not found');

    const emp = this.data.employees[empIndex];
    if (updateData.name) emp.name = updateData.name.trim();
    if (updateData.email !== undefined) emp.email = updateData.email.trim();
    if (updateData.phone !== undefined) emp.phone = updateData.phone.trim();
    if (updateData.branch !== undefined) emp.branch = updateData.branch.trim();
    if (updateData.role) emp.role = updateData.role;
    if (updateData.status) emp.status = updateData.status;
    if (updateData.password) {
      const salt = bcrypt.genSaltSync(10);
      emp.password_hash = bcrypt.hashSync(updateData.password, salt);
    }
    this.save();
    const { password_hash, ...safeEmp } = emp;
    return safeEmp;
  }

  // --- SHGs ---
  generateReportId() {
    const year = new Date().getFullYear();
    const seq = ++this.data.counters.reportSequence;
    const paddedSeq = String(seq).padStart(6, '0');
    return `SERD-GRT-${year}-${paddedSeq}`;
  }

  getSHGById(id) {
    const shg = this.data.shgs.find(s => s.id === Number(id));
    if (!shg) return null;
    const members = this.data.members.filter(m => m.shg_id === shg.id).sort((a, b) => a.member_number - b.member_number);
    const photos = this.data.photos.filter(p => p.shg_id === shg.id);
    return {
      ...shg,
      members,
      photos
    };
  }

  getSHGByReportId(reportId) {
    const shg = this.data.shgs.find(s => s.report_id === reportId);
    if (!shg) return null;
    return this.getSHGById(shg.id);
  }

  getAllSHGs(filters = {}) {
    let result = [...this.data.shgs];

    if (filters.employee_id && filters.role !== 'admin') {
      result = result.filter(s => s.employee_id.toUpperCase() === filters.employee_id.toUpperCase());
    }

    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }

    if (filters.village) {
      result = result.filter(s => s.village && s.village.toLowerCase().includes(filters.village.toLowerCase()));
    }

    if (filters.branch) {
      result = result.filter(s => s.branch_name && s.branch_name.toLowerCase().includes(filters.branch.toLowerCase()));
    }

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(s => 
        (s.shg_name && s.shg_name.toLowerCase().includes(q)) ||
        (s.report_id && s.report_id.toLowerCase().includes(q)) ||
        (s.village && s.village.toLowerCase().includes(q)) ||
        (s.branch_name && s.branch_name.toLowerCase().includes(q)) ||
        (s.employee_name && s.employee_name.toLowerCase().includes(q))
      );
    }

    if (filters.dateFilter) {
      const now = new Date();
      if (filters.dateFilter === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        result = result.filter(s => (s.submitted_at || s.created_at).startsWith(todayStr));
      } else if (filters.dateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        result = result.filter(s => new Date(s.submitted_at || s.created_at) >= weekAgo);
      } else if (filters.dateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        result = result.filter(s => new Date(s.submitted_at || s.created_at) >= monthAgo);
      }
    }

    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(s => {
        const d = new Date(s.submitted_at || s.created_at);
        return d >= start && d <= end;
      });
    }

    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return result.map(s => {
      const members = this.data.members.filter(m => m.shg_id === s.id);
      const photos = this.data.photos.filter(p => p.shg_id === s.id);
      return {
        ...s,
        memberCount: members.length,
        photoCount: photos.length
      };
    });
  }

  createSHG(shgData, members = [], photos = []) {
    const id = this.data.counters.shgIdCounter++;
    const isSubmitted = shgData.status === 'submitted';
    const report_id = isSubmitted ? (shgData.report_id || this.generateReportId()) : null;

    const newShg = {
      id,
      report_id,
      shg_name: shgData.shg_name || 'Untitled Group',
      shg_code: shgData.shg_code || '',
      village: shgData.village || '',
      panchayat: shgData.panchayat || '',
      taluk: shgData.taluk || '',
      district: shgData.district || '',
      state: shgData.state || 'Karnataka',
      branch_name: shgData.branch_name || '',
      branch_code: shgData.branch_code || '',
      loan_amount: Number(shgData.loan_amount) || 0,
      loan_account_number: shgData.loan_account_number || '',
      num_members: Number(shgData.num_members) || 10,
      meeting_date: shgData.meeting_date || new Date().toISOString().split('T')[0],
      remarks: shgData.remarks || '',
      employee_id: shgData.employee_id,
      employee_name: shgData.employee_name || '',
      status: shgData.status || 'draft',
      submitted_at: isSubmitted ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.data.shgs.push(newShg);

    if (Array.isArray(members)) {
      members.forEach((m, idx) => {
        const memberId = this.data.counters.memberIdCounter++;
        this.data.members.push({
          id: memberId,
          shg_id: id,
          member_number: m.member_number || (idx + 1),
          member_name: m.member_name || '',
          member_id: m.member_id || '',
          loan_amount: Number(m.loan_amount) || 0,
          mobile_number: m.mobile_number || '',
          photo_id: m.photo_id || null
        });
      });
    }

    if (Array.isArray(photos)) {
      photos.forEach(p => {
        const photoId = this.data.counters.photoIdCounter++;
        this.data.photos.push({
          id: photoId,
          shg_id: id,
          member_number: p.member_number || null,
          photo_type: p.photo_type || (p.member_number ? 'MEMBER' : 'GROUP'),
          original_image_url: p.original_image_url || '',
          stamped_image_url: p.stamped_image_url || '',
          latitude: p.latitude || null,
          longitude: p.longitude || null,
          gps_accuracy: p.gps_accuracy || null,
          address: p.address || '',
          captured_at: p.captured_at || new Date().toISOString(),
          employee_id: shgData.employee_id,
          uploaded_at: new Date().toISOString()
        });
      });
    }

    this.save();
    return this.getSHGById(id);
  }

  updateSHG(id, shgData, members = null, photos = null) {
    const shgIndex = this.data.shgs.findIndex(s => s.id === Number(id));
    if (shgIndex === -1) throw new Error('GRT record not found');

    const shg = this.data.shgs[shgIndex];
    
    if (shgData.status === 'submitted' && shg.status !== 'submitted') {
      shg.report_id = shg.report_id || this.generateReportId();
      shg.submitted_at = new Date().toISOString();
    }

    Object.assign(shg, {
      ...shgData,
      id: shg.id,
      report_id: shg.report_id,
      updated_at: new Date().toISOString()
    });

    if (Array.isArray(members)) {
      this.data.members = this.data.members.filter(m => m.shg_id !== shg.id);
      members.forEach((m, idx) => {
        const memberId = this.data.counters.memberIdCounter++;
        this.data.members.push({
          id: memberId,
          shg_id: shg.id,
          member_number: m.member_number || (idx + 1),
          member_name: m.member_name || '',
          member_id: m.member_id || '',
          loan_amount: Number(m.loan_amount) || 0,
          mobile_number: m.mobile_number || '',
          photo_id: m.photo_id || null
        });
      });
    }

    if (Array.isArray(photos)) {
      this.data.photos = this.data.photos.filter(p => p.shg_id !== shg.id);
      photos.forEach(p => {
        const photoId = this.data.counters.photoIdCounter++;
        this.data.photos.push({
          id: photoId,
          shg_id: shg.id,
          member_number: p.member_number || null,
          photo_type: p.photo_type || (p.member_number ? 'MEMBER' : 'GROUP'),
          original_image_url: p.original_image_url || '',
          stamped_image_url: p.stamped_image_url || '',
          latitude: p.latitude || null,
          longitude: p.longitude || null,
          gps_accuracy: p.gps_accuracy || null,
          address: p.address || '',
          captured_at: p.captured_at || new Date().toISOString(),
          employee_id: shg.employee_id,
          uploaded_at: new Date().toISOString()
        });
      });
    }

    this.save();
    return this.getSHGById(shg.id);
  }

  deleteSHG(id) {
    const shgId = Number(id);
    this.data.shgs = this.data.shgs.filter(s => s.id !== shgId);
    this.data.members = this.data.members.filter(m => m.shg_id !== shgId);
    this.data.photos = this.data.photos.filter(p => p.shg_id !== shgId);
    this.save();
    return true;
  }

  // --- Audit Logs ---
  logAudit({ employee_id, employee_name, action, record_id, details, ip_address }) {
    const id = this.data.counters.auditIdCounter++;
    const logEntry = {
      id,
      employee_id: employee_id || 'SYSTEM',
      employee_name: employee_name || '',
      action,
      record_id: record_id || '',
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      ip_address: ip_address || '',
      created_at: new Date().toISOString()
    };
    this.data.audit_logs.unshift(logEntry);
    if (this.data.audit_logs.length > 1000) {
      this.data.audit_logs.pop();
    }
    this.save();
    return logEntry;
  }

  getAuditLogs(limit = 100) {
    return this.data.audit_logs.slice(0, limit);
  }

  // --- Summary Statistics ---
  getDashboardStats(employee_id = null, role = null) {
    let shgs = this.data.shgs;
    if (role !== 'admin' && employee_id) {
      shgs = shgs.filter(s => s.employee_id.toUpperCase() === employee_id.toUpperCase());
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const totalSHGs = shgs.length;
    const drafts = shgs.filter(s => s.status === 'draft').length;
    const submitted = shgs.filter(s => s.status === 'submitted').length;
    const reportsToday = shgs.filter(s => s.status === 'submitted' && s.submitted_at && s.submitted_at.startsWith(todayStr)).length;
    
    const totalMembers = this.data.members.length;
    const totalPhotos = this.data.photos.length;
    const activeEmployees = this.data.employees.filter(e => e.status === 'active').length;

    return {
      totalSHGs,
      drafts,
      submitted,
      reportsToday,
      totalMembers,
      totalPhotos,
      activeEmployees
    };
  }
}

const dbInstance = new JSONDatabase();
module.exports = dbInstance;
