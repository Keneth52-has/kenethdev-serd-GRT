const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { employee_id, password } = req.body;

    if (!employee_id || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required' });
    }

    const employee = db.getEmployeeByEmpId(employee_id);

    if (!employee) {
      return res.status(401).json({ error: 'Invalid Employee ID or password' });
    }

    if (employee.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact your supervisor.' });
    }

    const isMatch = bcrypt.compareSync(password, employee.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid Employee ID or password' });
    }

    const payload = {
      id: employee.id,
      employee_id: employee.employee_id,
      name: employee.name,
      role: employee.role,
      branch: employee.branch
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    db.logAudit({
      employee_id: employee.employee_id,
      employee_name: employee.name,
      action: 'USER_LOGIN',
      record_id: employee.employee_id,
      details: `Successful login to portal`,
      ip_address: req.ip || '127.0.0.1'
    });

    res.json({
      token,
      user: {
        id: employee.id,
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        branch: employee.branch,
        login_time: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const employee = db.getEmployeeById(req.user.id);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  const { password_hash, ...safeEmp } = employee;
  res.json(safeEmp);
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, phone, email, currentPassword, newPassword } = req.body;
    const employee = db.getEmployeeById(req.user.id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const isMatch = bcrypt.compareSync(currentPassword, employee.password_hash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password does not match' });
      }
      updateData.password = newPassword;
    }

    const updated = db.updateEmployee(req.user.id, updateData);
    db.logAudit({
      employee_id: employee.employee_id,
      employee_name: employee.name,
      action: 'PROFILE_UPDATE',
      record_id: employee.employee_id,
      details: 'Updated profile information'
    });

    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
